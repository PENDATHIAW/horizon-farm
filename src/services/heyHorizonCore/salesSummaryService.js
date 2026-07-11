import { isOpportunityOpen, saleAmount, receivableFromOrders } from '../../modules/commercial/commercialMetrics.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { isQuoteOrder } from '../../utils/commercialQuoteWorkflow.js';
import { remainingForOrder } from '../../utils/salesStatuses.js';
import { metaBase, pickRows } from './coreUtils.js';

const low = (value = '') => String(value ?? '').trim().toLowerCase();
const isCancelled = (row = {}) => ['annule', 'annulé', 'cancelled', 'canceled'].includes(low(row.statut || row.status));

/**
 * Synthèse commercial — ventes, encaissements liés, pipeline.
 * Aligne sur `buildConsolidatedCommercialKpis` — source unique KPI Commercial/Accueil/Investisseurs.
 */
export function getSalesSummary(dataMap = {}) {
  const salesOrders = pickRows(dataMap, 'sales_orders', 'salesOrders');
  const salesOrdersAll = pickRows(dataMap, 'salesOrdersAll', 'sales_orders', 'salesOrders');
  const payments = pickRows(dataMap, 'payments', 'paymentsAll');
  const paymentsAll = pickRows(dataMap, 'paymentsAll', 'payments');
  const clients = pickRows(dataMap, 'clients');
  const opportunities = pickRows(dataMap, 'sales_opportunities');
  const deliveries = pickRows(dataMap, 'deliveries');
  const invoices = pickRows(dataMap, 'invoices');

  const kpisPeriod = buildConsolidatedCommercialKpis({
    orders: salesOrders,
    payments,
    clients,
    deliveries,
    invoices,
    periodScope: dataMap.periodScope || {},
  });
  const kpisAll = buildConsolidatedCommercialKpis({
    orders: salesOrdersAll,
    payments: paymentsAll,
    clients,
    deliveries,
    invoices,
    periodScope: {},
  });

  const salesForReceivables = salesOrdersAll
    .filter((row) => !isCancelled(row))
    .filter((row) => !isQuoteOrder(row));
  const receivableAll = receivableFromOrders(salesForReceivables, paymentsAll);
  const openOrdersImpayees = salesForReceivables.filter((row) => remainingForOrder(row, paymentsAll) > 0);

  const openOpportunities = opportunities.filter(isOpportunityOpen);
  const pipelineTotal = openOpportunities.reduce((sum, row) => sum + saleAmount(row), 0);

  return {
    ...metaBase({ module: 'commercial' }),
    ventes: {
      commandes_periode: kpisPeriod.orderCount,
      commandes_total: kpisAll.orderCount,
      ca_periode: kpisPeriod.ca,
      ca_cumul: kpisAll.ca,
      encaissements_lies: kpisAll.collected,
      encaissements_periode: kpisPeriod.collected,
      paiements_count: paymentsAll.length,
      panier_moyen: kpisAll.basketAvg,
      taux_encaissement: kpisAll.paymentRate,
    },
    creances: {
      montant_total: receivableAll,
      montant_periode: kpisPeriod.receivable,
      commandes_impayees: openOrdersImpayees.length,
    },
    clients: {
      count: clients.length,
      actifs: kpisAll.activeClients,
      nouveaux_30j: kpisAll.newClients,
      avec_creance: clients.filter((client) => {
        const clientOrders = salesForReceivables.filter((order) => String(order.client_id) === String(client.id));
        return receivableFromOrders(clientOrders, paymentsAll) > 0;
      }).length,
    },
    pipeline: {
      opportunites_ouvertes: openOpportunities.length,
      montant_estime: pipelineTotal,
    },
    consolidated_source: 'buildConsolidatedCommercialKpis',
  };
}

export default getSalesSummary;
