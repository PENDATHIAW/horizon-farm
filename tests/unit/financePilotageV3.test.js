import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdvancedMultiFarmContext,
  buildEnhancedRepaymentCapacity,
  buildFinanceAlertsV3,
  buildFinanceDataQuality,
  buildFinanceDemoPresentation,
  buildFinanceDirectExports,
  buildFinanceHeyHorizonQuestionsV3,
  buildFinancingSimulator,
  estimateMonthlyPayment,
  readFinanceSimulatorParams,
  writeFinanceSimulatorParams,
  DIRECT_FINANCE_EXPORT_KEYS,
} from '../../src/utils/financePilotageV3.js';
import { buildRepaymentCapacity } from '../../src/utils/financePilotageV2.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true, status: 'active' };
const FARM_B = { id: 'farm-b', name: 'Site Thiès', is_default: false, status: 'active' };

test('estimateMonthlyPayment — mensualité standard', () => {
  const payment = estimateMonthlyPayment({ principal: 1000000, annualRate: 12, durationMonths: 36 });
  assert.ok(payment > 30000);
  assert.ok(payment < 40000);
});

test('estimateMonthlyPayment — taux nul = capital / durée', () => {
  assert.equal(estimateMonthlyPayment({ principal: 120000, annualRate: 0, durationMonths: 12 }), 10000);
});

test('buildFinancingSimulator — prudence et comparaison cash-flow', () => {
  const simulator = buildFinancingSimulator({
    transactions: [{ id: 't1', type: 'entree', montant: 500000, statut: 'paye' }],
    salesOrders: [{ id: 'o1', montant_total: 800000, date_echeance: '2026-07-01' }],
    payments: [],
  }, { referenceDate: '2026-06-04' }, {
    loanAmount: 2000000,
    durationMonths: 36,
    annualRate: 10,
    deferMonths: 0,
    personalContribution: 500000,
  });
  assert.equal(simulator.ready, true);
  assert.ok(simulator.monthlyPayment > 0);
  assert.ok(simulator.totalCost >= 0);
  assert.ok(['low', 'medium', 'high'].includes(simulator.prudence));
  assert.match(simulator.disclaimer, /indicative/i);
});

test('buildFinancingSimulator — message si paramètres manquants', () => {
  const simulator = buildFinancingSimulator({}, {}, { loanAmount: 0 });
  assert.equal(simulator.ready, false);
  assert.match(simulator.message, /Renseignez les paramètres/i);
});

test('buildEnhancedRepaymentCapacity — DSCR avec service de dette simulé', () => {
  const capacity = buildEnhancedRepaymentCapacity({
    transactions: [{ id: 't1', type: 'entree', montant: 600000, statut: 'paye' }],
    salesOrders: [{ id: 'o1', montant_total: 1200000, montant_paye: 1200000 }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 1200000 }],
    lots: [{ id: 'l1', farm_id: FARM_A.id }],
  }, {}, {
    loanAmount: 500000,
    durationMonths: 24,
    annualRate: 8,
  });
  assert.equal(capacity.preciseEstimateAvailable, true);
  assert.ok(capacity.dscr != null);
  assert.ok(capacity.simulatedMonthlyPayment > 0);
});

test('buildEnhancedRepaymentCapacity — fallback simplifié sans prêt', () => {
  const base = buildRepaymentCapacity({
    transactions: [{ id: 't1', type: 'entree', montant: 100000, statut: 'paye' }],
  });
  const enhanced = buildEnhancedRepaymentCapacity({
    transactions: [{ id: 't1', type: 'entree', montant: 100000, statut: 'paye' }],
  }, {}, { loanAmount: 0 });
  assert.equal(enhanced.preciseEstimateAvailable, false);
  assert.ok(enhanced.capacityLabel);
  assert.equal(typeof base.ready, 'boolean');
});

test('buildFinanceDirectExports — clés exports directs', () => {
  const exports = buildFinanceDirectExports({
    transactions: [{ id: 't1', type: 'entree', montant: 50000, statut: 'paye' }],
    salesOrders: [{ id: 'o1', montant_total: 100000, date_echeance: '2026-07-01' }],
    payments: [],
  }, { periodLabel: 'Juin 2026', loanParams: { loanAmount: 1000000, durationMonths: 36, annualRate: 8 } });
  DIRECT_FINANCE_EXPORT_KEYS.forEach((key) => {
    assert.ok(exports[key], `missing export ${key}`);
    assert.ok(exports[key].module);
  });
});

