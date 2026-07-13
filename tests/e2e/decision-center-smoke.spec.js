import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

const hasCredentials = Boolean(process.env.E2E_LOGIN && process.env.E2E_PASSWORD);

test.describe('Centre décisionnel et Objectifs & Croissance', () => {
  test.skip(!hasCredentials, 'Variables E2E_LOGIN et E2E_PASSWORD requises');

  test('affiche les blocs décisionnels clés', async ({ page }) => {
    await login(page);

    await goToModule(page, 'Centre décisionnel');
    await expect(page.getByRole('heading', { name: /Centre décisionnel/i })).toBeVisible();
    await expect(page.getByText(/Actions critiques|actions à traiter|Actions prioritaires/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Exporter Excel$/i })).toBeVisible();

    await page.getByRole('button', { name: /^Décisions$/i }).click();
    await expect(page.getByText(/Où agir pour vendre plus|Commercial/i).first()).toBeVisible();
    await expect(page.getByText(/ROI des décisions|Aucune décision historisée/i).first()).toBeVisible();

    await goToModule(page, 'Objectifs & Croissance');
    await expect(page.getByRole('heading', { name: /Objectifs & Croissance/i })).toBeVisible();
    await expect(page.getByText(/Objectifs par activité/i)).toBeVisible();
    await expect(page.getByText(/Progression calculée depuis les modules|Automatisation objectifs/i).first()).toBeVisible();
    await expect(page.getByText(/Le Réel vs Le Théorique|Valorisation du Fumier/i).first()).toBeVisible();
  });

  test('onglet Risques affiche le registre dérivé', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Centre décisionnel');
    await page.getByRole('button', { name: /^Risques$/i }).click();
    await expect(page.getByText(/Registre des risques structurels/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Sanitaire/i).first()).toBeVisible();
    await expect(page.getByText(/Trésorerie/i).first()).toBeVisible();
  });

  test('onglet À traiter affiche les urgences à traiter', async ({ page }) => {
    await login(page);
    await goToModule(page, 'Centre décisionnel');
    await expect(page.getByRole('button', { name: /^À traiter$/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/DER\/FJ|actions à traiter|Trésorerie/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Ouvrir$/i }).first()).toBeVisible();
  });
});
