import { expect, test } from '@playwright/test';
import { LOCAL_DEMO, login, waitForAppReady } from './helpers.js';

const hasCredentials = LOCAL_DEMO || Boolean(process.env.E2E_LOGIN && process.env.E2E_PASSWORD);
const today = () => new Date().toISOString().slice(0, 10);

async function enableSimulatedMode(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('horizon_farm_data_mode_choice', 'simulated');
    window.localStorage.setItem('horizon_farm_show_simulated_data', '1');
    window.localStorage.setItem('horizon_farm_show_demo_data', '1');
  });
}

async function backToAccueil(page) {
  const nav = page.getByRole('navigation', { name: /Navigation principale/i });
  await nav.getByRole('button', { name: /^Accueil$/i }).click();
  await waitForAppReady(page);
  await expect(page.getByTestId('daily-quick-actions')).toBeVisible();
}

async function openAction(page, id, targetTestId) {
  await page.getByTestId(`daily-action-${id}`).click();
  await page.getByText(/Chargement du module/i).first().waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => {});
  await expect(page.getByTestId(targetTestId)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ERREUR MODULE/i)).toHaveCount(0);
}

async function openGlobalAction(page, id, targetTestId) {
  await page.getByRole('button', { name: /^Saisie rapide$/i }).click();
  await expect(page.getByRole('dialog', { name: /Que veux-tu enregistrer/i })).toBeVisible();
  await page.getByTestId(`global-quick-entry-${id}`).click();
  await page.getByText(/Chargement du module/i).first().waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => {});
  await expect(page.getByTestId(targetTestId)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ERREUR MODULE/i)).toHaveCount(0);
}

test.describe('Saisies quotidiennes depuis Accueil', () => {
  test.skip(!hasCredentials, 'E2E_LOGIN/E2E_PASSWORD requis');
  test.setTimeout(180_000);

  test('ouvre les sept formulaires avec leurs valeurs par défaut', async ({ page }) => {
    await enableSimulatedMode(page);
    await login(page);
    await expect(page.getByTestId('daily-quick-actions')).toBeVisible();

    await openAction(page, 'distribution', 'daily-feeding-modal');
    await expect(page.getByTestId('daily-feeding-form').locator('input[type="date"]')).toHaveValue(today());
    await expect(page.getByTestId('daily-feeding-quantity')).toHaveValue('');
    await page.getByRole('button', { name: 'Fermer' }).click();
    await backToAccueil(page);

    await openAction(page, 'ponte', 'daily-eggs-modal');
    await expect(page.getByTestId('daily-eggs-target')).not.toHaveValue('');
    await expect(page.getByTestId('daily-eggs-quantity')).toHaveValue('');
    await page.getByRole('button', { name: 'Fermer' }).click();
    await backToAccueil(page);

    await openAction(page, 'mortalite', 'daily-mortality-modal');
    await expect(page.getByTestId('daily-mortality-quantity')).toHaveValue('');
    await page.getByRole('button', { name: 'Fermer' }).click();
    await backToAccueil(page);

    await openAction(page, 'pesee', 'daily-weighing-modal');
    await expect(page.getByTestId('daily-weighing-weight')).toHaveValue('');
    await page.getByRole('button', { name: 'Fermer' }).click();
    await backToAccueil(page);

    await openAction(page, 'irrigation', 'daily-irrigation-panel');
    await expect(page.getByTestId('daily-irrigation-form').locator('input[type="date"]')).toHaveValue(today());
    await expect(page.getByTestId('daily-irrigation-volume')).toHaveValue('');
    await backToAccueil(page);

    await openAction(page, 'recolte', 'daily-harvest-panel');
    await expect(page.getByTestId('daily-harvest-form').locator('input[type="date"]')).toHaveValue(today());
    await expect(page.getByTestId('daily-harvest-quantity')).toHaveValue('');
    await backToAccueil(page);

    await openAction(page, 'vente', 'daily-sale-modal');
    await expect(page.getByTestId('daily-sale-client')).toHaveValue('client_passage');
    await expect(page.getByTestId('daily-sale-quantity')).toHaveValue('1');
    await expect(page.getByTestId('daily-sale-form').locator('input[type="date"]')).toHaveValue(today());
  });

  test('la saisie rapide globale ouvre directement le formulaire demandé', async ({ page }) => {
    await enableSimulatedMode(page);
    await login(page);

    await openGlobalAction(page, 'distribution', 'daily-feeding-modal');
    await page.getByRole('button', { name: 'Fermer' }).click();
    await openGlobalAction(page, 'irrigation', 'daily-irrigation-panel');
    await openGlobalAction(page, 'vente', 'daily-sale-modal');
  });
});
