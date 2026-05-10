import { expect, test } from '@playwright/test';
import { assertNoBadUiText, collectRuntimeErrors, goToModule, login } from './helpers.js';

test.describe('Horizon Farm — RH & Équipe', () => {
  test('le module RH est visible dans la navigation et charge le référentiel équipe', async ({ page }) => {
    const runtime = collectRuntimeErrors(page);
    await login(page);

    await goToModule(page, 'RH & Équipe');

    await expect(page.getByText(/RH & Équipe/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Répertoire équipe/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Penda Thiaw/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Propriétaire/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Chef de projet/i).first()).toBeVisible({ timeout: 15_000 });

    await assertNoBadUiText(page, 'Module RH & Équipe');
    runtime.assertClean();
  });

  test('le module RH propose les équipes opérationnelles utilisables par les workflows', async ({ page }) => {
    const runtime = collectRuntimeErrors(page);
    await login(page);

    await goToModule(page, 'RH & Équipe');

    for (const label of ['Équipe ferme', 'Équipe avicole', 'Équipe cultures', 'Équipe stock']) {
      await expect(page.getByText(label).first(), `Équipe RH manquante: ${label}`).toBeVisible({ timeout: 15_000 });
    }

    await assertNoBadUiText(page, 'Équipes opérationnelles RH');
    runtime.assertClean();
  });
});
