export {
  saleAmount,
  collectedFromOrders,
  receivableFromOrders,
  openSalesCount,
  buildCommercialCoherenceRows,
  aggregateClientReceivables,
  buildTopClients,
  clientsWithReceivableCount,
  buildClientLedger,
  enrichCommercialOrders,
} from '../../modules/commercial/commercialMetrics.js';

import {
  collectedFromOrders,
  receivableFromOrders,
  saleAmount,
} from '../../modules/commercial/commercialMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);

/** CA commercial = sales_orders uniquement (pas payments ni finances). */
export function computeCommercialKpis(orders = [], payments = [], periodScope = {}) {
  const sales = arr(orders);
  const ca = sales.reduce((sum, row) => sum + saleAmount(row), 0);
  const collected = collectedFromOrders(sales, payments);
  const receivable = receivableFromOrders(sales, payments);
  return {
    ca,
    collected,
    receivable,
    orderCount: sales.length,
    periodScope,
    sources: { ca: 'sales_orders', collected: 'payments', receivable: 'sales_orders+payments' },
  };
}
