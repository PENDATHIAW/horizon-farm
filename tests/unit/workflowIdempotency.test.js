import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIdempotencyKey,
  createInFlightGuard,
  findByRecordId,
  hasOpenDedupeRecord,
  runIdempotentWorkflow,
  shouldSkipCreation,
  WORKFLOW_TYPES,
} from '../../src/utils/workflowDedupe.js';
import { financeIds, eventIds, documentIds } from '../../src/utils/sideEffectIds.js';
import { runDocumentLinkSideEffects } from '../../src/utils/documentWorkflows.js';
import { runMortalitySideEffects, runEggProductionSideEffects } from '../../src/utils/livestockSideEffects.js';
import { buildRhSalaryWorkflow, runRhPayrollSideEffects } from '../../src/utils/rhWorkflows.js';

test('purchase: deterministic finance id and idempotency key', () => {
  const financeId = financeIds.purchase('STK-1', '2026-06-01');
  const key = buildIdempotencyKey({
    workflowType: WORKFLOW_TYPES.PURCHASE,
    sourceModule: 'stock',
    sourceRecordId: 'STK-1',
    movementRef: '2026-06-01',
  });
  assert.equal(financeId, 'TRX-ACHAT-STK-1-2026-06-01');
  assert.match(key, /purchase:stock:STK-1/);
  assert.equal(shouldSkipCreation({ existingRows: [{ id: financeId }], recordId: financeId }).skip, true);
});

test('sale/payment: never duplicate finance for same payment id', () => {
  const paymentFinanceId = financeIds.paid('VEN-1', 'PAY-1');
  const key = buildIdempotencyKey({
    workflowType: WORKFLOW_TYPES.PAYMENT,
    sourceModule: 'ventes',
    sourceRecordId: 'VEN-1',
    movementRef: 'PAY-1:10000:2026-06-01:especes',
  });
  assert.equal(paymentFinanceId, 'TRX-PAY-PAY-1');
  assert.match(key, /payment:ventes:VEN-1/);
  assert.ok(findByRecordId([{ id: paymentFinanceId }], paymentFinanceId));
});

test('stock exit: deterministic movement event id', () => {
  const eventId = eventIds.stockMovement('STK-9', 'sortie:ALIM-1:2026-06-01:3');
  const key = buildIdempotencyKey({
    workflowType: WORKFLOW_TYPES.STOCK_EXIT,
    sourceModule: 'alimentation',
    sourceRecordId: 'ALIM-1',
    movementRef: '2026-06-01',
  });
  assert.match(eventId, /^EVT-STK-STK-9/);
  assert.match(key, /stock_exit:alimentation:ALIM-1/);
});

test('feeding: finance id tied to log id', () => {
  assert.equal(financeIds.feeding('ALIM-1'), 'TRX-ALIM-ALIM-1');
});

test('health/vaccin: finance id tied to health record', () => {
  assert.equal(financeIds.health('VAC-1'), 'TRX-SANTE-VAC-1');
  const key = buildIdempotencyKey({ workflowType: WORKFLOW_TYPES.HEALTH, sourceModule: 'sante', sourceRecordId: 'VAC-1' });
  assert.equal(hasOpenDedupeRecord([{ task_dedupe_key: key, status: 'a_faire' }], key), true);
});

test('mortality: duplicate business event is skipped', async () => {
  let created = 0;
  const first = await runMortalitySideEffects({
    lot: { id: 'LOT-1' },
    after: { id: 'LOT-1', name: 'Lot A' },
    delta: 2,
    businessEvents: [],
    handlers: { onCreateBusinessEvent: () => { created += 1; } },
  });
  const second = await runMortalitySideEffects({
    lot: { id: 'LOT-1' },
    after: { id: 'LOT-1', name: 'Lot A' },
    delta: 2,
    businessEvents: [first.event],
    handlers: { onCreateBusinessEvent: () => { created += 1; } },
  });
  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(first.event.id, eventIds.mortality('LOT-1', first.event.date?.slice?.(0, 10) || '', 2));
  assert.equal(created, 1);
});

