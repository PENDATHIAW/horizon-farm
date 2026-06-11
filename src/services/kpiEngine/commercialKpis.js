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

/**
 * CA commercial agrégé — moteur secondaire (Dashboard / financeur).
 * @deprecated Pour le module Commercial et Hey Horizon : utiliser buildConsolidatedCommercialKpis.
 * Conservé pour dashboard période et rapports financeur — ne pas étendre.
 */
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
