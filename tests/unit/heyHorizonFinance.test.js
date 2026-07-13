import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFinanceSCA, HEY_HORIZON_FINANCE_SYSTEM_PROMPT } from '../../src/services/heyHorizonFinancePrompt.js';
import {
  buildFinancePilotageAnswer,
} from '../../src/services/heyHorizonFinanceAnswers.js';

test('system prompt exporté', () => {
  assert.match(HEY_HORIZON_FINANCE_SYSTEM_PROMPT, /Hey Horizon Finance/);
  assert.match(HEY_HORIZON_FINANCE_SYSTEM_PROMPT, /cashNet/);
});

test('formatFinanceSCA — structure officielle', () => {
  const text = formatFinanceSCA({
    situation: 'Trésorerie stable.',
    cause: 'Encaissements couvrent les sorties.',
    action: 'Suivi hebdomadaire.',
    sources: ['consolidateFinance().cashNet'],
  });
  assert.match(text, /SITUATION/);
  assert.match(text, /CAUSE/);
  assert.match(text, /ACTION/);
  assert.match(text, /Source ERP/);
});

test('emprunt sans données — capacité non calculable', () => {
  const answer = buildFinancePilotageAnswer('borrow', {
    transactions: [{ id: 't1', type: 'sortie', montant: 1000, statut: 'paye' }],
  });
  assert.match(answer.situation, /non calculable/i);
});

test('trésorerie 30j sans échéancier — prévision impossible', () => {
  const answer = buildFinancePilotageAnswer('treasury_30', {
    salesOrders: [{ id: 'o1', montant_total: 10000 }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 10000 }],
  });
  assert.match(answer.situation, /Prévision impossible|projection/i);
});
