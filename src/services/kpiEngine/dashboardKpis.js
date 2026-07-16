import { buildDashboardSummary } from '../../modules/dashboard/dashboardMetrics.js';
import { computeCommercialKpis } from './commercialKpis.js';
import { computeFinanceKpis } from './financeKpis.js';
import { computeStockKpis } from './stockKpis.js';
import { computeLivestockKpis } from './livestockKpis.js';
import { computeDocumentKpis } from './documentKpis.js';

export function computeDashboardKpis(props = {}, periodScope = {}) {
  const summary = buildDashboardSummary(props, periodScope);
  const commercial = computeCommercialKpis(props.salesOrdersAll || props.salesOrders, props.paymentsAll || props.payments, periodScope, {
    clients: props.clients,
    deliveries: props.deliveriesAll || props.deliveries,
    invoices: props.invoicesAll || props.invoices,
  });
  const finance = computeFinanceKpis(props.paymentsAll || props.payments, props.transactionsAll || props.transactions, periodScope, props);
  const stock = computeStockKpis(props.stocks);
  const livestock = computeLivestockKpis({
    animaux: props.animaux,
    lots: props.lotsData || props.lots,
    cultures: props.cultures,
    productionLogs: props.productionLogsAll || props.productionLogs,
    salesOrders: props.salesOrdersAll || props.salesOrders,
    periodScope,
  });
  const documents = computeDocumentKpis(props.documents, props.transactions, props.invoices);

  return {
    ...summary,
    engines: { commercial, finance, stock, livestock, documents },
    priorities: summary.actions || [],
    sources: {
      ca: 'sales_orders',
      encaissements: 'payments',
      resultat: 'payments-finances',
      ponte: 'production_oeufs_logs',
      stock: 'stock',
    },
  };
}

export { buildDashboardSummary };
