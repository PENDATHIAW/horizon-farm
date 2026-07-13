import test from 'node:test';
import assert from 'node:assert/strict';
import { AGRI_FEEDS_TABS, AGRI_FEEDS_DEPLOYMENT_MODES, FEED_STOCK_CATEGORIES } from '../../src/config/agriFeeds.config.js';
import { resolveAgriFeedsTab } from '../../src/utils/agriFeedsNavigation.js';
import { computeAgriFeedsReadiness, normalizeAgriFeedsDataMap } from '../../src/services/agriFeeds/agriFeedsReadinessEngine.js';
import { buildPhase1FeedBenchmark, compareMarketFeedToAgriFeedsFormula } from '../../src/services/agriFeeds/phase1FeedBenchmarkEngine.js';
import { resolveFacilityZones, facilityZonesSummary } from '../../src/services/agriFeeds/facilityZonesService.js';
import { getStockCategoryOptions } from '../../src/utils/stockCategoryOptions.js';
import { MODULE_REGISTRY, NAV_MODULE_ORDER, GRAND_MODULE_IDS } from '../../src/config/modules.config.js';
import { MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { ERP_MODULE_PERMISSIONS } from '../../src/context/AuthContext.jsx';

test('config — 8 onglets AGRI FEEDS', () => {
  assert.equal(AGRI_FEEDS_TABS.length, 8);
  assert.deepEqual(MODULE_TARGET_TABS.agri_feeds, [...AGRI_FEEDS_TABS]);
});

test('navigation — module enregistré', () => {
  assert.equal(MODULE_REGISTRY.agri_feeds.label, 'AGRI FEEDS');
  assert.ok(NAV_MODULE_ORDER.includes('agri_feeds'));
  assert.ok(GRAND_MODULE_IDS.includes('agri_feeds'));
  assert.ok(typeof MODULE_ENTRY_POINTS.agri_feeds === 'function');
  assert.ok(ERP_MODULE_PERMISSIONS.includes('agri_feeds'));
});

test('resolveAgriFeedsTab — aliases', () => {
  assert.equal(resolveAgriFeedsTab('benchmark'), 'AgriFeedsOverviewView');
  assert.equal(resolveAgriFeedsTab('Production'), 'AgriFeedsProductionView');
  assert.equal(resolveAgriFeedsTab('inconnu'), 'AgriFeedsOverviewView');
});

test('stock categories — AGRI FEEDS présentes', () => {
  const values = getStockCategoryOptions().map((o) => o.value);
  FEED_STOCK_CATEGORIES.forEach((c) => assert.ok(values.includes(c.value), c.value));
});

test('zones prévues — 7 zones par défaut', () => {
  const zones = resolveFacilityZones({});
  assert.ok(zones.length >= 7);
  const summary = facilityZonesSummary({});
  assert.equal(summary.planned, zones.length);
  assert.match(summary.separationNote, /séparées/i);
});

test('readiness — Mode REFERENCE sans données production', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({}));
  assert.equal(readiness.mode, AGRI_FEEDS_DEPLOYMENT_MODES.REFERENCE.id);
  assert.equal(readiness.modeFlags.allowsProduction, false);
  assert.equal(readiness.modeFlags.allowsSales, false);
  assert.ok(readiness.readiness_score >= 0);
});

