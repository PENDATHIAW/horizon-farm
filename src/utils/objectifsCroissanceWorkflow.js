import { remainingForOrder } from './salesStatuses.js';
import { computeFinancePeriodSummary } from '../modules/dashboard/dashboardMetrics.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const money = (row = {}) => n(row?.montant ?? row?.amount ?? row?.total ?? row?.montant_total ?? 0);

export {
  OBJECTIFS_NAV_TARGETS,
  buildObjectifsIssueKey,
  navigateObjectifsTarget,
  resolveObjectifsNavigation,
} from './objectifsCroissanceNavigation.js';

/** KPI finance partagés — mêmes sources que Accueil et Finance & Pilotage. */
export function computeSharedPilotageFinanceKpis({
  salesOrders = [],
  salesOrdersAll = [],
  payments = [],
  paymentsAll = [],
  transactions = [],
  periodScope = {},
  periodFiltered = false,
} = {}) {
  const salesPeriod = arr(salesOrders);
  const salesAll = arr(salesOrdersAll).length ? arr(salesOrdersAll) : salesPeriod;
  const payPeriod = arr(payments);
  const payAll = arr(paymentsAll).length ? arr(paymentsAll) : payPeriod;
  const tx = arr(transactions);
  const financePeriods = computeFinancePeriodSummary(payPeriod, tx, periodScope);
  const receivable = salesAll.reduce((sum, order) => sum + remainingForOrder(order, payAll), 0);
  const salesAmount = (periodFiltered ? salesPeriod : salesAll).reduce((sum, row) => sum + money(row), 0);
  const encaisse = periodFiltered ? financePeriods.encaissePeriod : financePeriods.encaisseAllTime;
  const treasuryResult = periodFiltered ? financePeriods.resultatPeriod : financePeriods.resultatAllTime;
  const expenses = periodFiltered ? financePeriods.depensesPeriod : financePeriods.depensesAllTime;

  return {
    financePeriods,
    receivable,
    salesAmount,
    encaisse,
    treasuryResult,
    expenses,
    grossMargin: encaisse - expenses,
    source: 'computeFinancePeriodSummary',
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
