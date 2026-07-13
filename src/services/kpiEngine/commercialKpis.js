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

import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';

export function computeCommercialKpis(orders = [], payments = [], periodScope = {}, extras = {}) {
  const kpis = buildConsolidatedCommercialKpis({
    orders,
    payments,
    clients: extras.clients || [],
    deliveries: extras.deliveries || [],
    invoices: extras.invoices || [],
    periodScope,
  });
  return {
    ca: kpis.ca,
    collected: kpis.collected,
    receivable: kpis.receivable,
    orderCount: kpis.orderCount,
    periodScope,
    sources: kpis.sources,
  };
}
