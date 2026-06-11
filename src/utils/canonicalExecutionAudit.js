/**
 * Canonical Execution Enforcement V1 — audit runtime lecture seule.
 * Vérifie workflows, events, KPI (statique), finance, stock, traçabilité.
 * Ne modifie pas consolidateFinance, buildConsolidatedCommercialKpis, summarizeSalesMargins.
 */

import {
  auditBusinessEventDuplicates,
  auditFinanceDuplicates,
  auditStockDoubleExit,
  auditTraceabilityChain,
  runErpTransversalAudit,
} from './erpTransversalAudit.js';
import {
  CANONICAL_WORKFLOW_MARKERS,
  CRITICAL_PANELS_SECONDARY_KPI,
  EVENT_ENFORCEMENT_REPORT,
  KPI_ENFORCEMENT_MATRIX,
  WORKFLOW_ENFORCEMENT_REPORT,
} from '../audit/canonicalExecutionRegistry.js';
import { financeIds } from './sideEffectIds.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();
const n = (v) => Number(v || 0);

function isCancelled(row = {}) {
  const s = lower(row.statut || row.status || '');
  return ['annule', 'annulé', 'cancelled', 'canceled'].includes(s);
}

function hasMarker(value = '', markers = []) {
  const v = lower(value);
  return markers.some((m) => v === lower(m) || v.includes(lower(m)));
}

/** Ventes sans marqueur workflow canonique ou legacy documenté. */
export function auditSaleWorkflowBypass(orders = []) {
  const bypass = [];
  const legacy = [];
  const canonical = [];

  arr(orders).forEach((order) => {
    if (!order?.id || isCancelled(order)) return;
    if (lower(order.type_document) === 'devis') return;

    const createdFrom = order.created_from || '';
    const managed = order.side_effects_managed === true;

    if (hasMarker(createdFrom, CANONICAL_WORKFLOW_MARKERS.sale)) {
      if (createdFrom === 'sale_workflow') legacy.push({ orderId: order.id, created_from: createdFrom });
      else canonical.push({ orderId: order.id, created_from: createdFrom });
      return;
    }
    if (managed) {
      bypass.push({ orderId: order.id, reason: 'side_effects_managed sans created_from workflow', created_from: createdFrom });
      return;
    }
    bypass.push({ orderId: order.id, reason: 'vente hors workflow canonique', created_from: createdFrom || null });
  });

  return {
    total: arr(orders).length,
    canonicalCount: canonical.length,
    legacyCount: legacy.length,
    bypassCount: bypass.length,
    bypass: bypass.slice(0, 40),
    legacy: legacy.slice(0, 20),
  };
}

/** Achats stock : finance créée hors commitStockPurchaseWorkflow. */
export function auditStockPurchaseBypass(transactions = []) {
  const bypass = [];

  arr(transactions).forEach((trx) => {
    const cat = lower(`${trx.categorie || ''} ${trx.libelle || ''}`);
    const isStockPurchase = /achat stock|réception stock|reception stock|purchase stock/.test(cat)
      || lower(trx.module_lie) === 'stock';
    if (!isStockPurchase) return;
    if (trx.side_effects_managed || hasMarker(trx.created_from, CANONICAL_WORKFLOW_MARKERS.stockPurchase)) return;
    bypass.push({
      id: trx.id,
      libelle: trx.libelle,
      created_from: trx.created_from || null,
      reason: 'achat stock hors commitStockPurchaseWorkflow',
    });
  });

  return { bypassCount: bypass.length, bypass: bypass.slice(0, 30) };
}

/** Paiements sans recordSalePayment. */
export function auditPaymentWorkflowBypass(payments = []) {
  const bypass = [];

  arr(payments).forEach((payment) => {
    if (!payment?.id || !payment.order_id) return;
    if (payment.side_effects_managed) return;
    if (hasMarker(payment.created_from, CANONICAL_WORKFLOW_MARKERS.payment)) return;
    bypass.push({
      paymentId: payment.id,
      orderId: payment.order_id,
      created_from: payment.created_from || null,
      reason: 'encaissement hors recordSalePayment',
    });
  });

  return { bypassCount: bypass.length, bypass: bypass.slice(0, 40) };
}

/** Events sans issue_key (écriture directe handler). */
export function auditEventsMissingIssueKey(events = []) {
  const missing = arr(events).filter((event) => !clean(event.issue_key) && !event.side_effects_managed);
  return {
    total: arr(events).length,
    missingCount: missing.length,
    missing: missing.slice(0, 30).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      module_source: e.module_source,
      entity_id: e.entity_id,
    })),
  };
}

