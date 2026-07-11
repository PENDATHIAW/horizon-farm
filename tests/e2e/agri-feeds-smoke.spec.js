import { expect, test } from '@playwright/test';
import { assertNoBadUiText, goToModule, login } from './helpers.js';

test.describe('AGRI FEEDS — smoke', () => {
  test.setTimeout(120_000);

  test('ouvre le module et ses onglets principaux', async ({ page }) => {
    await login(page);
    await goToModule(page, 'AGRI FEEDS');

    await expect(page.getByText(/Production d’aliments animaux pilotée par la donnée/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Référence Phase 1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Commercial/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Qualité & reporting/i })).toBeVisible();

    await page.getByRole('button', { name: /Commercial/i }).click();
    await expect(page.getByText(/Commercial AGRI FEEDS/i).first()).toBeVisible();
    await assertNoBadUiText(page, 'AGRI FEEDS Commercial');

    await page.getByRole('button', { name: /Qualité & reporting/i }).click();
    await expect(page.getByText(/Reporting financeur AGRI FEEDS/i).first()).toBeVisible();
    await expect(page.getByText(/Permissions sensibles/i).first()).toBeVisible();
    await assertNoBadUiText(page, 'AGRI FEEDS Qualité & reporting');
  });
});
