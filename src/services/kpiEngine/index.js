export { computeCommercialKpis } from './commercialKpis.js';
export { computeFinanceKpis } from './financeKpis.js';
export { computeStockKpis } from './stockKpis.js';
export { computeLivestockKpis } from './livestockKpis.js';
export { computeDocumentKpis } from './documentKpis.js';
export { computeRiskKpis } from './riskKpis.js';
export { computeGrowthKpis } from './growthKpis.js';
export { computeDashboardKpis, buildDashboardSummary } from './dashboardKpis.js';

import { computeCommercialKpis } from './commercialKpis.js';
import { computeFinanceKpis } from './financeKpis.js';
import { computeStockKpis } from './stockKpis.js';
import { computeLivestockKpis } from './livestockKpis.js';
import { computeDocumentKpis } from './documentKpis.js';
import { computeRiskKpis } from './riskKpis.js';
import { computeGrowthKpis } from './growthKpis.js';
import { computeDashboardKpis } from './dashboardKpis.js';

/** Point d'entrée unique KPI ERP — tous les modules enrichis doivent consommer ce moteur. */
export function runKpiEngine(data = {}, { module = 'dashboard', periodScope = {} } = {}) {
  const props = {
    salesOrders: data.sales_orders || data.salesOrders,
    salesOrdersAll: data.sales_orders_all || data.salesOrdersAll || data.sales_orders || data.salesOrders,
    payments: data.payments,
    paymentsAll: data.payments_all || data.paymentsAll || data.payments,
    transactions: data.finances || data.transactions,
    stocks: data.stock || data.stocks,
    animaux: data.animaux,
    lots: data.avicole || data.lots,
    cultures: data.cultures,
    productionLogs: data.production_oeufs_logs || data.productionLogs,
    documents: data.documents,
    invoices: data.invoices,
    alertes: data.alertes_center || data.alertes,
    taches: data.taches,
    clients: data.clients,
  };

  const common = {
    commercial: computeCommercialKpis(props.salesOrders, props.payments, periodScope),
    finance: computeFinanceKpis(props.payments, props.transactions, periodScope, data),
    stock: computeStockKpis(props.stocks),
    livestock: computeLivestockKpis({
      animaux: props.animaux,
      lots: props.lots,
      cultures: props.cultures,
      productionLogs: props.productionLogs,
      salesOrders: props.salesOrders,
      periodScope,
    }),
    documents: computeDocumentKpis(props.documents, props.transactions, props.invoices),
    risks: computeRiskKpis(data),
  };

  if (module === 'objectifs_croissance' || module === 'centre_decisionnel') {
    return { ...common, growth: computeGrowthKpis(data, periodScope) };
  }
  if (module === 'dashboard') {
    return { ...common, dashboard: computeDashboardKpis(props, periodScope) };
  }
  return common;
}
