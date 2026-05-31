import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

test.describe('Assistant ERP — Hey Horizon', () => {
  test.setTimeout(120_000);

  test('module actions terrain uniquement', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    await expect(page.getByRole('heading', { name: /Hey Horizon/i })).toBeVisible();
    await expect(page.getByText(/Indicateurs du jour/i)).toBeVisible();
    await expect(page.getByText(/Actions rapides terrain/i)).toBeVisible();

    const textarea = page.getByPlaceholder(/J'ai vendu|J’ai vendu/i);
    await textarea.fill('Créer une vente de 5 poulets');
    await page.getByRole('button', { name: /^Préparer$/i }).click();
    await expect(page.getByText(/vente|brouillon|J’ai compris/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('question production redirige vers Élevage Cycles', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Assistant ERP');

    const textarea = page.getByPlaceholder(/J'ai vendu|J’ai vendu/i);
    await textarea.fill('Quand ajouter une nouvelle bande pondeuse ?');
    await page.getByRole('button', { name: /^Préparer$/i }).click();

    await expect(page.getByRole('heading', { name: /^Élevage$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Questions production/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/bande pondeuse|Cycles animaux/i).first()).toBeVisible();
  });

  test('Accueil — pilotage vers Cycles', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Accueil');

    const cyclesBtn = page.getByRole('button', { name: /Quand lancer une bande/i }).first();
    if (await cyclesBtn.isVisible().catch(() => false)) {
      await cyclesBtn.click();
      await expect(page.getByText(/Questions production/i).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
