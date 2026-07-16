/**
 * Commercial V2 - source unique KPI commerciaux (Commercial + Dashboard + Finance).
 */

import {
  saleAmount,
  collectedFromOrders,
  receivableFromOrders,
  openSalesCount,
  openPaymentCount,
  isDelivered,
  isSaleClosed,
  isCancelledPayment,
  enrichCommercialOrders,
} from '../modules/commercial/commercialMetrics.js';

import { isQuoteOrder } from './commercialQuoteWorkflow.js';
import { rowFarmId } from './farmScope.js';
import { resolvePeriodContext, rowMatchesMonthKeys } from './periodScope.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);

const lower = (value) => String(value || '').toLowerCase();



function activityOf(order = {}) {
  return lower(order.source_module || order.activite || order.source_type || 'autre');
}

function hasExplicitPeriodScope(scope = {}) {
  return scope?.mode === 'all'
    || Array.isArray(scope?.monthKeys)
    || /^\d{4}-\d{2}$/.test(String(scope?.monthKey || ''));
}

function paymentAmount(payment = {}) {
  return toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount);
}

function paymentOrderId(payment = {}) {
  return String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
}

function collectedFromPaymentsInPeriod(allSales = [], periodSales = [], payments = [], periodScope = {}) {
  const { mode, monthKeys } = resolvePeriodContext(periodScope);
  if (mode === 'all') return collectedFromOrders(periodSales, payments);

  const salesById = new Map(allSales.map((order) => [String(order.id || ''), order]));
  const paymentsByOrder = new Map();
  arr(payments)
    .filter((payment) => !isCancelledPayment(payment))
    .filter((payment) => rowMatchesMonthKeys(payment, monthKeys))
    .forEach((payment) => {
      const orderId = paymentOrderId(payment);
      if (!orderId || !salesById.has(orderId)) return;
      paymentsByOrder.set(orderId, (paymentsByOrder.get(orderId) || 0) + paymentAmount(payment));
    });

  let collected = 0;
  paymentsByOrder.forEach((value, orderId) => {
    const total = saleAmount(salesById.get(orderId));
    collected += total > 0 ? Math.min(total, value) : value;
  });

  const periodIds = new Set(periodSales.map((order) => String(order.id || '')));
  periodSales.forEach((order) => {
    const orderId = String(order.id || '');
    if (paymentsByOrder.has(orderId) || !periodIds.has(orderId)) return;
    const legacyPaid = toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
    collected += Math.min(saleAmount(order), legacyPaid);
  });
  return collected;
}

/** KPI consolidés - source officielle module Commercial. */
export function buildConsolidatedCommercialKpis({
  orders = [],
  payments = [],
  clients = [],
  deliveries = [],
  invoices = [],
  periodScope = {},
} = {}) {
  const enriched = enrichCommercialOrders(orders, { deliveries, invoices });
  const allSales = enriched.filter((o) => !isQuoteOrder(o));
  const allQuotes = enriched.filter((o) => isQuoteOrder(o));
  const explicitPeriod = hasExplicitPeriodScope(periodScope);
  const periodContext = explicitPeriod ? resolvePeriodContext(periodScope) : { mode: 'all', monthKeys: null };
  const sales = periodContext.mode === 'all'
    ? allSales
    : allSales.filter((order) => rowMatchesMonthKeys(order, periodContext.monthKeys));
  const quotes = periodContext.mode === 'all'
    ? allQuotes
    : allQuotes.filter((order) => rowMatchesMonthKeys(order, periodContext.monthKeys));


  const ca = sales.reduce((sum, o) => sum + saleAmount(o), 0);
  const collected = explicitPeriod
    ? collectedFromPaymentsInPeriod(allSales, sales, payments, periodScope)
    : collectedFromOrders(sales, payments);
  const receivable = receivableFromOrders(sales, payments);
  const openOrders = openSalesCount(sales, payments);
  const unpaidOrders = openPaymentCount(sales, payments);
  const deliveredCount = sales.filter((o) => isDelivered(o)).length;
  const closedCount = sales.filter((o) => isSaleClosed(o, payments)).length;

  const clientIds = new Set(sales.map((o) => o.client_id).filter(Boolean));
  const activeClients = clientIds.size;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const newClients = arr(clients).filter((c) => String(c.created_at || c.date_creation || '').slice(0, 10) >= thirtyDaysAgo).length;

  const basketAvg = sales.length ? ca / sales.length : 0;
  const paymentRate = ca > 0 ? Math.round((collected / ca) * 100) : null;
  const deliveryRate = sales.length ? Math.round((deliveredCount / sales.length) * 100) : null;

  const productTotals = {};
  sales.forEach((o) => {
    const key = o.product_name || o.source_label || 'Autre';
    productTotals[key] = (productTotals[key] || 0) + saleAmount(o);
  });
  const topProducts = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total }));

  const clientTotals = {};
  sales.forEach((o) => {
    const key = o.client_id || o.client_label || 'passage';
    clientTotals[key] = (clientTotals[key] || 0) + saleAmount(o);
  });
  const topClients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, total]) => ({ id, total }));

  const byFarm = {};
  sales.forEach((o) => {
    const farm = rowFarmId(o) || 'legacy';
    byFarm[farm] = (byFarm[farm] || 0) + saleAmount(o);
  });

  const byActivity = {};
  sales.forEach((o) => {
    const act = activityOf(o);
    byActivity[act] = (byActivity[act] || 0) + saleAmount(o);
  });

  return {
    ca,
    collected,
    receivable,
    openOrders,
    unpaidOrders,
    deliveredCount,
    closedCount,
    activeClients,
    newClients,
    basketAvg,
    paymentRate,
    deliveryRate,
    topProducts,
    topClients,
    byFarm,
    byActivity,
    quoteCount: quotes.length,
    openQuotes: quotes.filter((q) => !['refuse', 'converti'].includes(lower(q.quote_status || q.statut_devis))).length,
    orderCount: sales.length,
    periodScope,
    sources: {
      ca: 'sales_orders(excl.devis)',
      collected: 'payments_linked',
      receivable: 'sales_orders+payments',
    },
  };
}
