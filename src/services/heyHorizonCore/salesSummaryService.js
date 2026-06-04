import { countOpenReceivables, totalOpenReceivables } from '../../utils/assistantDataMap.js';
import { isOpportunityOpen, saleAmount } from '../../modules/commercial/commercialMetrics.js';
import { arr, metaBase, money, pickRows } from './coreUtils.js';

const low = (value = '') => String(value ?? '').trim().toLowerCase();
const isCancelled = (row = {}) => ['annule', 'annulé', 'cancelled', 'canceled'].includes(low(row.statut || row.status));

/**
 * Synthèse commercial — ventes, encaissements liés, pipeline.
 */
export function getSalesSummary(dataMap = {}) {
  const salesOrders = pickRows(dataMap, 'sales_orders', 'salesOrders');
  const salesOrdersAll = pickRows(dataMap, 'salesOrdersAll', 'sales_orders', 'salesOrders');
  const payments = pickRows(dataMap, 'payments', 'paymentsAll');
  const clients = pickRows(dataMap, 'clients');
  const opportunities = pickRows(dataMap, 'sales_opportunities');

  const openOrders = salesOrders.filter((row) => !isCancelled(row));
  const openOrdersAll = salesOrdersAll.filter((row) => !isCancelled(row));
  const caPeriod = openOrders.reduce((sum, row) => sum + money(row), 0);
  const caAll = openOrdersAll.reduce((sum, row) => sum + money(row), 0);
  const collected = arr(payments).reduce((sum, row) => sum + money(row), 0);

  const openOpportunities = opportunities.filter(isOpportunityOpen);
  const pipelineTotal = openOpportunities.reduce((sum, row) => sum + saleAmount(row), 0);

  return {
    ...metaBase({ module: 'commercial' }),
    ventes: {
      commandes_periode: openOrders.length,
      commandes_total: openOrdersAll.length,
      ca_periode: caPeriod,
      ca_cumul: caAll,
      encaissements_lies: collected,
      paiements_count: payments.length,
    },
    creances: {
      montant_total: totalOpenReceivables(salesOrdersAll, payments),
      commandes_impayees: countOpenReceivables(salesOrdersAll, payments),
    },
    clients: {
      count: clients.length,
      avec_creance: clients.filter((client) => {
        const clientOrders = salesOrdersAll.filter((order) => String(order.client_id) === String(client.id));
        return totalOpenReceivables(clientOrders, payments) > 0;
      }).length,
    },
    pipeline: {
      opportunites_ouvertes: openOpportunities.length,
      montant_estime: pipelineTotal,
    },
  };
}

export default getSalesSummary;
