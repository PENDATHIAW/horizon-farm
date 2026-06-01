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

test('client payé clôture les relances ouvertes', async () => {
  const client = { id: 'CLI-2', nom: 'Beta' };
  const key = 'client_receivable:CLI-2';
  const tasks = [{ id: 'TSK-1', task_dedupe_key: key, status: 'a_faire', related_id: 'CLI-2', title: 'Relancer Beta' }];
  const alertes = [{ id: 'ALT-1', alert_dedupe_key: key, status: 'nouvelle', entity_id: 'CLI-2' }];
  let closedTask = false;
  let closedAlert = false;
  const result = await resolveClientReminderFollowUp({
    client,
    summary: { resteAPayer: 0 },
    tasks,
    alertes,
    handlers: {
      onUpdateTask: async () => { closedTask = true; },
      onUpdateAlert: async () => { closedAlert = true; },
    },
  });
  assert.equal(result.closedTasks, 1);
  assert.equal(result.closedAlerts, 1);
  assert.ok(closedTask);
  assert.ok(closedAlert);
});

test('saleBelongsToClient matche par client_id', () => {
  assert.ok(saleBelongsToClient({ client_id: 'CLI-1' }, { id: 'CLI-1', nom: 'Alpha' }));
});
