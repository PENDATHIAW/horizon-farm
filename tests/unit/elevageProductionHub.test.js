import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  navigateToEggStock,
  EGG_STOCK_CONTEXT_MESSAGE,
  filterStocksByContext,
  stockRowMatchesContext,
} from '../../src/utils/productionNavigation.js';
import { buildProductionHubSnapshot } from '../../src/utils/productionHubMetrics.js';
import {
  setupTestStorage,
  assertModuleTabStable,
  buildSimulatedProps,
  withSimulatedMode,
} from './helpers/moduleTabTestHarness.js';

setupTestStorage();

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const productionHubSrc = readFileSync(join(root, 'src/modules/elevage/ProductionHub.jsx'), 'utf8');
const recoveredSrc = readFileSync(join(root, 'src/modules/ElevageRecoveredModule.jsx'), 'utf8');

test('Production — libellé "Stock œufs / aliment" retiré du hub monté', () => {
  assert.doesNotMatch(productionHubSrc, /Stock œufs \/ aliment/);
  assert.doesNotMatch(recoveredSrc, /Stock œufs \/ aliment/);
});

test('Production — carte "Stock œufs & tablettes" présente', () => {
  assert.match(productionHubSrc, /Stock œufs & tablettes/);
});

test('Production — sections métier orientées rendement', () => {
  assert.match(productionHubSrc, /Œufs & rendement ponte/);
  assert.match(productionHubSrc, /Chair — rendement/);
  assert.match(productionHubSrc, /Bovins — GMQ/);
  assert.match(productionHubSrc, /Viande & transformation/);
});

test('Production — aliments non affichés comme production principale', () => {
  assert.doesNotMatch(productionHubSrc, /Aliments & emballages/);
  assert.doesNotMatch(productionHubSrc, /Stock aliment/);
  assert.match(productionHubSrc, /Alimentation/);
});

test('navigateToEggStock — contexte Achats & Stock Stock', () => {
  let captured = null;
  navigateToEggStock((moduleId, options) => {
    captured = { moduleId, options };
  });
  assert.equal(captured.moduleId, 'achats_stock');
  assert.equal(captured.options.tab, 'Stock');
  assert.equal(captured.options.stockContext, 'oeufs');
  assert.match(captured.options.searchContext, /œufs/);
  assert.equal(captured.options.contextMessage, EGG_STOCK_CONTEXT_MESSAGE);
});

test('filterStocksByContext — œufs uniquement, pas aliment', () => {
  const rows = [
    { id: '1', produit: 'Œufs frais', categorie: 'produit_fini_oeufs', quantite: 100 },
    { id: '2', produit: 'Aliment pondeuse', categorie: 'aliment', quantite: 500 },
    { id: '3', produit: 'Tablettes', quantite: 20 },
  ];
  const eggs = filterStocksByContext(rows, 'oeufs');
  assert.equal(eggs.length, 2);
  assert.ok(eggs.every((r) => stockRowMatchesContext(r, 'oeufs')));
  assert.ok(!eggs.some((r) => /aliment/i.test(r.produit)));
});

test('buildProductionHubSnapshot — agrégats chair et bovins', () => {
  const snap = buildProductionHubSnapshot({
    lots: [
      { id: 'L1', type: 'Chair', name: 'Chair A', initial_count: 100, current_count: 90, mortality: 10, weight_avg: 1.8, status: 'pret_a_la_vente' },
      { id: 'L2', type: 'Pondeuse', name: 'Ponte', initial_count: 200, current_count: 200 },
    ],
    animaux: [
      { id: 'B1', type: 'Bovin', espece: 'bovin', name: 'Taureau', poids: 440, poids_cible: 450, status: 'actif' },
    ],
    productionLogs: [
      { id: 'P1', lot_id: 'L2', date: new Date().toISOString().slice(0, 10), oeufs_produits: 120, oeufs_casses: 5 },
    ],
    stocks: [{ id: 'S1', produit: 'Œufs', categorie: 'produit_fini_oeufs', quantite: 50 }],
    feedLogs: [],
    healthEvents: [],
    transformationRows: [{ id: 'T1', kind: 'abattage', kindLabel: 'Abattage', date: '2026-06-01', label: 'Lot chair' }],
    documents: [],
    opportunities: [],
    marginContext: {},
  });
  assert.ok(snap.eggs.sellable7d > 0);
  assert.equal(snap.chair.activeLots, 1);
  assert.equal(snap.bovins.activeCount, 1);
  assert.ok(snap.transformation.recentCount >= 1);
});

test('Élevage > Production — mode simulé stable', async () => {
  await withSimulatedMode(true, async () => {
    await assertModuleTabStable('elevage', 'Production', buildSimulatedProps());
  });
});
