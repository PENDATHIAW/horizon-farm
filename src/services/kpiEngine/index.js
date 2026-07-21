export { computeCommercialKpis } from './commercialKpis.js';
export { computeFinanceKpis } from './financeKpis.js';
export { computeStockKpis } from './stockKpis.js';
export { computeLivestockKpis } from './livestockKpis.js';
export { computeDocumentKpis } from './documentKpis.js';
export { computeRiskKpis } from './riskKpis.js';
export { computeGrowthKpis } from './growthKpis.js';
export { computeDashboardKpis, buildDashboardSummary } from './dashboardKpis.js';
export {
  buildCockpitCatalog,
  computeBroilerCockpit,
  computeLayerCockpit,
  computeCattleCockpit,
  computeSmallRuminantCockpit,
  computeStockCockpit,
  computeCommercialCockpit,
  computeFinanceCockpit,
} from './cockpitCatalog.js';

import { computeCommercialKpis } from './commercialKpis.js';
import { computeFinanceKpis } from './financeKpis.js';
import { computeStockKpis } from './stockKpis.js';
import { computeLivestockKpis } from './livestockKpis.js';
import { computeDocumentKpis } from './documentKpis.js';
import { computeRiskKpis } from './riskKpis.js';
import { computeGrowthKpis } from './growthKpis.js';
import { computeDashboardKpis } from './dashboardKpis.js';

export function runKpiEngine(data = {}, { module = 'dashboard', periodScope = {} } = {}) {
  const hasExplicitPeriod = periodScope?.mode === 'all'
    || Array.isArray(periodScope?.monthKeys)
    || /^\d{4}-\d{2}$/.test(String(periodScope?.monthKey || ''));
  const effectivePeriodScope = hasExplicitPeriod ? periodScope : { mode: 'all' };
  const props = {
    salesOrders: data.sales_orders || data.salesOrders,
    salesOrdersAll: data.sales_orders_all || data.salesOrdersAll || data.sales_orders || data.salesOrders,
    payments: data.payments,
    paymentsAll: data.payments_all || data.paymentsAll || data.payments,
    transactions: data.finances || data.transactions,
    transactionsAll: data.finances_all || data.transactionsAll || data.finances || data.transactions,
    stocks: data.stock || data.stocks,
    animaux: data.animaux,
    lots: data.avicole || data.lots,
    cultures: data.cultures,
    productionLogs: data.production_oeufs_logs || data.productionLogs,
    productionLogsAll: data.production_oeufs_logs_all || data.productionLogsAll || data.production_oeufs_logs || data.productionLogs,
    documents: data.documents,
    invoices: data.invoices,
    invoicesAll: data.invoices_all || data.invoicesAll || data.invoices,
    deliveries: data.deliveries,
    deliveriesAll: data.deliveries_all || data.deliveriesAll || data.deliveries,
    alertes: data.alertes_center || data.alertes,
    taches: data.taches,
    clients: data.clients,
  };
  const common = {
    commercial: computeCommercialKpis(props.salesOrdersAll, props.paymentsAll, effectivePeriodScope, {
      clients: props.clients,
      deliveries: props.deliveriesAll,
      invoices: props.invoicesAll,
    }),
    finance: computeFinanceKpis(props.paymentsAll, props.transactionsAll, effectivePeriodScope, data),
    stock: computeStockKpis(props.stocks),
    livestock: computeLivestockKpis({
      animaux: props.animaux,
      lots: props.lots,
      cultures: props.cultures,
      productionLogs: props.productionLogsAll,
      salesOrders: props.salesOrdersAll,
      periodScope: effectivePeriodScope,
    }),
    documents: computeDocumentKpis(props.documents, props.transactions, props.invoices),
    risks: computeRiskKpis(data),
  };
  if (module === 'objectifs_croissance' || module === 'centre_ia') return { ...common, growth: computeGrowthKpis(data, effectivePeriodScope) };
  if (module === 'dashboard') return { ...common, dashboard: computeDashboardKpis(props, effectivePeriodScope) };
  return common;
}
