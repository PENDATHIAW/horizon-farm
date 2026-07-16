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

test('le formulaire mobile reste accessible sans être recouvert par le pied de page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');

  const form = page.locator('form');
  const footer = page.locator('footer');
  const submit = page.getByRole('button', { name: /^Se connecter$/i });
  await expect(form).toBeVisible();
  await expect(footer).toBeAttached();

  const formBox = await form.boundingBox();
  const footerBox = await footer.boundingBox();
  expect(formBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(formBox.y + formBox.height).toBeLessThanOrEqual(footerBox.y + 1);

  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeVisible();
  await expect(submit).toBeInViewport();
});
