import { expect, test } from '@playwright/test';
import { assertNoBadUiText, collectRuntimeErrors, goToModule, login } from './helpers.js';

const hasE2ECredentials = Boolean(process.env.E2E_LOGIN && process.env.E2E_PASSWORD);

const MODULES = [
  'Accueil',
  'Assistant ERP',
  'Centre décisionnel',
  'Objectifs',
  'Animaux',
  'Avicole',
  'Santé',
  'Finances',
  'Comptabilité',
  'Investissements',
  'Impact',
  'Stock',
  'Clients',
  'Ventes',
  'Fournisseurs',
  'Traçabilité',
  'Alertes',
  'Cultures',
  'Documents',
  'Tâches',
  'RH',
  'Rapports',
  'Équipements',
  'Smart Farm',
  'Activité',
  'Gestion',
];

test.describe('Interface sans jargon technique', () => {
  test.setTimeout(210_000);

  test('parcourt tous les modules sans texte interne visible', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'E2E_LOGIN/E2E_PASSWORD requis pour parcourir l interface connectée.');

    const runtime = collectRuntimeErrors(page);

    await login(page);
    await assertNoBadUiText(page, 'Accueil après connexion');

    for (const moduleName of MODULES) {
      await goToModule(page, moduleName);
      await expect(page.locator('body'), `Module vide: ${moduleName}`).toContainText(/\S/);
    }

    runtime.assertClean();
  });
});
