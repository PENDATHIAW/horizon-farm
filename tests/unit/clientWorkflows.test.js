import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClientSalesSummary,
  resolveClientReminderFollowUp,
  saleBelongsToClient,
} from '../../src/utils/clientWorkflows.js';

test('buildClientSalesSummary calcule reste à payer depuis paiements', () => {
  const client = { id: 'CLI-1', nom: 'Alpha' };
  const sales = [{ id: 'CMD-1', client_id: 'CLI-1', montant_total: 50000 }];
  const payments = [{ id: 'PAY-1', order_id: 'CMD-1', montant: 50000 }];
  const summary = buildClientSalesSummary(client, sales, payments);
  assert.equal(summary.resteAPayer, 0);
  assert.equal(summary.status, 'a_jour');
});

test('client payé ne reste pas à relancer', () => {
  const client = { id: 'CLI-2', nom: 'Beta' };
  const summary = buildClientSalesSummary(client, [{ id: 'CMD-2', client_id: 'CLI-2', montant_total: 10000 }], [{ id: 'PAY-2', order_id: 'CMD-2', montant: 10000 }]);
  assert.equal(resolveClientReminderFollowUp(client, summary)?.key, 'client_receivable:CLI-2');
});

test('saleBelongsToClient matche par client_id', () => {
  assert.ok(saleBelongsToClient({ client_id: 'CLI-1' }, { id: 'CLI-1', nom: 'Alpha' }));
});