test('buildFinanceDataQuality — issues explicites', () => {
  const quality = buildFinanceDataQuality({
    transactions: [
      { id: 't1', type: 'sortie', montant: 10000, statut: 'paye' },
      { id: 't2', type: 'sortie', montant: 20000, statut: 'paye' },
    ],
    salesOrders: [{ id: 'o1', montant_total: 50000 }],
    payments: [],
  });
  assert.ok(quality.issues.length >= 1);
  assert.ok(quality.summary);
  quality.issues.forEach((issue) => {
    assert.ok(issue.label);
    assert.ok(issue.detail);
  });
});

test('buildFinanceDataQuality — état vide si données propres', () => {
  const quality = buildFinanceDataQuality({
    transactions: [{ id: 't1', type: 'entree', montant: 100000, statut: 'paye', document_id: 'd1' }],
    salesOrders: [{ id: 'o1', montant_total: 100000, montant_paye: 100000, date_echeance: '2026-07-01' }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 100000 }],
    businessPlans: [{ id: 'bp1', nom: 'BP', statut: 'actif' }],
    bpFundingSources: [{ id: 'f1', business_plan_id: 'bp1', type: 'pret', montant: 500000 }],
    documents: [{ id: 'd1', title: 'Facture banque', categorie: 'finance' }, { id: 'd2', title: 'Relevé', categorie: 'banque' }],
  }, { referenceDate: '2026-06-04' });
  assert.ok(quality.score >= 80);
});

test('buildFinanceAlertsV3 — alertes financement', () => {
  const alerts = buildFinanceAlertsV3({
    transactions: [{ id: 't1', type: 'sortie', montant: 50000, statut: 'impaye', date_echeance: '2026-06-01' }],
    salesOrders: [],
    payments: [],
    fournisseurs: [],
  }, { referenceDate: '2026-06-04' }, {
    enhancedCapacity: { capacityKey: 'watch', existingMonthlyDebtService: null, loanParameters: { filled: false } },
    dataQuality: { issues: [{ id: 'financing-missing' }] },
    financing: { documentCount: 0, investmentNeed: 1000000, soughtFunding: 800000 },
  });
  assert.ok(alerts.some((a) => a.id === 'debt-service-missing' || a.id === 'repayment-watch' || a.id === 'bank-docs-missing'));
});

test('buildAdvancedMultiFarmContext — highlights et cash-flow 30j', () => {
  const ctx = buildAdvancedMultiFarmContext({
    transactions: [
      { id: 't1', farm_id: FARM_A.id, type: 'entree', montant: 200000, statut: 'paye' },
      { id: 't2', farm_id: FARM_B.id, type: 'entree', montant: 50000, statut: 'paye' },
    ],
    salesOrders: [
      { id: 'o1', farm_id: FARM_A.id, montant_total: 100000, client_nom: 'A' },
      { id: 'o2', farm_id: FARM_B.id, montant_total: 300000, client_nom: 'B' },
    ],
    payments: [],
  }, {
    accessibleFarms: [FARM_A, FARM_B],
    farmScope: { mode: 'all' },
    referenceDate: '2026-06-04',
  });
  assert.equal(ctx.singleFarm, false);
  assert.ok(ctx.advanced?.highlights?.mostProfitable);
  assert.ok(ctx.comparison.every((row) => 'cashFlow30' in row || row.cashFlow30 === null));
});

test('buildFinanceDemoPresentation — mode démo sans fausses données', () => {
  const demo = buildFinanceDemoPresentation();
  assert.equal(typeof demo.enabled, 'boolean');
  if (demo.enabled) {
    assert.equal(demo.label, 'Mode démonstration');
    assert.ok(demo.presentationTips.length >= 1);
  }
});

test('buildFinanceHeyHorizonQuestionsV3 — questions enrichies', () => {
  const questions = buildFinanceHeyHorizonQuestionsV3({ farmScope: { mode: 'all' } });
  assert.ok(questions.some((q) => q.id === 'borrow-prudent'));
  assert.ok(questions.some((q) => q.id === 'today-finance'));
  assert.ok(questions.some((q) => q.id === 'fragile-farm'));
  assert.ok(questions.length <= 8);
});

test('readFinanceSimulatorParams / writeFinanceSimulatorParams', () => {
  const written = writeFinanceSimulatorParams({
    loanAmount: 1500000,
    durationMonths: 48,
    annualRate: 9,
    deferMonths: 3,
    personalContribution: 300000,
  });
  assert.equal(written.loanAmount, 1500000);
  assert.equal(written.durationMonths, 48);
  const read = readFinanceSimulatorParams();
  assert.equal(read.loanAmount, 0);
  assert.equal(read.durationMonths, 36);
});

test('non-régression V2 — buildRepaymentCapacity inchangé', () => {
  const capacity = buildRepaymentCapacity({
    transactions: [{ id: 't1', type: 'entree', montant: 100000, statut: 'paye' }],
  });
  assert.ok(capacity.capacityLabel);
  assert.ok(capacity.explanation);
});
