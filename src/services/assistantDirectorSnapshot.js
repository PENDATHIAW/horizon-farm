/**
 * Snapshot exploitation - données canoniques pour moteurs dirigeant V6.1.
 */

import { consolidateFinance } from '../utils/financeConsolidationEngine.js';
import { buildFinancePilotageInput } from '../utils/financePilotageCore.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { buildObjectifsCroissanceData } from './objectifsGrowthEngine.js';
import { computeFarmHeadcount, computeCultureSummary, computeStockSummary } from '../modules/dashboard/dashboardMetrics.js';
import { buildCarnetDomainCards } from '../modules/dashboard/carnetHorizon.js';
import {  enrichCommercialOrders } from '../modules/commercial/commercialMetrics.js';
import { remainingForOrder } from '../utils/salesStatuses.js';
import { buildCommercialRelanceRows } from '../utils/commercialRelances.js';
import { buildTemporalComparisons, buildExploitationDynamics } from '../modules/dashboard/dashboardV3.js';
import { buildAutoCommercialOpportunities } from '../utils/commercialAutoOpportunities.js';
import { resolveClientDisplayName } from './assistantEntityLabels.js';
import { resolveCanonicalGoalProgress } from './assistantGoalProgress.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

export function propsFromDataMap(dataMap = {}) {
  return {
    transactionsAll: arr(dataMap.finances || dataMap.transactions),
    salesOrdersAll: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    paymentsAll: arr(dataMap.paymentsAll || dataMap.payments),
    stocks: arr(dataMap.stock || dataMap.stocks),
    animaux: arr(dataMap.animaux || dataMap.animals),
    lots: arr(dataMap.lots || dataMap.avicole),
    cultures: arr(dataMap.cultures),
    clients: arr(dataMap.clients),
    deliveries: arr(dataMap.deliveries),
    invoices: arr(dataMap.invoices),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
    productionLogs: arr(dataMap.productionLogs || dataMap.production_logs),
    alertes: arr(dataMap.alertes || dataMap.alerts),
    periodScope: dataMap.periodScope,
  };
}

export function collectTopReceivableRows(dataMap = {}, limit = 8) {
  const props = propsFromDataMap(dataMap);
  const enriched = enrichCommercialOrders(props.salesOrdersAll, {
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const ref = new Date().toISOString().slice(0, 10);
  return arr(enriched).map((order) => {
    const rest = remainingForOrder(order, props.paymentsAll);
    const due = order.date_echeance || order.due_date || order.date || '';
    const dueStr = String(due).slice(0, 10);
    const delayDays = dueStr ? Math.max(0, Math.round((new Date(ref) - new Date(dueStr)) / 86400000)) : 0;
    return {
      clientName: resolveClientDisplayName(order, props.clients),
      amount: rest,
      orderId: order.id,
      delayDays,
      clientId: order.client_id,
    };
  })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount || b.delayDays - a.delayDays)
    .slice(0, limit);
}

export function buildDirectorSnapshot(dataMap = {}) {
  const props = propsFromDataMap(dataMap);
  const finance = consolidateFinance(buildFinancePilotageInput(props));
  const commercial = buildConsolidatedCommercialKpis({
    orders: props.salesOrdersAll,
    payments: props.paymentsAll,
    clients: props.clients,
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const growth = buildObjectifsCroissanceData(props);
  const headcount = computeFarmHeadcount({
    animaux: props.animaux,
    lots: props.lots,
    cultures: props.cultures,
  });
  const cultureSummary = computeCultureSummary(props.cultures);
  const stockSummary = computeStockSummary(props.stocks);
  const carnetCards = buildCarnetDomainCards({
    dataMap,
    ...props,
    transactionsAll: props.transactionsAll,
    businessEvents: props.businessEvents,
  });
  const receivableRows = collectTopReceivableRows(dataMap);
  const relanceRows = buildCommercialRelanceRows({
    clients: props.clients,
    orders: enrichCommercialOrders(props.salesOrdersAll, { deliveries: props.deliveries, invoices: props.invoices }),
    payments: props.paymentsAll,
  });

  const goalProgress = resolveCanonicalGoalProgress(dataMap);
  const monthTarget = goalProgress.monthTarget;
  const monthRealized = goalProgress.monthRealized;
  const monthPct = goalProgress.monthPct;

  const elevageCard = arr(carnetCards).find((card) => card.id === 'elevage');
  const elevageAlerts = elevageCard?.alerts || [];

  const comparisons = buildTemporalComparisons(props);
  const summaryForDynamics = {
    ca: n(commercial.ca),
    encaisse: n(commercial.collected),
    receivable: n(commercial.receivable),
    cashNet: n(finance.cashNet),
    stockSummary,
    alertesOuvertes: elevageAlerts.length + n(stockSummary.lowStockCount),
    startupMode: false,
  };
  const dynamics = buildExploitationDynamics(summaryForDynamics, comparisons, props);
  const opportunities = buildAutoCommercialOpportunities({
    stocks: props.stocks,
    cultures: props.cultures,
    lots: props.lots,
    animaux: props.animaux,
    salesOrders: props.salesOrdersAll,
  });

  return {
    props,
    finance,
    commercial,
    growth,
    headcount,
    cultureSummary,
    stockSummary,
    carnetCards,
    receivableRows,
    relanceRows,
    monthTarget,
    monthRealized,
    monthPct,
    elevageAlerts,
    comparisons,
    dynamics,
    opportunities,
    topReceivable: receivableRows[0] || null,
    hasFarmData: n(commercial.ca) > 0
      || props.animaux.length > 0
      || props.lots.length > 0
      || props.stocks.length > 0
      || props.cultures.length > 0,
  };
}

export function hasExploitableFarmData(dataMap = {}) {
  return buildDirectorSnapshot(dataMap).hasFarmData;
}

export default {
  buildDirectorSnapshot,
  collectTopReceivableRows,
  hasExploitableFarmData,
  propsFromDataMap,
};