/** Doublon vente AppContext (vente) + workflow (vente_commercial_workflow) même commande. */
export function auditSaleEventDoubleWrite(events = [], orders = []) {
  const orderIds = new Set(arr(orders).map((o) => clean(o.id)).filter(Boolean));
  const appContextVentes = new Map();
  const workflowVentes = new Map();

  arr(events).forEach((event) => {
    const entityId = clean(event.entity_id || event.linked_sale_id);
    if (!entityId || !orderIds.has(entityId)) return;
    if (event.event_type === 'vente' && lower(event.module_source) === 'ventes') {
      appContextVentes.set(entityId, event.id);
    }
    if (event.event_type === 'vente_commercial_workflow') {
      workflowVentes.set(entityId, event.id);
    }
  });

  const doubles = [];
  appContextVentes.forEach((appEvtId, orderId) => {
    if (workflowVentes.has(orderId)) {
      doubles.push({
        orderId,
        appContextEventId: appEvtId,
        workflowEventId: workflowVentes.get(orderId),
        risk: 'AppContext auto-event + workflow canonique',
      });
    }
  });

  return { doubleCount: doubles.length, doubles: doubles.slice(0, 25) };
}

/** Double créance / double encaissement finance. */
export function auditFinanceDoubleWrite({ transactions = [], payments = [], orders = [] } = {}) {
  const financeDup = auditFinanceDuplicates(transactions);
  const doubleReceivable = [];
  const doublePaid = [];

  arr(orders).forEach((order) => {
    const orderId = clean(order.id);
    if (!orderId) return;
    const receivableId = financeIds.receivable(orderId);
    const receivables = arr(transactions).filter((t) => clean(t.id) === receivableId || (clean(t.order_id) === orderId && lower(t.statut) === 'impaye'));
    if (receivables.length > 1) {
      doubleReceivable.push({ orderId, ids: receivables.map((t) => t.id) });
    }

    const orderPayments = arr(payments).filter((p) => clean(p.order_id) === orderId);
    orderPayments.forEach((payment) => {
      const paidId = financeIds.paid(orderId, payment.id);
      const paidRows = arr(transactions).filter((t) => clean(t.id) === paidId);
      if (paidRows.length > 1) {
        doublePaid.push({ orderId, paymentId: payment.id, ids: paidRows.map((t) => t.id) });
      }
    });
  });

  return {
    ...financeDup,
    doubleReceivableCount: doubleReceivable.length,
    doubleReceivable: doubleReceivable.slice(0, 20),
    doublePaidCount: doublePaid.length,
    doublePaid: doublePaid.slice(0, 20),
  };
}

/** Traçabilité vente → facture → créance → paiement. */
export function auditTraceabilityGaps({
  orders = [],
  payments = [],
  transactions = [],
  deliveries = [],
  invoices = [],
  traces = [],
} = {}) {
  const chains = arr(orders).slice(0, 80).map((order) => auditTraceabilityChain({
    order,
    payments,
    transactions,
    deliveries,
    invoices,
    traces,
  }));

  const gaps = {
    venteSansFacture: chains.filter((c) => !c.steps.facture && c.steps.vente).length,
    factureSansCreance: chains.filter((c) => c.steps.facture && !c.steps.creance && c.receivableRemaining > 0).length,
    creanceSansPaiement: chains.filter((c) => c.steps.creance && !c.steps.encaissement && c.creditPending).length,
    paiementSansCommande: arr(payments).filter((p) => !clean(p.order_id)).length,
    incomplete: chains.filter((c) => !c.complete).length,
  };

  return { chains, gaps, sampleIncomplete: chains.filter((c) => !c.complete).slice(0, 15) };
}

function scoreFromCounts(base, penalties) {
  let score = base;
  Object.entries(penalties).forEach(([weight, count]) => {
    score -= Math.min(Number(weight), n(count) * (Number(weight) / 10));
  });
  return Math.max(0, Math.round(score));
}

/**
 * Audit runtime complet — lecture seule.
 * @param {object} data — dataMap ou props module (sales_orders, payments, finances, …)
 */