test('egg production: duplicate log is skipped', async () => {
  let created = 0;
  const lot = { id: 'LOT-PO-1' };
  const payload = { date: '2026-06-01', oeufs_produits: 120 };
  const first = await runEggProductionSideEffects({
    lot,
    payload,
    existingLogs: [],
    handlers: { onCreateProduction: () => { created += 1; } },
  });
  const second = await runEggProductionSideEffects({
    lot,
    payload,
    existingLogs: [first.record],
    handlers: { onCreateProduction: () => { created += 1; } },
  });
  assert.equal(first.record.id, eventIds.eggProduction('LOT-PO-1', '2026-06-01'));
  assert.equal(second.skipped, true);
  assert.equal(created, 1);
});

test('harvest: stable finance id', () => {
  assert.equal(financeIds.cultureHarvest('CULT-1'), 'TRX-RECOLTE-CULT-1');
});

test('maintenance: stable repair finance id', () => {
  assert.equal(financeIds.equipment('EQ-1', 'repair'), 'TRX-EQP-repair-EQ-1');
});

test('payroll: duplicate payment blocked for same period', async () => {
  const person = { id: 'RH-1', nom: 'Awa', salaire_mensuel: 100000 };
  const workflow = buildRhSalaryWorkflow({ person, teams: [], amount: 100000, date: '2026-06-01' });
  let financeCreates = 0;
  const first = await runRhPayrollSideEffects({
    person,
    teams: [],
    amount: 100000,
    date: '2026-06-01',
    transactions: [],
    documents: [],
    handlers: { onCreateFinanceTransaction: () => { financeCreates += 1; } },
  });
  const second = await runRhPayrollSideEffects({
    person,
    teams: [],
    amount: 100000,
    date: '2026-06-01',
    transactions: [workflow.financeTransaction],
    documents: [],
    handlers: { onCreateFinanceTransaction: () => { financeCreates += 1; } },
  });
  assert.equal(workflow.financeTransaction.id, financeIds.payroll('RH-1', '2026-06'));
  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(financeCreates, 1);
});

test('document link: no duplicate follow-up task', async () => {
  const tx = { id: 'TRX-1', libelle: 'Achat', montant: 50000, date: '2026-06-01' };
  const doc = { id: documentIds.transactionLink('TRX-1'), title: 'Preuve', statut: 'a_joindre' };
  let taskCreates = 0;
  await runDocumentLinkSideEffects({
    transaction: tx,
    document: doc,
    tasks: [],
    alertes: [],
    existingDocuments: [],
    handlers: {
      onCreateDocument: async () => {},
      onCreateTask: async () => { taskCreates += 1; },
      onCreateAlert: async () => {},
    },
  });
  await runDocumentLinkSideEffects({
    transaction: tx,
    document: doc,
    tasks: [{ id: 'TSK-1', task_dedupe_key: `document_missing:${tx.id}`, status: 'a_faire' }],
    alertes: [],
    existingDocuments: [doc],
    handlers: {
      onCreateDocument: async () => {},
      onCreateTask: async () => { taskCreates += 1; },
      onCreateAlert: async () => {},
    },
  });
  assert.equal(taskCreates, 1);
});

test('push notification key prefers issue_key / alert_dedupe_key', async () => {
  const { appNotificationKey, alreadyNotified, markNotified } = await import('../../src/utils/appNotifications.js');
  globalThis.window = {
    localStorage: {
      store: '[]',
      getItem() { return this.store; },
      setItem(_, value) { this.store = value; },
    },
  };
  const alert = { id: 'ALT-1', alert_dedupe_key: 'stock:STK-1:critique', severity: 'critique', status: 'nouvelle' };
  assert.equal(appNotificationKey(alert), 'stock:STK-1:critique');
  markNotified(alert, { channel: 'browser_notification' });
  assert.equal(alreadyNotified(alert), true);
});

test('in-flight guard prevents double submit', async () => {
  const guard = createInFlightGuard();
  let runs = 0;
  const run = () => new Promise((resolve) => {
    runs += 1;
    setTimeout(() => resolve('ok'), 20);
  });
  const firstPromise = runIdempotentWorkflow({ idempotencyKey: 'sale:1', inFlight: guard, run });
  const second = await runIdempotentWorkflow({ idempotencyKey: 'sale:1', inFlight: guard, run });
  await firstPromise;
  assert.equal(second.skipped, true);
  assert.equal(second.reason, 'in_flight');
  assert.equal(runs, 1);
});
