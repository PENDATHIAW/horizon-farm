import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildElevageActivityPnl,
  buildPondeuseKpis,
  buildChairKpis,
  buildBovinKpis,
  formatActivityPnlRow,
  isPondeuseLot,
  isChairLot,
  isBovinAnimal,
} from '../../src/utils/elevageActivityPnl.js';
import { buildElevageCostAwareInsights } from '../../src/utils/elevageIaInsights.js';
import { buildElevageInvestorReport } from '../../src/utils/elevageExport.js';
import {
  setupTestStorage,
  assertModuleTabStable,
  buildSimulatedProps,
  withSimulatedMode,
} from './helpers/moduleTabTestHarness.js';
import { ELEVAGE_TABS } from '../../src/utils/commercialNavigation.js';

setupTestStorage();

const FARM = 'farm-v3';
const PONDEUSE_LOT = {
  id: 'LOT-PONTE-V3',
  name: 'Pondeuses A',
  type: 'Pondeuse',
  initial_count: 500,
  current_count: 480,
  effectif_actuel: 480,
  farm_id: FARM,
  revenu: 250000,
};
const CHAIR_LOT = {
  id: 'LOT-CHAIR-V3',
  name: 'Chair B',
  type: 'Chair',
  initial_count: 1000,
  current_count: 920,
  mortality: 80,
  morts: 80,
  weight_avg: 1.2,
  poids_cible: 1.5,
  age_days: 35,
  farm_id: FARM,
  prix_vente_reel: 1800000,
};
const BOVIN = {
  id: 'BOV-1',
  name: 'Taureau 1',
  type: 'Bovin',
  espece: 'bovin',
  poids: 420,
  poids_cible: 450,
  poids_entree: 350,
  age_days: 120,
  prix_achat: 200000,
  farm_id: FARM,
};
const FEED_LOGS = [
  { id: 'F1', lot_id: 'LOT-PONTE-V3', montant_total: 50000, quantite: 10 },
  { id: 'F2', lot_id: 'LOT-CHAIR-V3', montant_total: 120000, quantite: 50 },
  { id: 'F3', animal_id: 'BOV-1', montant_total: 80000, quantite: 20 },
];
const HEALTH_EVENTS = [
  { id: 'H1', lot_id: 'LOT-PONTE-V3', montant: 15000, type: 'vaccin', categorie: 'sante' },
  { id: 'H2', lot_id: 'LOT-CHAIR-V3', montant: 25000, type_intervention: 'traitement', categorie: 'sante' },
  { id: 'H3', animal_id: 'BOV-1', montant: 10000, type: 'soin', categorie: 'sante' },
];
const PRODUCTION_LOGS = [
  { id: 'P1', lot_id: 'LOT-PONTE-V3', date: '2026-06-04', oeufs_produits: 400, oeufs_casses: 10 },
];

test('V3 — classification activités', () => {
  assert.equal(isPondeuseLot(PONDEUSE_LOT), true);
  assert.equal(isChairLot(CHAIR_LOT), true);
  assert.equal(isBovinAnimal(BOVIN), true);
  assert.equal(isChairLot(PONDEUSE_LOT), false);
});

test('V3 — P&L par activité agrège revenus et coûts', () => {
  const pnl = buildElevageActivityPnl({
    lots: [PONDEUSE_LOT, CHAIR_LOT],
    animaux: [BOVIN],
    feedLogs: FEED_LOGS,
    productionLogs: PRODUCTION_LOGS,
    healthEvents: HEALTH_EVENTS,
  });
  assert.ok(pnl.activities.length >= 3);
  const pondeuses = pnl.activities.find((a) => a.id === 'pondeuses');
  assert.ok(pondeuses);
  assert.equal(pondeuses.revenue, 250000);
  assert.ok(pondeuses.feedingCost > 0);
  assert.ok(pondeuses.healthCost > 0);
  const chair = pnl.activities.find((a) => a.id === 'chair');
  assert.ok(chair);
  assert.equal(chair.revenue, 1800000);
  const bovins = pnl.activities.find((a) => a.id === 'bovins');
  assert.ok(bovins);
  assert.ok(bovins.feedingCost > 0);
});

test('V3 — marge non fiable si données manquantes', () => {
  const pnl = buildElevageActivityPnl({
    lots: [{ id: 'LOT-INCOMP', type: 'Pondeuse', name: 'Incomplet', current_count: 100 }],
    animaux: [],
    feedLogs: [],
    productionLogs: [],
    healthEvents: [],
  });
  const row = pnl.activities.find((a) => a.id === 'pondeuses');
  assert.ok(row);
  assert.equal(row.reliable, false);
  const formatted = formatActivityPnlRow(row);
  assert.match(formatted, /partielle|—/i);
});

