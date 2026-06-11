import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

test.describe('Assistant ERP — Horizon V2', () => {
  test.setTimeout(120_000);

  test('module chat premium agricole', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    await expect(page.getByRole('heading', { name: /^Horizon$/i })).toBeVisible();
    await expect(page.getByText(/Votre exploitation agricole/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Parlez à votre ferme/i)).toBeVisible();
    await expect(page.getByText(/Hey Horizon/i)).toHaveCount(0);
    await expect(page.getByText(/Actions rapides terrain/i)).toHaveCount(0);
    await expect(page.getByText(/Santé ERP/i)).toHaveCount(0);

    const textarea = page.getByPlaceholder(/Parlez à votre ferme/i);
    await textarea.fill('Créer une vente de 5 poulets');
    await page.getByRole('button', { name: /Envoyer/i }).click();
    await expect(page.getByText(/Résumé détecté|VALIDER|vente/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('question production redirige vers Élevage Cycles', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    const textarea = page.getByPlaceholder(/Parlez à votre ferme/i);
    await textarea.fill('Quand ajouter une nouvelle bande pondeuse ?');
    await page.getByRole('button', { name: /Envoyer/i }).click();

    await expect(page.getByRole('heading', { name: /^Élevage$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Questions production/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
