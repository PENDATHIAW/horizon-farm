import { expect, test } from '@playwright/test';

async function loginIfNeeded(page) {
  await page.goto('/');
  const loginButton = page.getByRole('button', { name: /se connecter/i });
  if (!(await loginButton.isVisible().catch(() => false))) return;

  const login = process.env.E2E_LOGIN || 'penda';
  const password = process.env.E2E_PASSWORD || '';
  await page.getByLabel(/email|login/i).fill(login);
  await page.getByLabel(/mot de passe/i).fill(password);
  await loginButton.click();
  await expect(page.getByText(/Horizon Farm|Accueil|Centre décisionnel/i).first()).toBeVisible({ timeout: 20_000 });
}

async function openNav(page, label) {
  const item = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  if (await item.isVisible().catch(() => false)) {
    await item.click();
    return;
  }
  await page.getByText(new RegExp(label, 'i')).first().click();
}

test.describe('Centre décisionnel et Objectifs & Croissance', () => {
  test('affiche les blocs décisionnels clés', async ({ page }) => {
    await loginIfNeeded(page);

    await openNav(page, 'Centre décisionnel');
    await expect(page.getByRole('heading', { name: /Centre décisionnel/i })).toBeVisible();
    await expect(page.getByText(/QUAND vendre|QUAND lancer|5 onglets distincts/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Cycles/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Risques/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recommandations/i })).toBeVisible();
    await expect(page.getByText(/Paramètres pilotage/i)).toBeVisible();

    await openNav(page, 'Objectifs & Croissance');
    await expect(page.getByRole('heading', { name: /Objectifs & Croissance/i })).toBeVisible();
    await expect(page.getByText(/Rentabilité par lot et cycle/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Efficacité Technique/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Flux & Équilibres/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Maraîchage & Diversification/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exporter Excel/i })).toBeVisible();
  });

  test('navigue vers Cycles et affiche le vide sanitaire', async ({ page }) => {
    await loginIfNeeded(page);
    await openNav(page, 'Centre décisionnel');
    await page.getByRole('button', { name: /^Cycles$/i }).click();
    await expect(page.getByText(/QUAND LANCER une bande|Cycles — QUAND LANCER/i)).toBeVisible();
    await expect(page.getByText(/vide sanitaire/i).first()).toBeVisible();
  });
});
