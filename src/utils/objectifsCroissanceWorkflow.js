import { computeFinancePeriodSummary } from '../modules/dashboard/dashboardMetrics.js';
import { buildConsolidatedCommercialKpis } from './commercialKpiConsolidated.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;

export {
  OBJECTIFS_NAV_TARGETS,
  buildObjectifsIssueKey,
  navigateObjectifsTarget,
  resolveObjectifsNavigation,
} from './objectifsCroissanceNavigation.js';

/**
 * KPI finance partagés - sources uniques :
 *  - CA / encaissements ventes / créances : `buildConsolidatedCommercialKpis` (Commercial canon)
 *  - dépenses / trésorerie brute : `computeFinancePeriodSummary` (finances transactions)
 * Garantit la cohérence des chiffres Accueil / Commercial / Finance / Objectifs / Vision.
 */
export function computeSharedPilotageFinanceKpis({
  salesOrders = [],
  salesOrdersAll = [],
  payments = [],
  paymentsAll = [],
  transactions = [],
  clients = [],
  deliveries = [],
  invoices = [],
  periodScope = {},
  periodFiltered = false,
} = {}) {
  const salesPeriod = arr(salesOrders);
  const salesAll = arr(salesOrdersAll).length ? arr(salesOrdersAll) : salesPeriod;
  const payPeriod = arr(payments);
  const payAll = arr(paymentsAll).length ? arr(paymentsAll) : payPeriod;
  const tx = arr(transactions);
  const financePeriods = computeFinancePeriodSummary(payPeriod, tx, periodScope);
  const kpisAll = buildConsolidatedCommercialKpis({
    orders: salesAll,
    payments: payAll,
    clients,
    deliveries,
    invoices,
    periodScope: {},
  });
  const kpisPeriod = buildConsolidatedCommercialKpis({
    orders: salesPeriod,
    payments: payPeriod,
    clients,
    deliveries,
    invoices,
    periodScope,
  });
  const receivable = kpisAll.receivable;
  const salesAmount = periodFiltered ? kpisPeriod.ca : kpisAll.ca;
  const encaisseVentes = periodFiltered ? kpisPeriod.collected : kpisAll.collected;
  const encaisseTreasury = periodFiltered ? financePeriods.encaissePeriod : financePeriods.encaisseAllTime;
  const encaisse = Math.max(n(encaisseVentes), n(encaisseTreasury));
  const treasuryResult = periodFiltered ? financePeriods.resultatPeriod : financePeriods.resultatAllTime;
  const expenses = periodFiltered ? financePeriods.depensesPeriod : financePeriods.depensesAllTime;

  return {
    financePeriods,
    receivable,
    salesAmount,
    encaisse,
    encaisseVentes,
    encaisseTreasury,
    treasuryResult,
    expenses,
    grossMargin: encaisse - expenses,
    kpisAll,
    kpisPeriod,
    source: 'buildConsolidatedCommercialKpis+computeFinancePeriodSummary',
  };
}

export function comparePilotageKpis(visionKpis = {}, sharedKpis = {}, tolerance = 1) {
  const gaps = [];
  const pairs = [
    ['receivable', 'receivable', 'Créances'],
    ['treasuryResult', 'treasuryResult', 'Résultat trésorerie'],
    ['salesAmount', 'salesAmount', 'Chiffre d\'affaires'],
    ['encaisseDisplay', 'encaisse', 'Encaissements'],
    ['collected', 'encaisse', 'Encaissements (collected)'],
  ];

  pairs.forEach(([visionKey, sharedKey, label]) => {
    const left = n(visionKpis[visionKey]);
    const right = n(sharedKpis[sharedKey]);
    if (Math.abs(left - right) > tolerance) {
      gaps.push({
        id: `kpi-${visionKey}`,
        type: 'KPI divergent',
        label,
        visionValue: left,
        sharedValue: right,
        severity: 'warning',
      });
    }
  });

  return gaps;
}
