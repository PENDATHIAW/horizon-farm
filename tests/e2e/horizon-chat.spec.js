import { expect, test } from '@playwright/test';
import { loginIfNeeded } from './helpers.js';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';

test.describe('Horizon Chat standalone', () => {
  test('affiche /chat sans interface ERP et répond à une question', async ({ page }) => {
    await page.goto(`${baseURL}/chat`);
    await loginIfNeeded(page);

    await expect(page.getByTestId('horizon-chat-app')).toBeVisible();
    await expect(page.getByLabel('Conversation Horizon')).toBeVisible();
    await expect(page.getByText('Dashboard')).toHaveCount(0);
    await expect(page.getByText('Centre décisionnel')).toHaveCount(0);
    await expect(page.getByText('Nouvelle saisie')).toHaveCount(0);

    await page.getByLabel('Message Horizon').fill('Stock aliment ?');
    await page.getByLabel('Envoyer le message').click();
    await expect(page.getByText('Stock aliment ?')).toBeVisible();
    await expect(page.getByText(/stock|aliment|produit/i).first()).toBeVisible();
  });
});
