import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAchatsStockTab,
  resolveCommercialTab,
  resolveCulturesTab,
  ACHATS_STOCK_TABS,
  COMMERCIAL_TABS,
} from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('MODULE_TARGET_TABS — 3 onglets Achats, Commercial, Cultures', () => {
  assert.deepEqual(MODULE_TARGET_TABS.achats_stock, ACHATS_STOCK_TABS);
  assert.deepEqual(MODULE_TARGET_TABS.commercial, COMMERCIAL_TABS);
  assert.equal(MODULE_TARGET_TABS.cultures.length, 3);
});

test('resolveAchatsStockTab — aliases legacy', () => {
  assert.equal(resolveAchatsStockTab('Stock'), 'Inventaire');
  assert.equal(resolveAchatsStockTab('Mouvements'), 'Inventaire');
  assert.equal(resolveAchatsStockTab('Achats'), 'Réceptions & achats');
  assert.equal(resolveAchatsStockTab('Fournisseurs'), 'Fournisseurs & dettes');
  assert.equal(resolveAchatsStockTab('Résumé'), 'Inventaire');
});

test('resolveCommercialTab — aliases legacy', () => {
  assert.equal(resolveCommercialTab('Clients'), 'Clients & créances');
  assert.equal(resolveCommercialTab('Relances'), 'Clients & créances');
  assert.equal(resolveCommercialTab('Opportunités'), 'Ventes');
  assert.equal(resolveCommercialTab('Résumé'), 'Ventes');
  assert.equal(resolveCommercialTab('Abonnements'), 'Livraisons');
});

test('resolveCulturesTab — aliases legacy', () => {
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Intrants & Météo'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes');
  assert.equal(resolveCulturesTab('Graphiques'), 'Économie circulaire');
});
