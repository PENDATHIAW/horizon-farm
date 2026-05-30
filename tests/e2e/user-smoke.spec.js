import { expect, test } from '@playwright/test';
import { assertNoBadUiText, collectRuntimeErrors, goToModule, login } from './helpers.js';

const MODULE_LABELS = [
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

test.describe('Horizon Farm — parcours ami utilisateur', () => {
  test.setTimeout(180_000);

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
