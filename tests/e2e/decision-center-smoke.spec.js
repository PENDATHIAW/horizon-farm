import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

const hasCredentials = Boolean(process.env.E2E_LOGIN && process.env.E2E_PASSWORD);

test.describe('Centre décisionnel et Objectifs & Croissance', () => {
  test.skip(!hasCredentials, 'Variables E2E_LOGIN et E2E_PASSWORD requises');

  test('affiche les blocs décisionnels clés', async ({ page }) => {
    await login(page);

    await goToModule(page, 'Centre décisionnel');
    await expect(page.getByRole('heading', { name: /Centre décisionnel/i })).toBeVisible();
    await expect(page.getByText(/À traiter aujourd'hui|File du jour|Priorités actionnables/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Exporter Excel$/i })).toBeVisible();

    await page.getByRole('button', { name: /Croissance.*opportunités/i }).click();
    await expect(page.getByText(/Marge & demande clients/i)).toBeVisible();
    await expect(page.getByText(/Que vendre et où agir côté commercial/i)).toBeVisible();
    await expect(page.getByText(/Historique des décisions/i)).toBeVisible();

    await page.getByRole('button', { name: /Saisons.*marchés/i }).click();
    await expect(page.getByText(/Calendrier commercial annuel/i)).toBeVisible();
    await expect(page.getByText(/Prochaines fenêtres|Fêtes.*marchés/i).first()).toBeVisible();

    await goToModule(page, 'Objectifs & Croissance');
    await expect(page.getByRole('heading', { name: /Objectifs & Croissance/i })).toBeVisible();
    await expect(page.getByText(/Objectifs par activité/i)).toBeVisible();
    await expect(page.getByText(/Demande, couverture & actions/i)).toBeVisible();
    await expect(page.getByText(/Fidélisation, fournisseurs & stock/i)).toBeVisible();
  });

  test('onglet Saisons & marchés affiche le vide sanitaire et les prochaines fêtes', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Centre décisionnel');
    await page.getByRole('button', { name: /Saisons.*marchés/i }).click();
    await expect(page.getByText(/vide sanitaire|QUAND LANCER|Prochaines fêtes|Fêtes.*marchés/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Magal|Gamou|Fin d'année/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('onglet Urgences propose Ignorer et Ouvrir', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Centre décisionnel');
    await expect(page.getByRole('button', { name: /^Ignorer$/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Ouvrir$/i }).first()).toBeVisible();
  });
});
