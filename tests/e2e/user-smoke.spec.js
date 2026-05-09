import { expect, test } from '@playwright/test';

const USER_LOGIN = process.env.E2E_LOGIN;
const USER_PASSWORD = process.env.E2E_PASSWORD;

const MODULE_LABELS = [
  'Dashboard',
  'Animaux',
  'Avicole',
  'Sante',
  'Finances',
  'Comptabilite',
  'Investissements',
  'Impact Business',
  'Stock',
  'Clients',
  'Ventes',
  'Fournisseurs',
  'Tracabilite',
  'Centre Alertes',
  'Cultures',
  'Documents',
  'Taches',
  'Rapports',
  'Equipements',
  'Smart Farm',
  'Audit Logs',
  'Sync Offline',
];

const BAD_UI_TEXTS = [
  'undefined',
  'NaN',
  '[object Object]',
  'Cannot read properties',
  'TypeError',
  'ReferenceError',
  'SupabaseError',
  'TODO',
  'WIP',
  'debug',
  'mock',
  'fallback schema',
  'related_id manquant',
];

async function login(page) {
  if (!USER_LOGIN || !USER_PASSWORD) {
    throw new Error('E2E_LOGIN and E2E_PASSWORD environment variables are required.');
  }

  await page.goto('/');
  await expect(page.getByText(/Horizon Farm ERP/i)).toBeVisible();
  await page.getByLabel(/Login/i).fill(USER_LOGIN);
  await page.getByLabel(/Mot de passe/i).fill(USER_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page.getByText(/Chargement Horizon Farm/i)).toBeHidden({ timeout: 20_000 }).catch(() => {});
  await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 20_000 });
}

async function assertNoBadUiText(page, contextLabel) {
  const bodyText = await page.locator('body').innerText();
  const found = BAD_UI_TEXTS.filter((text) => bodyText.toLowerCase().includes(text.toLowerCase()));
  expect(found, `${contextLabel}: textes techniques visibles: ${found.join(', ')}`).toEqual([]);
}

test.describe('Horizon Farm — parcours ami utilisateur', () => {
  test('connexion puis ouverture de chaque module sans erreur visible', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await login(page);
    await assertNoBadUiText(page, 'Apres connexion');

    for (const label of MODULE_LABELS) {
      const item = page.getByText(label, { exact: false }).first();
      if (!(await item.count())) continue;
      await item.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(800);
      await assertNoBadUiText(page, `Module ${label}`);
    }

    expect(pageErrors, `Erreurs page detectees: ${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Erreurs console detectees: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});
