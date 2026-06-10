import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditBusinessEventDuplicates,
  auditFinanceDuplicates,
  auditStockDoubleExit,
  auditTraceabilityChain,
  runErpTransversalAudit,
  IDEMPOTENCE_GUARDS,
} from '../../src/utils/erpTransversalAudit.js';
import { financeIds } from '../../src/utils/sideEffectIds.js';

test('auditBusinessEventDuplicates détecte doublon issue_key', () => {
  const events = [
    { id: 'EVT-1', event_type: 'vente', module_source: 'ventes', entity_id: 'CMD-1', issue_key: 'sale:ventes:CMD-1' },
    { id: 'EVT-2', event_type: 'vente', module_source: 'ventes', entity_id: 'CMD-1', issue_key: 'sale:ventes:CMD-1' },
  ];
  const result = auditBusinessEventDuplicates(events);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.duplicates[0].ids.length, 2);
});

test('auditFinanceDuplicates détecte même id finance', () => {
  const orderId = 'CMD-99';
  const trx = [
    { id: financeIds.receivable(orderId), type: 'sortie', montant: 50000, order_id: orderId },
    { id: financeIds.receivable(orderId), type: 'sortie', montant: 50000, order_id: orderId },
  ];
  const result = auditFinanceDuplicates(trx);
  assert.ok(result.duplicateCount >= 1);
});

test('auditStockDoubleExit détecte dedupe_key dupliqué', () => {
  const result = auditStockDoubleExit({
    stockMovements: [
      { id: 'MVT-1', dedupe_key: 'stock-mvt:sale:CMD-1:stock:STK-1', type: 'sortie' },
      { id: 'MVT-2', dedupe_key: 'stock-mvt:sale:CMD-1:stock:STK-1', type: 'sortie' },
    ],
    orders: [{ id: 'CMD-1' }],
    orderItems: [{ order_id: 'CMD-1', source_type: 'stock', source_id: 'STK-1' }],
  });
  assert.equal(result.duplicateMovementCount, 1);
});

test('auditTraceabilityChain complète pour vente crédit livrée', () => {
  const orderId = 'CMD-TRACE';
  const chain = auditTraceabilityChain({
    order: {
      id: orderId,
      montant_total: 50000,
      source_type: 'stock',
      source_id: 'STK-1',
      source_impact_applied: true,
      invoice_id: 'INV-1',
    },
    payments: [],
    transactions: [{ id: financeIds.receivable(orderId), order_id: orderId, statut: 'impaye', type: 'sortie' }],
    deliveries: [{ order_id: orderId }],
    invoices: [{ order_id: orderId }],
  });
  assert.equal(chain.complete, true);
  assert.equal(chain.steps.vente, true);
  assert.equal(chain.steps.creance, true);
  assert.equal(chain.steps.livraison, true);
  assert.equal(chain.steps.facture, true);
});

test('runErpTransversalAudit retourne score et garde idempotence', () => {
  const report = runErpTransversalAudit({
    business_events: [{ id: 'E1', event_type: 'vente', module_source: 'ventes', entity_id: 'O1' }],
    sales_orders: [{ id: 'O1', montant_total: 10000, montant_paye: 0 }],
    finances: [{ id: financeIds.receivable('O1'), order_id: 'O1', type: 'sortie', statut: 'impaye' }],
  });
  assert.ok(report.score >= 0 && report.score <= 100);
  assert.ok(Array.isArray(report.idempotenceGuards));
  assert.equal(report.idempotenceGuards.length, IDEMPOTENCE_GUARDS.length);
  assert.ok(report.eventMatrix.vente);
});
