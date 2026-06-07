import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardPriorities,
  buildDashboardNarrative,
  buildDashboardStartupJourney,
  buildExploitationScore,
  buildFarmOverview,
  buildDashboardWeatherReport,
} from '../../src/modules/dashboard/dashboardPilotage.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';

const monthKey = () => new Date().toISOString().slice(0, 7);

test('priorités limitées à 5 avec messages actionnables', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 50000, date: `${monthKey()}-01`, created_at: '2020-01-01' }],
    salesOrdersAll: [{ id: 'O1', montant_total: 50000, date: `${monthKey()}-01`, created_at: '2020-01-01' }],
    payments: [],
    paymentsAll: [],
    transactions: [],
    stocks: [{ id: 'S1', produit: 'Aliment pondeuse', quantite: 2, seuil: 10 }],
    alimentationLogs: [{ quantite: 5 }],
    cultures: [],
    productionLogs: [],
    businessPlans: [],
  });
  const priorities = buildDashboardPriorities(summary, {
    salesOrdersAll: [{ id: 'O1', montant_total: 50000, created_at: '2020-01-01' }],
    paymentsAll: [],
    stocks: [{ id: 'S1', produit: 'Aliment pondeuse', quantite: 2, seuil: 10 }],
    alimentationLogs: [{ quantite: 5 }],
  }, { findings: [] });

  assert.ok(priorities.length <= 5);
  assert.ok(priorities.some((row) => row.id === 'receivables'));
  assert.match(priorities.find((row) => row.id === 'receivables').title, /créance/i);
});

test('narrative synthétique sans LLM', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 10000, date: `${monthKey()}-01` }],
    salesOrdersAll: [{ id: 'O1', montant_total: 10000, date: `${monthKey()}-01` }],
    payments: [{ id: 'P1', order_id: 'O1', montant: 10000, date: `${monthKey()}-01` }],
    paymentsAll: [{ id: 'P1', order_id: 'O1', montant: 10000, date: `${monthKey()}-01` }],
    transactions: [],
    stocks: [],
    productionLogs: [],
  });
  const narrative = buildDashboardNarrative(summary, {
    salesOrdersAll: [{ id: 'O1', montant_total: 10000, date: `${monthKey()}-01` }],
    paymentsAll: [{ id: 'P1', order_id: 'O1', montant: 10000, date: `${monthKey()}-01` }],
    stocks: [],
  });

  assert.ok(narrative.lines.length >= 1);
  assert.ok(narrative.lines.length <= 4);
});

test('parcours démarrage 6 étapes avec progression', () => {
  const props = {
    stocks: [{ quantite: 10 }],
    animaux: [{ id: 'A1' }],
    productionLogs: [],
    salesOrdersAll: [],
    paymentsAll: [],
    businessPlans: [],
  };
  const summary = buildDashboardSummary(props);
  const journey = buildDashboardStartupJourney(props, summary);

  assert.equal(journey.total, 6);
  assert.ok(journey.completedCount >= 2);
  assert.ok(journey.nextStep);
  assert.ok(journey.progressPct >= 0);
});

test('score exploitation avec dimensions', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 10000, date: `${monthKey()}-01` }],
    salesOrdersAll: [{ id: 'O1', montant_total: 10000, date: `${monthKey()}-01` }],
    payments: [{ id: 'P1', order_id: 'O1', montant: 10000, date: `${monthKey()}-01` }],
    paymentsAll: [{ id: 'P1', order_id: 'O1', montant: 10000, date: `${monthKey()}-01` }],
    transactions: [],
    animaux: [{ id: 'A1' }],
    lotsData: [{ id: 'L1', effectif: 100, statut: 'actif' }],
    stocks: [],
    productionLogs: [],
  });
  const score = buildExploitationScore(summary, { score: 80 }, { transactions: [] });

  assert.ok(score.score >= 0 && score.score <= 100);
  assert.equal(score.dimensions.length, 5);
});

test('vue agricole aviculture bovins cultures', () => {
  const summary = buildDashboardSummary({
    animaux: [{ id: 'A1' }],
    lotsData: [{ id: 'L1', effectif: 200, type: 'pondeuse', statut: 'actif' }],
    cultures: [{ record_type: 'parcelle', parcelle_nom: 'P1', surface: 1, unite_surface: 'ha', statut: 'actif' }],
    stocks: [],
    salesOrders: [],
    payments: [],
    productionLogs: [],
  });
  const overview = buildFarmOverview(summary);

  assert.ok(overview.aviculture.hasData);
  assert.ok(overview.bovins.hasData);
  assert.ok(overview.cultures.hasData);
});

test('météo — composant existant signalé', () => {
  const report = buildDashboardWeatherReport({ temp: 32, condition: 'Ensoleillé' }, false);
  assert.equal(report.componentExisting, true);
  assert.equal(report.dashboardStrip, true);
  assert.equal(report.absent, false);
});
