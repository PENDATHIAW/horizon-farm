import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

test.describe('Assistant ERP — Horizon Chat Native V7', () => {
  test.setTimeout(120_000);

  test('module chat natif Horizon', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    await expect(page.getByText(/^Horizon$/).first()).toBeVisible();
    await expect(page.getByText(/Connecté à votre exploitation/i).first()).toBeVisible();
    await expect(page.getByText(/Bonjour/i)).toBeVisible();
    await expect(page.getByText(/De quoi voulez-vous qu.on parle/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Parlez à votre ferme/i)).toBeVisible();
    await expect(page.getByText(/Hey Horizon/i)).toHaveCount(0);
    await expect(page.getByText(/données ERP/i)).toHaveCount(0);
    await expect(page.getByText(/animaux • .*parcelles/i)).toHaveCount(0);

    const textarea = page.getByPlaceholder(/Parlez à votre ferme/i);
    await textarea.fill('Créer une vente de 5 poulets');
    await page.getByRole('button', { name: /Envoyer/i }).click();
    await expect(page.getByText(/je prépare|Confirmer|vente/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('comprend une question stock en langage naturel', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    const textarea = page.getByPlaceholder(/Parlez à votre ferme/i);
    await textarea.fill("qu'est-ce qu'il me reste en magasin ?");
    await page.getByRole('button', { name: /Envoyer/i }).click();
    await expect(page.getByText(/stock|magasin|produit|reste/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('question production répond avec un conseil calendrier', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    const textarea = page.getByPlaceholder(/Parlez à votre ferme/i);
    await textarea.fill('Quand ajouter une nouvelle bande pondeuse ?');
    await page.getByRole('button', { name: /Envoyer/i }).click();

    await expect(page.getByText(/ITH|canicule|bande|pondeuse|calendrier commercial|Timing avicole/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
