export { computeFinancePeriodSummary } from '../../modules/dashboard/dashboardMetrics.js';

import { computeFinancePeriodSummary } from '../../modules/dashboard/dashboardMetrics.js';
import { buildFinancialPlanVsActual } from '../financialPlanService.js';
import { resolvePeriodContext, rowMatchesMonthKeys } from '../../utils/periodScope.js';
import { buildConsolidationInput, consolidateFinance } from '../../utils/financeConsolidationEngine.js';
import { buildTreasuryByAccount } from '../../utils/treasuryByAccount.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const number = (value = 0) => Number(value || 0);
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => number(row.montant ?? row.amount ?? row.total ?? row.montant_total);

export function computeFinanceKpis(payments = [], transactions = [], periodScope = {}, dataMap = {}) {
  const periods = computeFinancePeriodSummary(payments, transactions, periodScope);
  const tx = arr(transactions);
  const { mode, monthKeys } = resolvePeriodContext(periodScope);
  const periodTransactions = mode === 'all' ? tx : tx.filter((row) => rowMatchesMonthKeys(row, monthKeys));
  const incomeAllTime = tx.filter((row) => ['entree', 'entrée', 'recette', 'income'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
  const expensesAllTime = tx.filter((row) => ['sortie', 'depense', 'dépense', 'achat', 'expense'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
  const income = periodTransactions.filter((row) => ['entree', 'entrée', 'recette', 'income'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
  const expenses = periodTransactions.filter((row) => ['sortie', 'depense', 'dépense', 'achat', 'expense'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
  const missingProof = tx.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id).length;
  const plan = buildFinancialPlanVsActual(dataMap, undefined, { periodScope });
  // Trésorerie canonique : même consolidation que la vue Finance officielle et
  // que buildDashboardSummary, pour un chiffre unique et cohérent partout.
  const consolidated = consolidateFinance(buildConsolidationInput({
    ...dataMap,
    transactions,
    payments,
    salesOrders: arr(dataMap.salesOrders || dataMap.sales_orders),
    businessEvents: arr(dataMap.businessEvents || dataMap.business_events),
    alimentationLogs: arr(dataMap.alimentationLogs || dataMap.alimentation_logs),
    productionLogs: arr(dataMap.productionLogs || dataMap.production_oeufs_logs),
  }));
  const cashNet = number(consolidated.cashNet);
  const margeReelle = number(consolidated.margeReelle);
  // Ventilation de la trésorerie par compte (espèces, Wave, OM, banque…).
  // La somme des comptes = cashNet exactement (résidu isolé dans « Non ventilé »).
  const treasuryByAccount = buildTreasuryByAccount({ consolidated, payments, transactions });
  return {
    ...periods,
    income,
    expenses,
    incomeAllTime,
    expensesAllTime,
    cashNet,
    treasuryAvailable: cashNet,
    treasuryByAccount,
    margeReelle,
    grossMargin: periods.encaissePeriod - periods.depensesPeriod,
    missingProof,
    planAttainment: plan?.revenueAttainment ?? plan?.annualAttainment ?? null,
    sources: { encaissements: 'payments', depenses: 'finances', resultat: 'payments-finances', tresorerie: 'consolidateFinance.cashNet' },
  };
}
