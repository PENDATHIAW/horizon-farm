import { expect, test } from '@playwright/test';

test('la page de connexion ne déclenche aucune écriture métier Supabase', async ({ page }) => {
  const writes = [];

  page.on('request', (request) => {
    const method = request.method();
    if (/\/rest\/v1\//.test(request.url()) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      writes.push(`${method} ${request.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByText(/Connexion/i)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(3_000);

  expect(writes, `Écritures Supabase avant connexion:\n${writes.join('\n')}`).toEqual([]);
});
