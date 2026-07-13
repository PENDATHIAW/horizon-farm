import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agingBucketForDate,
  buildCashFlowForecast,
  buildExecutiveFinancialSituation,
  buildFinanceExportPayload,
  buildFinanceHeyHorizonQuestions,
  buildFinanceReconciliationView,
  buildFinanceSmartAlerts,
  buildFinanceStartupJourneyV2,
  buildFinancingView,
  buildMultiFarmFinanceContext,
  buildPayablesAging,
  buildReceivablesAging,
  buildRepaymentCapacity,
  AGING_BUCKET_KEYS,
} from '../../src/utils/financePilotageV2.js';
import { FINANCE_TABS, resolveFinanceTab } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true, status: 'active' };
const FARM_B = { id: 'farm-b', name: 'Site Thiès', is_default: false, status: 'active' };

const baseProps = {
  transactions: [
    { id: 't1', type: 'entree', montant: 200000, statut: 'paye' },
    { id: 't2', type: 'sortie', montant: 80000, statut: 'impaye', date_echeance: '2026-05-01', libelle: 'Charge retard' },
  ],
  salesOrders: [
    { id: 'o1', farm_id: FARM_A.id, montant_total: 120000, montant_paye: 0, date_echeance: '2026-05-10', client_nom: 'Client A' },
    { id: 'o2', farm_id: FARM_B.id, montant_total: 50000, client_nom: 'Client B', date: '2026-03-01' },
  ],
  payments: [],
  fournisseurs: [{ id: 'f1', nom: 'Provende', dettes: 25000 }],
};

test('agingBucketForDate — buckets standard', () => {
  const ref = new Date('2026-06-04');
  assert.equal(agingBucketForDate(new Date('2026-06-10'), ref), 'not_due');
  assert.equal(agingBucketForDate(new Date('2026-06-01'), ref), 'days_0_7');
  assert.equal(agingBucketForDate(new Date('2026-05-10'), ref), 'days_8_30');
  assert.equal(agingBucketForDate(new Date('2026-04-20'), ref), 'days_31_60');
  assert.equal(agingBucketForDate(new Date('2026-01-01'), ref), 'days_60_plus');
});

test('buildReceivablesAging — montants, count et ferme', () => {
  const aging = buildReceivablesAging(baseProps, {
    accessibleFarms: [FARM_A, FARM_B],
    referenceDate: '2026-06-04',
  });
  assert.equal(aging.kind, 'receivables');
  assert.ok(aging.total >= 170000);
  assert.ok(aging.count >= 2);
  assert.ok(AGING_BUCKET_KEYS.every((key) => aging.buckets[key]));
  const farmBItem = Object.values(aging.buckets).flatMap((b) => b.items).find((item) => item.title === 'Client B');
  assert.equal(farmBItem?.farmLabel, FARM_B.name);
});

test('buildPayablesAging — dettes fournisseurs et charges impayées', () => {
  const aging = buildPayablesAging(baseProps, { referenceDate: '2026-06-04' });
  assert.equal(aging.kind, 'payables');
  assert.ok(aging.total >= 105000);
  assert.ok(aging.buckets.not_due.count >= 1);
});

test('buildExecutiveFinancialSituation — vue dirigeant', () => {
  const view = buildExecutiveFinancialSituation(baseProps, { referenceDate: '2026-06-04' });
  assert.ok(typeof view.treasuryAvailable === 'number');
  assert.ok(typeof view.receivables === 'number');
  assert.ok(typeof view.payables === 'number');
  assert.ok(view.priorityAction?.label);
  assert.ok(typeof view.isProfitable === 'boolean');
});

test('buildCashFlowForecast — projections 30/60/90', () => {
  const forecast = buildCashFlowForecast(baseProps, { referenceDate: '2026-06-04' });
  assert.equal(forecast.ready, true);
  assert.ok(typeof forecast.projection30 === 'number');
  assert.ok(typeof forecast.projection60 === 'number');
  assert.ok(typeof forecast.projection90 === 'number');
  assert.ok(['low', 'medium', 'high'].includes(forecast.risk));
});

test('buildCashFlowForecast — message si données insuffisantes', () => {
  const forecast = buildCashFlowForecast({}, { referenceDate: '2026-06-04' });
  assert.equal(forecast.ready, false);
  assert.match(forecast.message, /Prévision disponible/i);
});

test('buildRepaymentCapacity — capacité et DSCR si service dette', () => {
  const capacity = buildRepaymentCapacity({
    ...baseProps,
    salesOrders: [{ id: 'o1', montant_total: 500000 }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 500000 }],
    bpRecurringCosts: [{ libelle: 'Remboursement prêt', montant_mensuel: 50000 }],
  }, { referenceDate: '2026-06-04' });
  assert.equal(capacity.ready, true);
  assert.ok(capacity.capacityLabel);
  assert.ok(capacity.dscr != null || capacity.capacityKey);
});

