import { expect } from '@playwright/test';

export const USER_LOGIN = process.env.E2E_LOGIN;
export const USER_PASSWORD = process.env.E2E_PASSWORD;

export const BAD_UI_TEXTS = [
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
  await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 25_000 });
}

export async function assertNoBadUiText(page, contextLabel) {
  const bodyText = await page.locator('body').innerText();
  const found = BAD_UI_TEXTS.filter((text) => bodyText.toLowerCase().includes(text.toLowerCase()));
  expect(found, `${contextLabel}: textes techniques visibles: ${found.join(', ')}`).toEqual([]);
}

export async function goToModule(page, label) {
  const item = page.getByText(label, { exact: false }).first();
  await expect(item, `Module introuvable: ${label}`).toBeVisible({ timeout: 15_000 });
  await item.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
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
  const closeButtons = page.getByRole('button', { name: /fermer|annuler|close|×/i });
  const count = await closeButtons.count().catch(() => 0);
  if (count > 0) await closeButtons.first().click().catch(() => {});
}
