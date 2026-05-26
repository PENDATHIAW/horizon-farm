import { expect } from '@playwright/test';

export const USER_LOGIN = process.env.E2E_LOGIN;
export const USER_PASSWORD = process.env.E2E_PASSWORD;

export const BAD_UI_TEXTS = [
  'undefined',
  'null',
  'NaN',
  '[object Object]',
  'Cannot read properties',
  'TypeError',
  'ReferenceError',
  'SupabaseError',
  'PostgrestError',
  'Uh oh',
  'stack trace',
  'TODO',
  'WIP',
  'debug',
  'mock',
  'fallback schema',
  'related_id manquant',
  'colonne absente',
  'column does not exist',
];

export async function login(page) {
  if (!USER_LOGIN || !USER_PASSWORD) {
    throw new Error('E2E_LOGIN and E2E_PASSWORD environment variables are required.');
  }

  await page.goto('/');
  await expect(page.getByText(/Horizon Farm ERP/i)).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/Login/i).fill(USER_LOGIN);
  await page.getByLabel(/Mot de passe/i).fill(USER_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page.getByText(/Accueil/i).first()).toBeVisible({ timeout: 25_000 });
  await waitForAppReady(page);
}

export async function assertNoBadUiText(page, contextLabel) {
  const bodyText = await page.locator('body').innerText();
  const found = BAD_UI_TEXTS.filter((text) => {
    if (text === 'NaN') return /(^|[^\p{L}\p{N}_])NaN($|[^\p{L}\p{N}_])/u.test(bodyText);
    return bodyText.toLowerCase().includes(text.toLowerCase());
  });
  expect(found, `${contextLabel}: textes techniques visibles: ${found.join(', ')}`).toEqual([]);
}

export async function goToModule(page, label) {
  const item = page.getByText(label, { exact: false }).first();
  await expect(item, `Module introuvable: ${label}`).toBeVisible({ timeout: 15_000 });
  await item.click();
  await waitForAppReady(page);
  await assertNoBadUiText(page, `Module ${label}`);
}

export function collectRuntimeErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  return {
    assertClean() {
      expect(pageErrors, `Erreurs page detectees: ${pageErrors.join('\n')}`).toEqual([]);
      expect(consoleErrors, `Erreurs console detectees: ${consoleErrors.join('\n')}`).toEqual([]);
    },
  };
}

export async function closeTransientUi(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByRole('button', { name: /plus tard/i }).click({ timeout: 1_500 }).catch(() => {});
  const closeButtons = page.getByRole('button', { name: /fermer|annuler|close|×/i });
  const count = await closeButtons.count().catch(() => 0);
  if (count > 0) await closeButtons.first().click().catch(() => {});
}

export async function waitForAppReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByText(/Chargement du module/i).waitFor({ state: 'detached', timeout: 25_000 }).catch(() => {});
  await closeTransientUi(page);
  await page.waitForTimeout(400);
}
