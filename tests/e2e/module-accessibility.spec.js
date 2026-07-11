import { expect, test } from '@playwright/test';

const LOGIN = process.env.E2E_LOGIN || 'penda';
const PASSWORD = process.env.E2E_PASSWORD || 'Mariemediatta10#';

const MODULE_LABELS = [
  'Accueil',
  'Assistant ERP',
  'Centre décisionnel',
  'AGRI FEEDS',
  'Objectifs & Croissance',
  'Investisseurs & Forums',
  'Élevage',
  'Cultures',
  'Commercial',
  'Achats & Stock',
  'Finance & Pilotage',
  'Activité & Suivi',
  'Documents & Rapports',
  'Opérations & Ressources',
  'Smart Farm',
  'Activité & Sync ERP',
  'Gestion du système',
];

const MODULE_TABS = {
  'Centre décisionnel': ['Urgences & risques', 'Écarts & cohérence', 'Actions prioritaires', 'Croissance & opportunités'],
  'AGRI FEEDS': ['Tableau de bord', 'Référence Phase 1', 'Matières & fournisseurs', 'Formulations', 'Production', 'Tests & comparaison', 'Commercial', 'Qualité & reporting'],
  'Objectifs & Croissance': ['Suivi du Business Plan', 'Prévisionnel vs réel', 'Simulations', 'Capacité de remboursement'],
  Élevage: ['Lots & bandes', 'Pondeuses', 'Embouche bovine', 'Santé & biosécurité', 'Alimentation', 'Performances'],
  Cultures: ['Parcelles & campagnes', 'Irrigation', 'Récoltes', 'Économie circulaire', 'Marge parcelle'],
  Commercial: ['Ventes', 'Clients & créances', 'Livraisons', 'Factures', 'Marge commerciale'],
  'Achats & Stock': ['Inventaire', 'Réceptions & achats', 'Fournisseurs & dettes', 'Mouvements stock', 'Matières organiques'],
  'Finance & Pilotage': ['Résumé', 'Trésorerie', 'Créances & dettes', 'Coûts par filière', 'Financement', 'Écarts budget'],
  'Activité & Suivi': ['Tâches du jour', 'Alertes', 'Décisions', 'Registre d’actions', 'Traçabilité opérationnelle'],
  'Documents & Rapports': ['Documents', 'Justificatifs', 'Rapports financeur', 'Exports', 'Audit documentaire'],
  'Opérations & Ressources': ['Équipe', 'Responsabilités', 'Planning', 'Temps de travail', 'Incidents'],
  'Smart Farm': ['Capteurs', 'Eau', 'Énergie', 'Alertes techniques', 'Automatisation terrain'],
  'Activité & Sync ERP': ['Vérifications', 'Connexion & envoi', 'Journal d’activité', 'Données hors ligne'],
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function closeTransientPanels(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const assistantClose = page.locator('button[title="Fermer"]:visible');
  if (await assistantClose.count().catch(() => 0)) {
    await assistantClose.last().click().catch(() => {});
  }
  await page.getByRole('button', { name: /Plus tard/i }).click({ timeout: 1_000 }).catch(() => {});
}

async function waitForModuleReady(page, { waitForNetwork = true } = {}) {
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
  if (waitForNetwork) await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.getByText(/Chargement du module/i).waitFor({ state: 'detached', timeout: 25_000 }).catch(() => {});
  await closeTransientPanels(page);
  await page.waitForTimeout(waitForNetwork ? 500 : 250);
}

async function login(page) {
  await page.goto('/');
  await expect(page.getByText(/Connexion/i)).toBeVisible({ timeout: 20_000 });
  await page.locator('#login').fill(LOGIN);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
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
  await expect(item, `Module introuvable: ${label}`).toBeVisible({ timeout: 15_000 });
  await item.click({ timeout: 5_000 });
  await waitForModuleReady(page, waitOptions);
  await assertNoModuleError(page, label);
}

test.describe('Modules Horizon Farm', () => {
  test.describe.configure({ timeout: 300_000 });
  test.setTimeout(240_000);

  test('ouvre chaque module principal sans ErrorBoundary visible', async ({ page }) => {
    test.setTimeout(120_000);
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Erreur module Horizon Farm|ReferenceError|TypeError/i.test(message.text())) {
        runtimeErrors.push(message.text());
      }
    });

    await login(page);

    for (const label of MODULE_LABELS) {
      await openModule(page, label);
    }

    expect(runtimeErrors, `Erreurs runtime detectees:\n${runtimeErrors.join('\n')}`).toEqual([]);
  });

  test('ouvre les onglets critiques des modules sans ErrorBoundary visible', async ({ page }) => {
    test.setTimeout(300_000);
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Erreur module Horizon Farm|ReferenceError|TypeError/i.test(message.text())) {
        runtimeErrors.push(message.text());
      }
    });

    await login(page);

    for (const [moduleLabel, tabs] of Object.entries(MODULE_TABS)) {
      await openModule(page, moduleLabel, { waitForNetwork: false });
      const main = page.locator('main');
      for (const tab of tabs) {
        const button = main.getByRole('button', { name: new RegExp(`^${escapeRegExp(tab)}(\\b|\\s|$)`, 'i') }).first();
        await expect(button, `Onglet introuvable: ${moduleLabel} / ${tab}`).toBeVisible({ timeout: 15_000 });
        await button.click({ timeout: 5_000 });
        await waitForModuleReady(page, { waitForNetwork: false });
        await assertNoModuleError(page, `${moduleLabel} / ${tab}`);
      }
    }

    expect(runtimeErrors, `Erreurs runtime detectees:\n${runtimeErrors.join('\n')}`).toEqual([]);
  });

  test('ouvre Commercial / Clients & créances sans ErrorBoundary visible', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await openModule(page, 'Commercial', { waitForNetwork: false });
    const tab = page.locator('main').getByRole('button', { name: /^Clients & créances(\b|\s|$)/i }).first();
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click({ timeout: 5_000 });
    await waitForModuleReady(page, { waitForNetwork: false });
    await assertNoModuleError(page, 'Commercial / Clients & créances');
    await expect(page.locator('main')).toContainText(/clients|créances|creances/i, { timeout: 10_000 });
  });
});
