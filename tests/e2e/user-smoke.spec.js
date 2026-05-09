import { expect, test } from '@playwright/test';
import { assertNoBadUiText, collectRuntimeErrors, goToModule, login } from './helpers.js';

const MODULE_LABELS = [
  'Dashboard',
  'Animaux',
  'Avicole',
  'Sante',
  'Finances',
  'Comptabilite',
  'Investissements',
  'Impact Business',
  'Stock',
  'Clients',
  'Ventes',
  'Fournisseurs',
  'Tracabilite',
  'Centre Alertes',
  'Cultures',
  'Documents',
  'Taches',
  'Rapports',
  'Equipements',
  'Smart Farm',
  'Audit Logs',
  'Sync Offline',
];

test.describe('Horizon Farm — parcours ami utilisateur', () => {
  test('connexion puis ouverture de chaque module sans erreur visible', async ({ page }) => {
    const runtime = collectRuntimeErrors(page);

    await login(page);
    await assertNoBadUiText(page, 'Apres connexion');

    for (const label of MODULE_LABELS) {
      await goToModule(page, label);
    }

    runtime.assertClean();
  });
});
