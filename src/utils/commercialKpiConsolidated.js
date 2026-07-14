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
  enrichCommercialOrders,
} from '../modules/commercial/commercialMetrics.js';

import { isQuoteOrder } from './commercialQuoteWorkflow.js';
import { rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);

const lower = (value) => String(value || '').toLowerCase();



function activityOf(order = {}) {
  return lower(order.source_module || order.activite || order.source_type || 'autre');
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
  const sales = enriched.filter((o) => !isQuoteOrder(o));
  const quotes = enriched.filter((o) => isQuoteOrder(o));


  const ca = sales.reduce((sum, o) => sum + saleAmount(o), 0);
  const collected = collectedFromOrders(sales, payments);
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
