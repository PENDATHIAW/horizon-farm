import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

test.describe('Assistant ERP — Hey Horizon', () => {
  test.setTimeout(120_000);

  test('module, questions stratégiques et objectif du mois', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    await expect(page.getByRole('heading', { name: /Hey Horizon/i })).toBeVisible();
    await expect(page.getByText(/Questions rapides/i)).toBeVisible();
    await expect(page.getByText(/Priorités de gestion/i)).toBeVisible();

    const textarea = page.getByPlaceholder(/J'ai vendu|J’ai vendu/i);
    await textarea.fill('Quels clients me doivent de l\'argent ?');
    await page.getByRole('button', { name: /^Préparer$/i }).click();
    await expect(page.getByText(/Clients à relancer|créance|encaissement/i).first()).toBeVisible({ timeout: 15_000 });

    await textarea.fill('Où en suis-je sur mon objectif du mois ?');
    await page.getByRole('button', { name: /^Préparer$/i }).click();
    await expect(page.getByText(/Objectif du mois|Objectif période|Objectif annuel/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/%/i).first()).toBeVisible();
  });

  test('Accueil — suggestions Hey Horizon vers Assistant', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Accueil');

    const heyButton = page.getByRole('button', { name: /Hey Horizon/i }).first();
    if (await heyButton.isVisible().catch(() => false)) {
      await heyButton.click();
      await expect(page.getByRole('heading', { name: /Hey Horizon/i })).toBeVisible({ timeout: 15_000 });
    }

    const suggestion = page.getByRole('button', { name: /Objectif du mois/i }).first();
    if (await suggestion.isVisible().catch(() => false)) {
      await suggestion.click();
      await expect(page.getByText(/Objectif du mois|Objectif période|CA période/i).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
