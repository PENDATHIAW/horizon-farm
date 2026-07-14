/**
 * Audit ERP transversal V1 - business_events, finance, stock, traçabilité.
 * Lecture seule - ne recalcule pas les vérités canoniques.
 */

import { findDuplicateFinanceTransaction } from './financeTransactionMeta.js';
import { financeIds } from './sideEffectIds.js';
import { remainingForOrder } from './salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();
function eventKey(event = {}) {
  return clean(event.issue_key)
    || `${lower(event.event_type)}:${lower(event.module_source)}:${clean(event.entity_id)}:${clean(event.source_record_id)}`;
}

/** Doublons business_events (issue_key ou clé composite). */
export function auditBusinessEventDuplicates(events = []) {
  const seen = new Map();
  const duplicates = [];

  arr(events).forEach((event) => {
    const key = eventKey(event);
    if (!key) return;
    const prev = seen.get(key);
    if (prev) {
      duplicates.push({
        key,
        ids: [prev.id, event.id],
        event_type: event.event_type,
        module_source: event.module_source,
        entity_id: event.entity_id,
        title: event.title,
      });
    } else {
      seen.set(key, event);
    }
  });

  return {
    total: arr(events).length,
    uniqueKeys: seen.size,
    duplicateCount: duplicates.length,
    duplicates,
  };
}

/** Double écriture finance (id déterministe, issue_key, source+type). */
export function auditFinanceDuplicates(transactions = []) {
  const byId = new Map();
  const duplicates = [];

  arr(transactions).forEach((trx) => {
    const id = clean(trx.id);
    if (id && byId.has(id)) {
      duplicates.push({ kind: 'same_id', id, count: 2, libelle: trx.libelle });
      return;
    }
    if (id) byId.set(id, trx);
  });

  arr(transactions).forEach((trx, index, list) => {
    const dup = findDuplicateFinanceTransaction(trx, list.filter((_, i) => i !== index));
    if (dup && clean(dup.id) !== clean(trx.id)) {
      duplicates.push({
        kind: 'semantic_duplicate',
        id: trx.id,
        duplicateOf: dup.id,
        issue_key: trx.issue_key,
        source_module: trx.source_module,
        source_record_id: trx.source_record_id,
      });
    }
  });

  const paidWithoutOrder = arr(transactions).filter((trx) => {
    const cat = lower(`${trx.categorie || ''} ${trx.libelle || ''}`);
    return lower(trx.type) === 'entree' && /vente|encaissement|creance/.test(cat)
      && !trx.order_id && !trx.vente_id && !trx.related_id;
  });

  return {
    total: arr(transactions).length,
    duplicateRows: duplicates,
    duplicateCount: duplicates.length,
    orphanSaleFinance: paidWithoutOrder.slice(0, 20),
  };
}

/** Double sortie stock (dedupe_key mouvements). */
export function auditStockDoubleExit({
  stockMovements = [],
  orders = [],
  orderItems = [],
} = {}) {
  const byDedupe = new Map();
  const duplicateMovements = [];

  arr(stockMovements).forEach((mvt) => {
    const key = clean(mvt.dedupe_key || mvt.movement_ref || mvt.id);
    if (!key) return;
    if (byDedupe.has(key)) {
      duplicateMovements.push({ dedupe_key: key, ids: [byDedupe.get(key).id, mvt.id] });
    } else {
      byDedupe.set(key, mvt);
    }
  });

  const saleStockKeys = new Set();
  arr(orders).forEach((order) => {
    const orderId = clean(order.id);
    arr(orderItems).filter((it) => clean(it.order_id) === orderId).forEach((item) => {
      if (item.source_type === 'stock' && item.source_id) {
        saleStockKeys.add(`sale:${orderId}:stock:${item.source_id}`);
      }
    });
    if (order.source_type === 'stock' && order.source_id) {
      saleStockKeys.add(`sale:${orderId}:stock:${clean(order.source_id)}`);
    }
  });

  const exitsWithoutSale = arr(stockMovements).filter((mvt) => {
    const ref = clean(mvt.movement_ref || mvt.dedupe_key || '');
    return lower(mvt.type || mvt.movement_type || '').includes('sortie')
      && ref.includes('sale:')
      && !saleStockKeys.has(ref.replace('stock-mvt:', ''));
  });

  return {
    movementCount: arr(stockMovements).length,
    duplicateMovementCount: duplicateMovements.length,
    duplicateMovements: duplicateMovements.slice(0, 30),
    orphanSaleMovements: exitsWithoutSale.slice(0, 15),
  };
}

