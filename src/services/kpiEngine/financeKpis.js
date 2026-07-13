export { computeFinancePeriodSummary } from '../../modules/dashboard/dashboardMetrics.js';

import { computeFinancePeriodSummary } from '../../modules/dashboard/dashboardMetrics.js';
import { buildFinancialPlanVsActual } from '../financialPlanService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const number = (value = 0) => Number(value || 0);
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => number(row.montant ?? row.amount ?? row.total ?? row.montant_total);

export function computeFinanceKpis(payments = [], transactions = [], periodScope = {}, dataMap = {}) {
  const periods = computeFinancePeriodSummary(payments, transactions, periodScope);
  const tx = arr(transactions);
  const income = tx.filter((row) => ['entree', 'entrée', 'recette', 'income'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
  const expenses = tx.filter((row) => ['sortie', 'depense', 'dépense', 'achat', 'expense'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
  const missingProof = tx.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id).length;
  const plan = buildFinancialPlanVsActual(dataMap, undefined, { periodScope });
  return {
    ...periods,
    income,
    expenses,
    grossMargin: periods.encaissePeriod - periods.depensesPeriod,
    missingProof,
    planAttainment: plan?.revenueAttainment ?? plan?.annualAttainment ?? null,
    sources: { encaissements: 'payments', depenses: 'finances', resultat: 'payments-finances' },
  };
}
