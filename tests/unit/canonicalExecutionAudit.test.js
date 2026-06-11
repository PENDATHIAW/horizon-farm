import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditSaleWorkflowBypass,
  auditPaymentWorkflowBypass,
  auditStockPurchaseBypass,
  auditEventsMissingIssueKey,
  auditSaleEventDoubleWrite,
  auditFinanceDoubleWrite,
  runCanonicalExecutionAudit,
} from '../../src/utils/canonicalExecutionAudit.js';
import {
  KPI_ENFORCEMENT_MATRIX,
  WORKFLOW_ENFORCEMENT_REPORT,
  getWorkflowEnforcementByKind,
} from '../../src/audit/canonicalExecutionRegistry.js';
import { financeIds } from '../../src/utils/sideEffectIds.js';

test('auditSaleWorkflowBypass détecte vente sans workflow', () => {
  const result = auditSaleWorkflowBypass([
    { id: 'CMD-1', montant_total: 10000, created_from: 'commercial_sale_workflow', side_effects_managed: true },
    { id: 'CMD-2', montant_total: 5000 },
  ]);
  assert.equal(result.canonicalCount, 1);
  assert.equal(result.bypassCount, 1);
  assert.equal(result.bypass[0].orderId, 'CMD-2');
});

test('auditPaymentWorkflowBypass détecte paiement hors recordSalePayment', () => {
  const result = auditPaymentWorkflowBypass([
    { id: 'PAY-1', order_id: 'CMD-1', created_from: 'record_sale_payment', side_effects_managed: true },
    { id: 'PAY-2', order_id: 'CMD-2' },
  ]);
  assert.equal(result.bypassCount, 1);
});

test('auditStockPurchaseBypass détecte finance achat stock hors workflow', () => {
  const result = auditStockPurchaseBypass([
    { id: 'FIN-1', categorie: 'Achat stock', libelle: 'Réception manuelle', montant: 1000 },
    { id: 'FIN-2', categorie: 'Achat stock', created_from: 'stock_purchase_workflow', side_effects_managed: true },
  ]);
  assert.equal(result.bypassCount, 1);
});

test('auditEventsMissingIssueKey signale events sans issue_key', () => {
  const result = auditEventsMissingIssueKey([
    { id: 'EVT-1', event_type: 'sortie_stock', module_source: 'stock', entity_id: 'STK-1' },
    { id: 'EVT-2', event_type: 'vente', issue_key: 'sale:ventes:CMD-1' },
  ]);
  assert.equal(result.missingCount, 1);
});

test('auditSaleEventDoubleWrite détecte AppContext + workflow', () => {
  const orders = [{ id: 'CMD-99' }];
  const events = [
    { id: 'EVT-A', event_type: 'vente', module_source: 'ventes', entity_id: 'CMD-99' },
    { id: 'EVT-B', event_type: 'vente_commercial_workflow', entity_id: 'CMD-99' },
  ];
  const result = auditSaleEventDoubleWrite(events, orders);
  assert.equal(result.doubleCount, 1);
});

test('auditFinanceDoubleWrite détecte double créance', () => {
  const orderId = 'CMD-DUP';
  const result = auditFinanceDoubleWrite({
    orders: [{ id: orderId, montant_total: 50000 }],
    payments: [],
    transactions: [
      { id: financeIds.receivable(orderId), order_id: orderId, statut: 'impaye', type: 'sortie' },
      { id: 'FIN-EXTRA', order_id: orderId, statut: 'impaye', type: 'sortie' },
    ],
  });
  assert.ok(result.doubleReceivableCount >= 1);
});

test('runCanonicalExecutionAudit retourne scores par domaine', () => {
  const audit = runCanonicalExecutionAudit({
    sales_orders: [{ id: 'CMD-OK', created_from: 'commercial_sale_workflow', side_effects_managed: true, montant_total: 1000 }],
    payments: [],
    finances: [],
    business_events: [],
    stock_movements: [],
  });
  assert.ok(audit.score >= 0 && audit.score <= 100);
  assert.ok(audit.domainScores.workflow);
  assert.ok(audit.domainScores.events);
  assert.ok(audit.domainScores.kpi);
  assert.ok(Array.isArray(audit.warnings));
  assert.ok(audit.kpi.matrix.length > 0);
});

test('registre WORKFLOW_ENFORCEMENT_REPORT contient bypass documentés', () => {
  const bypass = getWorkflowEnforcementByKind('bypass');
  assert.ok(bypass.length >= 2);
  assert.ok(WORKFLOW_ENFORCEMENT_REPORT.some((r) => r.workflow === 'commitCommercialSale'));
});

test('KPI_ENFORCEMENT_MATRIX — panneaux critiques listés', () => {
  const caRow = KPI_ENFORCEMENT_MATRIX.find((r) => r.kpi.includes('CA commercial'));
  assert.ok(caRow);
  assert.ok(caRow.panneauxCritiques.some((p) => p.panneau.includes('Commercial')));
});