/** Chaîne traçabilité Lot → Stock → Vente → Livraison → Facture → Créance → Encaissement. */
export function auditTraceabilityChain({
  order = {},
  payments = [],
  transactions = [],
  deliveries = [],
  invoices = [],
  traces = [],
} = {}) {
  const orderId = clean(order.id);
  const sourceType = lower(order.source_type);
  const steps = {
    lot: Boolean(sourceType === 'lot_avicole' && order.source_id),
    stock: Boolean(sourceType === 'stock' && order.source_id) || Boolean(clean(order.source_impact_applied)),
    vente: Boolean(orderId),
    livraison: arr(deliveries).some((d) => clean(d.order_id) === orderId),
    facture: arr(invoices).some((i) => clean(i.order_id) === orderId) || Boolean(order.invoice_id || order.facture_id),
    creance: arr(transactions).some((t) => clean(t.id) === financeIds.receivable(orderId) || (clean(t.order_id) === orderId && lower(t.statut) === 'impaye')),
    encaissement: arr(payments).some((p) => clean(p.order_id) === orderId),
    reconciliation: arr(transactions).some((t) => clean(t.order_id) === orderId && lower(t.type) === 'entree'),
  };

  const trace = arr(traces).find((row) => {
    const etapes = arr(row.etapes);
    return etapes.some((e) => clean(e.order_id) === orderId)
      || clean(row.last_sale_id) === orderId;
  });

  const rest = remainingForOrder(order, payments);
  const optionalWhenCredit = rest > 0 ? ['encaissement', 'reconciliation'] : [];
  const optionalBySource = sourceType === 'lot_avicole' ? [] : ['lot'];
  if (sourceType !== 'stock' && !clean(order.source_impact_applied)) optionalBySource.push('stock');
  const missing = Object.entries(steps)
    .filter(([key, ok]) => !ok && !optionalWhenCredit.includes(key) && !optionalBySource.includes(key))
    .map(([k]) => k);
  if (rest > 0 && !steps.creance) missing.push('creance_expected');

  return {
    orderId,
    steps,
    traceLinked: Boolean(trace),
    traceId: trace?.id || null,
    complete: missing.length === 0,
    missing,
    receivableRemaining: rest,
    creditPending: rest > 0,
  };
}

/** Matrice event_type × module_source. */
export function buildBusinessEventMatrix(events = []) {
  const matrix = {};
  arr(events).forEach((event) => {
    const type = event.event_type || 'autre';
    const module = event.module_source || event.source_module || 'unknown';
    if (!matrix[type]) matrix[type] = {};
    matrix[type][module] = (matrix[type][module] || 0) + 1;
  });
  return matrix;
}

/** Idempotence guards présents dans le code (référence statique). */
export const IDEMPOTENCE_GUARDS = [
  { domain: 'finance_encaissement', guard: 'financeIds.paid(orderId, paymentId)', file: 'saleSideEffects.js' },
  { domain: 'finance_creance', guard: 'financeIds.receivable(orderId)', file: 'saleSideEffects.js' },
  { domain: 'stock_mouvement', guard: 'movementAlreadyExists(dedupe_key)', file: 'stockMovementHelpers.js' },
  { domain: 'stock_ligne_vente', guard: 'source_impact_applied per line', file: 'saleSideEffects.js' },
  { domain: 'finance_manual', guard: 'findDuplicateFinanceTransaction', file: 'financeTransactionMeta.js' },
  { domain: 'business_event', guard: 'issue_key + findDuplicateBusinessEvent', file: 'businessEventsService.js' },
  { domain: 'trace_vente', guard: 'order_id + event_type vente in etapes', file: 'erpInterconnectionEngine.js' },
  { domain: 'culture_recolte_commercial', guard: 'shouldSkipHarvestFinanceForCommercialPath', file: 'cultureSideEffects.js' },
];

export function runErpTransversalAudit(data = {}) {
  const events = arr(data.business_events || data.businessEvents);
  const transactions = arr(data.finances || data.transactions);
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const deliveries = arr(data.deliveries);
  const invoices = arr(data.invoices);
  const stockMovements = arr(data.stock_movements || data.stockMovements);
  const orderItems = arr(data.sales_order_items || data.orderItems);
  const traces = arr(data.tracabilite || data.traces);

  const eventDup = auditBusinessEventDuplicates(events);
  const financeDup = auditFinanceDuplicates(transactions);
  const stockDup = auditStockDoubleExit({ stockMovements, orders, orderItems });

  const traceChains = orders.slice(0, 50).map((order) => auditTraceabilityChain({
    order,
    payments,
    transactions,
    deliveries,
    invoices,
    traces,
  }));

  const incompleteTraces = traceChains.filter((c) => !c.complete);

  let score = 100;
  score -= Math.min(25, eventDup.duplicateCount * 3);
  score -= Math.min(25, financeDup.duplicateCount * 4);
  score -= Math.min(20, stockDup.duplicateMovementCount * 4);
  score -= Math.min(15, incompleteTraces.length * 2);

  const anomalies = [];
  if (eventDup.duplicateCount) anomalies.push({ id: 'EVT-DUP', severity: 'moyenne', count: eventDup.duplicateCount, detail: 'Doublons business_events (issue_key)' });
  if (financeDup.duplicateCount) anomalies.push({ id: 'FIN-DUP', severity: 'haute', count: financeDup.duplicateCount, detail: 'Double écriture finance' });
  if (stockDup.duplicateMovementCount) anomalies.push({ id: 'STK-DUP', severity: 'haute', count: stockDup.duplicateMovementCount, detail: 'Double mouvement stock (dedupe_key)' });
  if (incompleteTraces.length) anomalies.push({ id: 'TRACE-INCOMPLETE', severity: 'moyenne', count: incompleteTraces.length, detail: 'Chaînes traçabilité incomplètes' });
  if (financeDup.orphanSaleFinance.length) anomalies.push({ id: 'FIN-ORPHAN', severity: 'moyenne', count: financeDup.orphanSaleFinance.length, detail: 'Finance vente sans order_id' });

  return {
    score: Math.max(0, Math.round(score)),
    eventDuplicates: eventDup,
    financeDuplicates: financeDup,
    stockDuplicates: stockDup,
    traceChains,
    incompleteTraceCount: incompleteTraces.length,
    eventMatrix: buildBusinessEventMatrix(events),
    idempotenceGuards: IDEMPOTENCE_GUARDS,
    anomalies,
    totals: {
      events: events.length,
      transactions: transactions.length,
      orders: orders.length,
      movements: stockMovements.length,
    },
  };
}
