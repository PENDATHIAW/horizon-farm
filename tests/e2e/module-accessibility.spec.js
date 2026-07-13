import { expect, test } from '@playwright/test';
import navigation from '../../src/i18n/fr/navigation.js';
import { MODULE_TAB_CONFIGS } from '../../src/config/moduleTabs/index.js';

const LOGIN = process.env.E2E_LOGIN || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const LOCAL_DEMO = process.env.E2E_LOCAL_DEMO === '1';

const MODULE_IDS = [
  'dashboard',
  'assistant_erp',
  'centre_decisionnel',
  'objectifs_croissance',
  'elevage',
  'cultures',
  'commercial',
  'achats_stock',
  'finance_pilotage',
  'activite_suivi',
  'documents_rapports',
  'equipe',
  'equipements',
  'gestion_systeme',
  'agri_feeds',
  'smartfarm',
  'financements',
];

const MODULE_LABELS = MODULE_IDS.map((id) => navigation.modules[id]);
const MODULE_TABS = Object.fromEntries(MODULE_IDS.map((id) => [
  navigation.modules[id],
  (MODULE_TAB_CONFIGS[id] || []).map((tab) => tab.label),
]).filter(([, tabs]) => tabs.length > 1));

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function closeTransientPanels(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const notificationLater = page.getByRole('button', { name: /Plus tard/i });
  if (await notificationLater.isVisible().catch(() => false)) {
    await notificationLater.click({ timeout: 2_000 }).catch(() => {});
  }
}

async function waitForModuleReady(page, { waitForNetwork = true } = {}) {
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
  if (waitForNetwork) await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.getByText(/Chargement du module/i).first().waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => {});
  await closeTransientPanels(page);
  await page.waitForTimeout(waitForNetwork ? 500 : 250);
}

async function login(page) {
  if (LOCAL_DEMO) {
    await page.addInitScript(() => {
      window.localStorage.setItem('horizon:modules-actifs', JSON.stringify({
        agri_feeds: true,
        smartfarm: true,
        financements: true,
        assistant_erp: true,
      }));
      window.localStorage.setItem('horizon_farm_data_mode_choice', 'simulated');
      window.localStorage.setItem('horizon_farm_show_simulated_data', '1');
      window.localStorage.setItem('horizon_farm_show_demo_data', '1');
    });
    await page.goto('/?demo=1');
  } else {
    await page.goto('/');
    await expect(page.getByText(/Connexion/i)).toBeVisible({ timeout: 20_000 });
    await page.locator('#login').fill(LOGIN);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: /Se connecter/i }).click();
  }
  await expect(page.getByRole('navigation', { name: /Navigation principale/i })).toBeVisible({ timeout: 30_000 });
  await waitForModuleReady(page);
}

async function assertNoModuleError(page, label) {
  await expect(page.getByText(/ERREUR MODULE/i), `ErrorBoundary visible sur ${label}`).toHaveCount(0);
  await expect(page.getByText(/a rencontré une erreur/i), `Message erreur module visible sur ${label}`).toHaveCount(0);
}

async function openModule(page, label, waitOptions = {}) {
  const nav = page.getByRole('navigation', { name: /Navigation principale/i });
  const item = nav.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') });

  for (let attempt = 0; attempt < 8 && !(await item.isVisible().catch(() => false)); attempt += 1) {
    const collapsedSection = nav.locator('button[aria-expanded="false"]').first();
    if (await collapsedSection.count() === 0) break;
    await collapsedSection.click();
  }

  await expect(item, `Module introuvable: ${label}`).toBeVisible({ timeout: 15_000 });
  await item.click({ timeout: 5_000 });
  await waitForModuleReady(page, waitOptions);
  await assertNoModuleError(page, label);
}

test.describe('Modules Horizon Farm', () => {
  test.describe.configure({ timeout: 600_000 });
  test.setTimeout(600_000);

  test('ouvre chaque module principal sans ErrorBoundary visible', async ({ page }, testInfo) => {
    testInfo.setTimeout(300_000);
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Erreur module Horizon Farm|ReferenceError|TypeError/i.test(message.text())) {
        runtimeErrors.push(message.text());
      }
    });

    await login(page);

    for (const label of MODULE_LABELS) {
      await openModule(page, label, { waitForNetwork: false });
    }

    expect(runtimeErrors, `Erreurs runtime detectees:\n${runtimeErrors.join('\n')}`).toEqual([]);
  });

  test('ouvre les onglets critiques des modules sans ErrorBoundary visible', async ({ page }, testInfo) => {
    testInfo.setTimeout(600_000);
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Erreur module Horizon Farm|ReferenceError|TypeError/i.test(message.text())) {
        runtimeErrors.push(message.text());
      }
    });

    await login(page);

    for (const [moduleLabel, tabs] of Object.entries(MODULE_TABS)) {
      console.log(`[tabs] ${moduleLabel} (${tabs.length})`);
      await openModule(page, moduleLabel, { waitForNetwork: false });
      const main = page.locator('main');
      const moduleId = MODULE_IDS.find((id) => navigation.modules[id] === moduleLabel);
      const tablist = main.getByRole('tablist', { name: `Navigation ${moduleId}` });
      for (const tab of tabs) {
        await test.step(`${moduleLabel} / ${tab}`, async () => {
          const tabControl = tablist.getByRole('tab', { name: new RegExp(`^${escapeRegExp(tab)}(\\b|\\s|$)`, 'i') }).first();
          await expect(tabControl, `Onglet introuvable: ${moduleLabel} / ${tab}`).toBeVisible({ timeout: 8_000 });
          await tabControl.click({ timeout: 3_000, noWaitAfter: true });
          await expect(tabControl, `Onglet inactif après clic: ${moduleLabel} / ${tab}`).toHaveAttribute('aria-selected', 'true', { timeout: 3_000 });
          await assertNoModuleError(page, `${moduleLabel} / ${tab}`);
        });
      }
    }

    expect(runtimeErrors, `Erreurs runtime detectees:\n${runtimeErrors.join('\n')}`).toEqual([]);
  });

  test('ouvre Commercial / Clients sans ErrorBoundary visible', async ({ page }, testInfo) => {
    testInfo.setTimeout(90_000);
    await login(page);
    await openModule(page, 'Commercial', { waitForNetwork: false });
    const tab = page.locator('main').getByRole('tab', { name: /^Clients(\b|\s|$)/i }).first();
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click({ timeout: 5_000 });
    await waitForModuleReady(page, { waitForNetwork: false });
    await assertNoModuleError(page, 'Commercial / Clients');
    await expect(page.locator('main')).toContainText(/clients|créances|creances/i, { timeout: 10_000 });
  });
});