test('V3 — formatActivityPnlRow n\'affiche pas marge fiable si non fiable', () => {
  const unreliable = {
    totalCost: 10000,
    revenue: 0,
    reliable: false,
    partial: true,
    reliabilityMessage: 'Rentabilité partielle : données manquantes (alimentation, santé).',
  };
  assert.match(formatActivityPnlRow(unreliable), /partielle/i);
  const reliable = {
    totalCost: 10000,
    revenue: 15000,
    reliable: true,
    grossMargin: 5000,
    marginRate: 50,
  };
  const formatted = formatActivityPnlRow(reliable);
  assert.ok(formatted.includes('5') || formatted.includes('5000'));
});

test('V3 — KPI pondeuses avec coût par œuf', () => {
  const kpis = buildPondeuseKpis(PONDEUSE_LOT, {
    feedLogs: FEED_LOGS,
    productionLogs: PRODUCTION_LOGS,
    healthEvents: HEALTH_EVENTS,
  });
  assert.equal(kpis.eggsProduced, 400);
  assert.equal(kpis.eggsSellable, 390);
  assert.ok(kpis.costPerEgg > 0);
  assert.ok(kpis.costPerTablet > kpis.costPerEgg);
});

test('V3 — KPI poulets de chair', () => {
  const kpis = buildChairKpis(CHAIR_LOT, {
    feedLogs: FEED_LOGS,
    healthEvents: HEALTH_EVENTS,
  });
  assert.ok(kpis.costPerChicken > 0);
  assert.equal(kpis.avgWeight, 1.2);
  assert.equal(kpis.mortality, 80);
  assert.ok(kpis.mortalityRate > 0);
});

test('V3 — KPI bovins avec GMQ', () => {
  const kpis = buildBovinKpis(BOVIN, {
    feedLogs: FEED_LOGS,
    healthEvents: HEALTH_EVENTS,
  });
  assert.ok(kpis.costPerAnimal > 0);
  assert.ok(kpis.gmq > 0);
  assert.equal(kpis.weight, 420);
  assert.equal(kpis.targetWeight, 450);
});

test('V3 — IA utilise coûts complets (alimentation + santé)', () => {
  const insights = buildElevageCostAwareInsights({
    lots: [PONDEUSE_LOT, CHAIR_LOT],
    animaux: [BOVIN],
    feedLogs: FEED_LOGS,
    productionLogs: PRODUCTION_LOGS,
    healthEvents: HEALTH_EVENTS,
    stocks: [{ id: 'STK-ALIM', produit: 'Aliment', quantite: 5, seuil: 20 }],
  });
  assert.ok(insights.length > 0);
  const feedStock = insights.find((i) => i.id?.includes('feed-stock'));
  assert.ok(feedStock, 'alerte stock aliment attendue');
  const mortalityChair = insights.find((i) => i.id?.includes('mortality-LOT-CHAIR'));
  assert.ok(mortalityChair, 'alerte mortalité chair attendue');
});

test('V3 — IA recommande prudence si coût incomplet', () => {
  const insights = buildElevageCostAwareInsights({
    lots: [{ id: 'LOT-X', type: 'Pondeuse', name: 'Test', current_count: 100 }],
    animaux: [],
    feedLogs: [],
    healthEvents: [],
    productionLogs: [],
  });
  const unreliable = insights.find((i) => i.id?.includes('margin-unreliable'));
  assert.ok(unreliable, 'recommandation marge non fiable attendue');
  assert.match(unreliable.description, /incomplet|manquant|Coût/i);
});

test('V3 — export rapport synthèse', () => {
  const report = buildElevageInvestorReport({
    lots: [PONDEUSE_LOT, CHAIR_LOT],
    animaux: [BOVIN],
    feedLogs: FEED_LOGS,
    productionLogs: PRODUCTION_LOGS,
    healthEvents: HEALTH_EVENTS,
    periodLabel: 'Juin 2026',
    farmLabel: 'Horizon Farm',
  });
  assert.equal(report.title, 'Synthèse Élevage Horizon Farm');
  assert.equal(report.period, 'Juin 2026');
  assert.equal(report.farm, 'Horizon Farm');
  assert.ok(report.pnl.activities.length > 0);
  assert.ok(report.insights.length >= 0);
  assert.ok(report.rows.length > 0);
  assert.ok(report.summary.includes('Lots'));
});

test('V3 — non-régression V1 startup helpers', async () => {
  const { isElevageStartupMode } = await import('../../src/modules/elevage/elevageStartupHelpers.js');
  assert.equal(isElevageStartupMode({}), true);
  assert.equal(isElevageStartupMode({ lots: [PONDEUSE_LOT] }), false);
});

test('V3 — non-régression V2 taux de ponte', async () => {
  const { computeOfficialLayingRate } = await import('../../src/utils/elevageLayingRate.js');
  const result = computeOfficialLayingRate({ eggsProduced: 400, activeLayers: 500 });
  assert.equal(result.rate, 80);
});

for (const tab of ELEVAGE_TABS) {
  test(`Élevage simulated mode tab: ${tab}`, async () => {
    await withSimulatedMode(true, async () => {
      await assertModuleTabStable('elevage', tab, buildSimulatedProps());
    });
  });
}