export function runCanonicalExecutionAudit(data = {}) {
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const transactions = arr(data.finances || data.transactions);
  const events = arr(data.business_events || data.businessEvents);
  const stockMovements = arr(data.stock_movements || data.stockMovements);
  const orderItems = arr(data.sales_order_items || data.orderItems);
  const deliveries = arr(data.deliveries);
  const invoices = arr(data.invoices);
  const traces = arr(data.tracabilite || data.traces);

  const erpAudit = runErpTransversalAudit(data);

  const saleBypass = auditSaleWorkflowBypass(orders);
  const stockPurchaseBypass = auditStockPurchaseBypass(transactions);
  const paymentBypass = auditPaymentWorkflowBypass(payments);
  const eventsMissingKey = auditEventsMissingIssueKey(events);
  const eventDup = auditBusinessEventDuplicates(events);
  const saleEventDouble = auditSaleEventDoubleWrite(events, orders);
  const financeDouble = auditFinanceDoubleWrite({ transactions, payments, orders });
  const stockDup = auditStockDoubleExit({ stockMovements, orders, orderItems });
  const traceAudit = auditTraceabilityGaps({
    orders, payments, transactions, deliveries, invoices, traces,
  });

  const workflowBypassTotal = saleBypass.bypassCount + stockPurchaseBypass.bypassCount + paymentBypass.bypassCount;
  const staticBypass = WORKFLOW_ENFORCEMENT_REPORT.filter((r) => r.kind === 'bypass').length;
  const staticLegacy = WORKFLOW_ENFORCEMENT_REPORT.filter((r) => r.kind === 'legacy').length;

  const workflowScore = scoreFromCounts(100, {
    25: saleBypass.bypassCount,
    15: stockPurchaseBypass.bypassCount,
    15: paymentBypass.bypassCount,
    10: staticBypass,
  });

  const eventsScore = scoreFromCounts(100, {
    20: eventDup.duplicateCount,
    15: eventsMissingKey.missingCount,
    20: saleEventDouble.doubleCount,
    10: EVENT_ENFORCEMENT_REPORT.filter((r) => r.risque === 'haute' || r.risque === 'élevé').length,
  });

  const kpiSecondaryPanels = CRITICAL_PANELS_SECONDARY_KPI.length;
  const kpiScore = scoreFromCounts(100, { 8: kpiSecondaryPanels });

  const financeScore = scoreFromCounts(erpAudit.score, {
    5: financeDouble.doubleReceivableCount,
    5: financeDouble.doublePaidCount,
  });

  const stockScore = scoreFromCounts(100, {
    30: stockDup.duplicateMovementCount,
    15: stockPurchaseBypass.bypassCount,
  });

  const traceScore = scoreFromCounts(100, {
    12: traceAudit.gaps.incomplete,
    8: traceAudit.gaps.venteSansFacture,
    8: traceAudit.gaps.factureSansCreance,
    5: traceAudit.gaps.paiementSansCommande,
  });

  const domainScores = {
    workflow: workflowScore,
    events: eventsScore,
    kpi: kpiScore,
    finance: financeScore,
    stock: stockScore,
    traceabilite: traceScore,
  };

  const global = Math.round(
    Object.values(domainScores).reduce((sum, v) => sum + v, 0) / Object.keys(domainScores).length,
  );

  const warnings = [];
  if (saleBypass.bypassCount) warnings.push({ id: 'WF-SALE-BYPASS', severity: 'haute', count: saleBypass.bypassCount, detail: 'Commandes sans workflow vente canonique' });
  if (paymentBypass.bypassCount) warnings.push({ id: 'WF-PAY-BYPASS', severity: 'haute', count: paymentBypass.bypassCount, detail: 'Paiements hors recordSalePayment' });
  if (stockPurchaseBypass.bypassCount) warnings.push({ id: 'WF-STK-PURCHASE-BYPASS', severity: 'moyenne', count: stockPurchaseBypass.bypassCount, detail: 'Achats stock hors commitStockPurchaseWorkflow' });
  if (eventsMissingKey.missingCount) warnings.push({ id: 'EVT-NO-ISSUE-KEY', severity: 'moyenne', count: eventsMissingKey.missingCount, detail: 'Events sans issue_key' });
  if (saleEventDouble.doubleCount) warnings.push({ id: 'EVT-SALE-DOUBLE', severity: 'haute', count: saleEventDouble.doubleCount, detail: 'Doublon vente AppContext + workflow' });
  if (kpiSecondaryPanels) warnings.push({ id: 'KPI-SECONDARY', severity: 'moyenne', count: kpiSecondaryPanels, detail: 'Panneaux critiques sur moteur KPI secondaire' });
  if (staticLegacy) warnings.push({ id: 'WF-LEGACY-CODE', severity: 'info', count: staticLegacy, detail: 'Chemins legacy documentés (commitSaleWorkflow, commitPurchaseWorkflow)' });

  [...(erpAudit.anomalies || [])].forEach((a) => warnings.push({ ...a, source: 'erpTransversal' }));

  return {
    score: global,
    domainScores,
    workflow: {
      saleBypass,
      stockPurchaseBypass,
      paymentBypass,
      staticReport: {
        canonical: WORKFLOW_ENFORCEMENT_REPORT.filter((r) => r.kind === 'canonical').length,
        legacy: staticLegacy,
        bypass: staticBypass,
        parallel: WORKFLOW_ENFORCEMENT_REPORT.filter((r) => r.kind === 'parallel').length,
      },
    },
    events: {
      missingIssueKey: eventsMissingKey,
      duplicates: eventDup,
      saleDoubleWrite: saleEventDouble,
      enforcementReport: EVENT_ENFORCEMENT_REPORT,
    },
    kpi: {
      matrix: KPI_ENFORCEMENT_MATRIX,
      criticalSecondaryPanels: CRITICAL_PANELS_SECONDARY_KPI,
    },
    finance: financeDouble,
    stock: stockDup,
    traceability: traceAudit,
    erpTransversal: erpAudit,
    warnings,
    totals: {
      orders: orders.length,
      payments: payments.length,
      transactions: transactions.length,
      events: events.length,
      movements: stockMovements.length,
    },
  };
}
