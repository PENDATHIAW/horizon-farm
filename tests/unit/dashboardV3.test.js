import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPremiumExecutiveBrief,
  buildTemporalComparisons,
  buildExploitationDynamics,
  buildDashboardQuickQuestions,
  buildPresentationModeData,
  buildDashboardVoiceBriefText,
  computeComparisonTrend,
  isSpeechSynthesisSupported,
} from '../../src/modules/dashboard/dashboardV3.js';
import { buildDashboardPriorities } from '../../src/modules/dashboard/dashboardPilotage.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', activity_type: ['mixte'] };
const FARM_B = { id: 'farm-b', name: 'Site Thiès', activity_type: ['aviculture_pondeuses'] };

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().slice(0, 10);

test('buildPremiumExecutiveBrief — texte naturel avec sections', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 50000, date: todayStr }],
    salesOrdersAll: [{ id: 'O1', montant_total: 50000, date: todayStr }],
    payments: [{ id: 'P1', order_id: 'O1', montant: 30000, date_paiement: todayStr }],
    paymentsAll: [{ id: 'P1', order_id: 'O1', montant: 30000, date_paiement: todayStr }],
    transactions: [],
    stocks: [],
  });
  const priorities = buildDashboardPriorities(summary, { salesOrdersAll: [{ id: 'O1', montant_total: 50000 }], paymentsAll: [] }, {});
  const brief = buildPremiumExecutiveBrief({
    displayName: 'Penda',
    summary,
    priorities,
    activeFarm: FARM_A,
    farmScope: { mode: 'single', farmId: FARM_A.id },
  });

  assert.match(brief.paragraphs[0], /Bonjour Penda/i);
  assert.ok(brief.sections.length >= 6);
  assert.ok(buildDashboardVoiceBriefText(brief).length > 20);
  assert.ok(!/consolidateFinance|ERP|LLM/i.test(brief.speechText));
});

test('buildPremiumExecutiveBrief — mode démarrage', () => {
  const summary = buildDashboardSummary({});
  const brief = buildPremiumExecutiveBrief({
    displayName: 'Amadou',
    summary: { ...summary, startupMode: true },
    priorities: [],
    farmScope: { mode: 'single', farmId: FARM_A.id },
  });
  assert.match(brief.paragraphs.join(' '), /démarrage|première/i);
});

test('isSpeechSynthesisSupported — fallback sans crash', () => {
  assert.equal(typeof isSpeechSynthesisSupported(), 'boolean');
});

test('computeComparisonTrend — stable et indisponible', () => {
  assert.equal(computeComparisonTrend(10, 5).trend, 'up');
  assert.equal(computeComparisonTrend(5, 10).trend, 'down');
  assert.equal(computeComparisonTrend(0, 0).trend, 'stable');
  assert.equal(computeComparisonTrend(0, 0, { hasData: false }).trend, 'unavailable');
});

test('buildTemporalComparisons — aujourd\'hui vs hier avec activité', () => {
  const comparisons = buildTemporalComparisons({
    salesOrdersAll: [
      { id: 'O1', montant_total: 10000, date: todayStr },
      { id: 'O2', montant_total: 5000, date: yesterdayStr },
    ],
    paymentsAll: [
      { id: 'P1', montant: 8000, date_paiement: todayStr },
    ],
    transactionsAll: [
      { id: 'T1', type: 'sortie', montant: 2000, date: todayStr },
    ],
    alertes: [],
    productionLogs: [],
    stocks: [],
  }, today);

  assert.equal(comparisons.length, 3);
  const day = comparisons.find((row) => row.key === 'today');
  assert.ok(day);
  const sales = day.metrics.find((m) => m.id === 'sales');
  assert.equal(sales.current, 10000);
  assert.equal(sales.previous, 5000);
  assert.equal(sales.trend, 'up');
});

test('buildTemporalComparisons — message si données insuffisantes', () => {
  const comparisons = buildTemporalComparisons({}, today);
  assert.ok(comparisons.every((row) => row.message || row.ready === false));
});

test('buildExploitationDynamics — score explicable', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 20000, date: todayStr }],
    salesOrdersAll: [{ id: 'O1', montant_total: 20000, date: todayStr }],
    payments: [{ id: 'P1', montant: 20000, date_paiement: todayStr }],
    paymentsAll: [{ id: 'P1', montant: 20000, date_paiement: todayStr }],
    transactions: [],
    stocks: [],
  });
  const comparisons = buildTemporalComparisons({
    salesOrdersAll: [{ id: 'O1', montant_total: 20000, date: todayStr }],
    paymentsAll: [{ id: 'P1', montant: 20000, date_paiement: todayStr }],
    transactionsAll: [],
    stocks: [],
    alertes: [],
    productionLogs: [],
  }, today);
  const dynamics = buildExploitationDynamics(summary, comparisons, {});
  assert.ok(['En progression', 'Stable', 'À surveiller', 'En recul'].includes(dynamics.label));
  assert.ok(dynamics.reasons.length >= 1);
});

test('buildDashboardQuickQuestions — ferme active vs toutes fermes', () => {
  const single = buildDashboardQuickQuestions({ mode: 'single', farmId: FARM_A.id }, [FARM_A], { activeFarm: FARM_A });
  assert.ok(single.some((q) => /cette ferme/i.test(q.question)));

  const all = buildDashboardQuickQuestions({ mode: 'all' }, [FARM_A, FARM_B], { activeFarm: FARM_A });
  assert.ok(all.some((q) => /toutes les fermes|Compare/i.test(q.question)));
});

test('buildPresentationModeData — contenu investisseur', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 10000, date: todayStr }],
    salesOrdersAll: [{ id: 'O1', montant_total: 10000, date: todayStr }],
    payments: [],
    paymentsAll: [],
    transactions: [],
    stocks: [],
  });
  const presentation = buildPresentationModeData({
    displayName: 'Penda',
    summary,
    pilotage: {
      priorities: [],
      exploitation: { score: 72 },
      investor: { score: 65 },
    },
    brief: { paragraphs: ['Brief test.'] },
    comparisons: [],
    dynamics: { label: 'Stable', ready: true, reasons: ['Activité régulière'] },
    farmScope: { mode: 'single', farmId: FARM_A.id },
    activeFarm: FARM_A,
    demoMode: true,
  });

  assert.equal(presentation.farmLabel, FARM_A.name);
  assert.equal(presentation.demoMode, true);
  assert.equal(presentation.investorModule, 'objectifs_croissance');
  assert.ok(presentation.keyFigures.length >= 4);
});
