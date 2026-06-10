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

test('detectFinancePilotageQuery — emprunt et trésorerie', () => {
  assert.equal(detectFinancePilotageQuery('Combien puis-je emprunter ?'), 'borrow');
  assert.equal(detectFinancePilotageQuery('Ma trésorerie tiendra-t-elle 30 jours ?'), 'treasury_30');
});