test('buildFinancingView — reprise BP sans double saisie', () => {
  const view = buildFinancingView({
    businessPlans: [{ id: 'bp1', nom: 'BP 2026', statut: 'actif' }],
    bpInvestmentLines: [{ id: 'l1', business_plan_id: 'bp1', designation: 'Poulailler', montant: 3000000 }],
    bpFundingSources: [
      { id: 'fs1', business_plan_id: 'bp1', type: 'apport', montant: 500000 },
      { id: 'fs2', business_plan_id: 'bp1', type: 'pret', montant: 2500000 },
    ],
    bpRecurringCosts: [{ id: 'c1', business_plan_id: 'bp1', montant_mensuel: 400000 }],
  });
  assert.equal(view.planName, 'BP 2026');
  assert.equal(view.investmentNeed, 3000000);
  assert.equal(view.personalContribution, 500000);
  assert.equal(view.soughtFunding, 2500000);
});

test('buildFinanceReconciliationView — anomalies lisibles', () => {
  const view = buildFinanceReconciliationView({
    transactions: [{ id: 't1', type: 'entree', montant: 10000, order_id: 'o-missing', libelle: 'Vente client' }],
    payments: [],
    salesOrders: [{ id: 'o-missing', montant_total: 10000 }],
    tasks: [],
  });
  assert.ok(Array.isArray(view.anomalies));
  assert.ok(view.anomalies.every((row) => row.recommendedAction));
});

test('buildMultiFarmFinanceContext — mode toutes les fermes', () => {
  const ctx = buildMultiFarmFinanceContext(baseProps, {
    accessibleFarms: [FARM_A, FARM_B],
    farmScope: { mode: 'all' },
    referenceDate: '2026-06-04',
  });
  assert.equal(ctx.singleFarm, false);
  assert.equal(ctx.comparison.length, 2);
  assert.ok(ctx.comparison.every((row) => row.farmName && typeof row.treasury === 'number'));
});

test('buildMultiFarmFinanceContext — mode ferme active', () => {
  const ctx = buildMultiFarmFinanceContext(baseProps, {
    accessibleFarms: [FARM_A, FARM_B],
    farmScope: { mode: 'single', farmId: FARM_A.id },
  });
  assert.equal(ctx.singleFarm, true);
  assert.equal(ctx.comparison.length, 0);
});

test('buildFinanceStartupJourneyV2 — 7 étapes avec progression', () => {
  const journey = buildFinanceStartupJourneyV2({});
  assert.equal(journey.total, 7);
  assert.ok(journey.nextStep);
  assert.ok(journey.progressPct >= 0);

  const done = buildFinanceStartupJourneyV2({
    transactions: [{ id: 't1', type: 'sortie', montant: 1000 }],
    salesOrders: [{ id: 'o1', montant_total: 2000 }],
    payments: [{ id: 'p1', montant: 2000 }],
    businessPlans: [{ id: 'bp1' }],
  });
  assert.ok(done.completed >= 4);
});

test('buildFinanceSmartAlerts — alertes actionnables', () => {
  const alerts = buildFinanceSmartAlerts({
    transactions: [
      { id: 't1', type: 'sortie', montant: 10000 },
      { id: 't2', type: 'sortie', montant: 20000 },
      { id: 't3', type: 'sortie', montant: 30000 },
    ],
    salesOrders: [
      { id: 'o1', montant_total: 100000, date: '2026-03-01', client_nom: 'A' },
      { id: 'o2', montant_total: 80000, date: '2026-02-01', client_nom: 'B' },
    ],
    payments: [],
  }, { referenceDate: '2026-06-04' });
  assert.ok(Array.isArray(alerts));
  assert.ok(alerts.every((alert) => alert.message && alert.tab));
});

test('buildFinanceExportPayload — exports réutilisables', () => {
  const payload = buildFinanceExportPayload(baseProps, { periodLabel: 'Juin 2026' });
  assert.ok(payload.synthesis?.extra);
  assert.ok(payload.schedule?.extra);
  assert.ok(payload.repayment?.extra);
  assert.ok(payload.financing?.extra);
});

test('buildFinanceHeyHorizonQuestions — questions multi-fermes', () => {
  const mono = buildFinanceHeyHorizonQuestions({ farmScope: { mode: 'single' } });
  const multi = buildFinanceHeyHorizonQuestions({ farmScope: { mode: 'all' } });
  assert.ok(mono.length >= 5);
  assert.ok(multi.length > mono.length);
});

test('resolveFinanceTab — aliases Financement et Réconciliation vers les vues dédiées', () => {
  assert.equal(resolveFinanceTab('Financement'), 'Budget & écarts finance');
  assert.equal(resolveFinanceTab('Réconciliation'), 'Trésorerie finance');
  assert.ok(FINANCE_TABS.includes('Pilotage'));
  assert.ok(MODULE_TARGET_TABS.finance_pilotage.includes('Trésorerie'));
});

test('non-régression — lignes sans farm_id visibles en aging', () => {
  const aging = buildReceivablesAging({
    salesOrders: [{ id: 'o1', montant_total: 10000, client_nom: 'Legacy' }],
    payments: [],
  }, { accessibleFarms: [FARM_A, FARM_B] });
  assert.equal(aging.count, 1);
  assert.ok(aging.buckets.not_due.items[0]?.farmLabel);
});
