import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STATE_FINANCE_QA,
  formatFinanceHealthScore,
  hasMinimumFinanceData,
} from '../../src/utils/financeEmptyState.js';
import { buildFinanceHealthSnapshot } from '../../src/modules/finance/financeVisionHelpers.js';
import { buildExecutiveFinancialSituation } from '../../src/utils/financePilotageV2.js';
import { buildFinanceDataQuality } from '../../src/utils/financePilotageV3.js';
import {
  detectFinancePilotageQuery,
  buildFinancePilotageAnswer,
} from '../../src/services/heyHorizonFinanceAnswers.js';

test('ferme vide — santé finance non scorée', () => {
  const snap = buildFinanceHealthSnapshot({ transactions: [], salesOrders: [], payments: [] });
  assert.equal(snap.insufficientData, true);
  assert.equal(snap.score, null);
  assert.equal(formatFinanceHealthScore({ insufficientData: true }), 'Données insuffisantes');
});

test('ferme vide — situation exécutive sans risque trésorerie', () => {
  const situation = buildExecutiveFinancialSituation({});
  assert.equal(situation.insufficientData, true);
  assert.equal(situation.treasuryRisk, null);
  assert.match(situation.priorityAction.label, /attente/i);
});

test('ferme vide — qualité données en attente', () => {
  const quality = buildFinanceDataQuality({});
  assert.equal(quality.insufficientData, true);
  assert.equal(quality.issues.length, 0);
});

test('Hey Horizon Finance — EMPTY_STATE_FINANCE_QA sur ferme vide', () => {
  assert.equal(hasMinimumFinanceData({}), false);
  const answer = buildFinancePilotageAnswer('treasury_30', {});
  assert.equal(answer.summary, EMPTY_STATE_FINANCE_QA);
  const borrow = buildFinancePilotageAnswer('borrow', {});
  assert.equal(borrow.summary, EMPTY_STATE_FINANCE_QA);
});

test('Hey Horizon Finance — format SITUATION / CAUSE / ACTION avec données', () => {
  const answer = buildFinancePilotageAnswer('summary', {
    salesOrders: [{ id: 'o1', montant_total: 80000, client_nom: 'Amadou' }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 80000 }],
  });
  assert.match(answer.summary, /^SITUATION/);
  assert.match(answer.summary, /CAUSE/);
  assert.match(answer.summary, /ACTION/);
  assert.match(answer.summary, /cashNet|creancesReelles|payablesTotal|margeReelle/);
});

test('Hey Horizon Finance — relance prioritaire', () => {
  const answer = buildFinancePilotageAnswer('receivables', {
    salesOrders: [{ id: 'V1', montant_total: 30000, client_nom: 'Fatou' }],
    payments: [],
  });
  assert.match(answer.action, /Relance prioritaire/i);
  assert.match(answer.action, /Fatou/);
});

test('Hey Horizon Finance — détection relance et collision', () => {
  assert.equal(detectFinancePilotageQuery('Génère une relance client'), 'recovery');
  assert.equal(detectFinancePilotageQuery('collision financière 90 jours'), 'collision');
});

test('detectFinancePilotageQuery — emprunt et trésorerie', () => {
  assert.equal(detectFinancePilotageQuery('Combien puis-je emprunter ?'), 'borrow');
  assert.equal(detectFinancePilotageQuery('Ma trésorerie tiendra-t-elle 30 jours ?'), 'treasury_30');
});
