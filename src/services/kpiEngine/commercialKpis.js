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

/**
 * CA commercial agrégé — délégation directe sur `buildConsolidatedCommercialKpis`.
 * Garantit la même définition (devis exclus, statut annulé exclu, anti double-count paiement)
 * pour Dashboard, financeur et pilotage secondaire.
 */
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
    sources: {
      ca: 'buildConsolidatedCommercialKpis',
      collected: 'buildConsolidatedCommercialKpis',
      receivable: 'buildConsolidatedCommercialKpis',
    },
  };
}
