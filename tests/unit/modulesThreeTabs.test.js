import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAchatsStockTab,
  resolveCommercialTab,
  resolveCulturesTab,
} from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('les modules Achats, Commercial et Cultures exposent leurs 7 onglets cibles', () => {
  assert.deepEqual(MODULE_TARGET_TABS.achats_stock, ['Tableau de bord', 'Produits & catégories', 'Fournisseurs', 'Achats & réceptions', 'Stocks & lots', 'Mouvements', 'Inventaires']);
  assert.deepEqual(MODULE_TARGET_TABS.commercial, ['Tableau de bord', 'Clients', 'Ventes & commandes', 'Livraisons', 'Factures & paiements', 'Créances & relances', 'Réclamations']);
  assert.equal(MODULE_TARGET_TABS.cultures.length, 7);
});

test('resolveAchatsStockTab — aliases legacy', () => {
  assert.equal(resolveAchatsStockTab('Stock'), 'Stocks & lots');
  assert.equal(resolveAchatsStockTab('Mouvements'), 'Mouvements stock');
  assert.equal(resolveAchatsStockTab('Achats'), 'Achats & réceptions stock');
  assert.equal(resolveAchatsStockTab('Fournisseurs'), 'Fournisseurs stock');
  assert.equal(resolveAchatsStockTab('Résumé'), 'Tableau de bord stock');
});

test('resolveCommercialTab — aliases legacy', () => {
  assert.equal(resolveCommercialTab('Clients'), 'Clients commercial');
  assert.equal(resolveCommercialTab('Relances'), 'Créances & relances commercial');
  assert.equal(resolveCommercialTab('Opportunités'), 'Ventes & commandes commercial');
  assert.equal(resolveCommercialTab('Résumé'), 'Tableau de bord commercial');
  assert.equal(resolveCommercialTab('Abonnements'), 'Clients commercial');
});

test('resolveCulturesTab — aliases legacy', () => {
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles cultures');
  assert.equal(resolveCulturesTab('Intrants & Météo'), 'Intrants & fertilisation cultures');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes cultures');
  assert.equal(resolveCulturesTab('Récoltes & stock'), 'Récoltes cultures');
  assert.equal(resolveCulturesTab('Graphiques'), 'Historique cultures');
});
