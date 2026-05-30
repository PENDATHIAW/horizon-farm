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
    await expect(page.getByText(/Recommandations investissement & vente/i)).toBeVisible();
    await expect(page.getByText(/Pourquoi Horizon recommande ça/i).first()).toBeVisible();
    await expect(page.getByText(/Calendrier commercial annuel/i)).toBeVisible();
    await expect(page.getByText(/Historique des décisions/i)).toBeVisible();

    await openNav(page, 'Objectifs & Croissance');
    await expect(page.getByRole('heading', { name: /Objectifs & Croissance/i })).toBeVisible();
    await expect(page.getByText(/Objectifs par activité/i)).toBeVisible();
    await expect(page.getByText(/Demande, couverture & actions/i)).toBeVisible();
    await expect(page.getByText(/Fidélisation, fournisseurs & stock/i)).toBeVisible();
  });
});