test('readiness — Phase 1 score monte avec distributions', () => {
  const empty = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({}));
  const withLogs = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: [
      { id: '1', quantite: 50, montant_total: 25000, date: '2026-01-10', cible_id: 'LOT1', type_cible: 'lot_avicole' },
      { id: '2', quantite: 40, montant_total: 20000, date: '2026-01-12', cible_id: 'LOT1', type_cible: 'lot_avicole' },
      { id: '3', quantite: 45, montant_total: 22000, date: '2026-01-14', cible_id: 'LOT2', type_cible: 'lot_avicole' },
      { id: '4', quantite: 30, montant_total: 15000, date: '2026-01-16', cible_id: 'LOT2', type_cible: 'lot_avicole' },
      { id: '5', quantite: 35, montant_total: 18000, date: '2026-01-18', cible_id: 'LOT1', type_cible: 'lot_avicole' },
    ],
    stock: [{ id: 'S1', produit: 'Aliment chair', categorie: 'aliment_avicole', quantite: 200, prixUnit: 500 }],
    avicole: [
      { id: 'LOT1', nom: 'Bande A', type: 'Chair', initial_count: 500, mortality: 10, current_count: 490 },
      { id: 'LOT2', nom: 'Bande B', type: 'Pondeuse', initial_count: 1000, mortality: 20, current_count: 980 },
    ],
    fournisseurs: [{ id: 'F1', nom: 'Provende Thiès' }],
  }));
  assert.ok(withLogs.scores.phase1_reference > empty.scores.phase1_reference);
  assert.equal(withLogs.mode, 'REFERENCE');
});

test('readiness — présence formules bascule vers PILOT_INTERNAL', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: Array.from({ length: 5 }, (_, i) => ({
      id: String(i), quantite: 10, montant_total: 5000, cible_id: 'L1', type_cible: 'lot_avicole',
    })),
    stock: [{ id: 'S1', categorie: 'aliment_avicole', produit: 'Aliment', quantite: 100, prixUnit: 400 }],
    avicole: [{ id: 'L1', type: 'Chair', initial_count: 100, mortality: 2, current_count: 98 }],
    feed_formulas: [{ id: 'F1', name: 'Chair v1', status: 'draft' }],
  }));
  assert.equal(readiness.mode, 'PILOT_INTERNAL');
  assert.equal(readiness.modeFlags.allowsProduction, true);
  assert.equal(readiness.modeFlags.allowsSales, false);
});

test('benchmark Phase 1 — agrège coûts par lot', () => {
  const { rows, totals, hasData } = buildPhase1FeedBenchmark({
    alimentation_logs: [
      { id: 'a1', cible_id: 'LOT1', type_cible: 'lot_avicole', quantite: 100, montant_total: 50000, date: '2026-02-01', fournisseur_id: 'F1' },
      { id: 'a2', cible_id: 'LOT1', type_cible: 'lot_avicole', quantite: 80, montant_total: 40000, date: '2026-02-10', fournisseur_id: 'F1' },
    ],
    stock: [{ id: 'S1', categorie: 'aliment_avicole', produit: 'Croissance', prixUnit: 500 }],
    avicole: [{ id: 'LOT1', nom: 'Chair 1', type: 'Chair', initial_count: 200, mortality: 5, current_count: 195, weight_avg: 2.1 }],
    fournisseurs: [{ id: 'F1', nom: 'NMA' }],
    production_oeufs_logs: [],
    sales_orders: [],
  });
  assert.equal(hasData, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity_consumed, 180);
  assert.equal(rows[0].feed_cost_total, 90000);
  assert.ok(rows[0].cost_feed_per_subject > 0);
  assert.equal(totals.distributions, 2);
  assert.match(rows[0].supplier, /NMA/);
});

test('comparaison — données insuffisantes sans formule/test', () => {
  const result = compareMarketFeedToAgriFeedsFormula({
    dataMap: {
      alimentation_logs: [
        { id: 'a1', cible_id: 'LOT1', type_cible: 'lot_avicole', quantite: 50, montant_total: 25000, date: '2026-03-01' },
      ],
      avicole: [{ id: 'LOT1', nom: 'Lot', type: 'Chair', initial_count: 100, current_count: 95, mortality: 5 }],
    },
    animalLotId: 'LOT1',
  });
  assert.ok(['insufficient_data', 'donnees_insuffisantes'].includes(result.status));
  assert.match(result.message, /insuffisant|cycle supplémentaire/i);
});

test('entry point — AgriFeedsModule chargeable', async () => {
  const mod = await MODULE_ENTRY_POINTS.agri_feeds();
  assert.equal(typeof mod.default, 'function');
});
