export { computeFinancePeriodSummary } from '../../modules/dashboard/dashboardMetrics.js';

import { computeFinancePeriodSummary } from '../../modules/dashboard/dashboardMetrics.js';
import { buildFinancialPlanVsActual } from '../financialPlanService.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

/** KPI finance — encaissements (payments), charges (finances), résultat période. */
export function computeFinanceKpis(payments = [], transactions = [], periodScope = {}, dataMap = {}) {
  const periods = computeFinancePeriodSummary(payments, transactions, periodScope);
  const tx = arr(transactions);
  const income = tx.filter((r) => ['entree', 'entrée', 'recette', 'income'].includes(low(r.type))).reduce((s, r) => s + amount(r), 0);
  const expenses = tx.filter((r) => ['sortie', 'depense', 'dépense', 'achat', 'expense'].includes(low(r.type))).reduce((s, r) => s + amount(r), 0);
  const missingProof = tx.filter((r) => amount(r) > 0 && !r.document_id && !r.proof_url && !r.justificatif_id).length;
  const plan = buildFinancialPlanVsActual(dataMap, undefined, { periodScope });

  return {
    ...periods,
    income,
    expenses,
    grossMargin: periods.encaissePeriod - periods.depensesPeriod,
    missingProof,
    planAttainment: plan?.revenueAttainment ?? plan?.annualAttainment ?? null,
    sources: {
      encaissements: 'payments',
      depenses: 'finances',
      resultat: 'payments-finances',
    },
  };
}
