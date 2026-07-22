import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveCommercialTab } from '../../src/utils/commercialNavigation.js';

const TAB_IDS = MODULE_TARGET_TABS.commercial;

test('Commercial expose les 8 onglets cibles (Opportunités dédié)', () => {
  assert.deepEqual(TAB_IDS, [
    'Tableau de bord',
    'Clients',
    'Ventes & commandes',
    'Opportunités',
    'Livraisons',
    'Factures & paiements',
    'Créances & relances',
    'Réclamations',
  ]);
});

test('les anciens onglets Commercial restent des alias', () => {
  assert.equal(resolveCommercialTab('Résumé'), 'Tableau de bord commercial');
  assert.equal(resolveCommercialTab('Prospects'), 'Clients commercial');
  assert.equal(resolveCommercialTab('Relances'), 'Créances & relances commercial');
  assert.equal(resolveCommercialTab('Opportunités'), 'Opportunités commercial');
  assert.equal(resolveCommercialTab('unknown'), 'Tableau de bord commercial');
});

test('les libellés cibles ouvrent leur composant configuré', () => {
  assert.equal(resolveCommercialTab('Ventes & commandes'), 'Ventes & commandes commercial');
  assert.equal(resolveCommercialTab('Factures & paiements'), 'Factures & paiements commercial');
  assert.equal(resolveCommercialTab('Créances & relances'), 'Créances & relances commercial');
  assert.equal(resolveCommercialTab('Réclamations'), 'Réclamations commercial');
});
