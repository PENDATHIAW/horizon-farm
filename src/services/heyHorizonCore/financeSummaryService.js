import { computeSharedPilotageFinanceKpis } from '../../utils/objectifsCroissanceWorkflow.js';
import { arr, metaBase, money, pickRows } from './coreUtils.js';

const isExpense = (row = {}) => ['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(
  String(row.type || row.nature || row.sens || row.transaction_type || '').toLowerCase(),
);

/**
 * Synthèse finance & trésorerie — lecture seule depuis dataMap.
 */
export function getFinancialSummary(dataMap = {}) {
  const salesOrders = pickRows(dataMap, 'sales_orders', 'salesOrders');
  const salesOrdersAll = pickRows(dataMap, 'salesOrdersAll', 'sales_orders', 'salesOrders');
  const payments = pickRows(dataMap, 'payments');
  const paymentsAll = pickRows(dataMap, 'paymentsAll', 'payments');
  const transactions = pickRows(dataMap, 'finances', 'transactions', 'transactionsAll');
  const investissements = pickRows(dataMap, 'investissements');

  const shared = computeSharedPilotageFinanceKpis({
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    periodScope: dataMap.periodScope || {},
    periodFiltered: Boolean(dataMap.periodFiltered),
  });

  const missingProofCount = arr(transactions).filter(
    (row) => money(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id && !row.file_url,
  ).length;

  const investmentTotal = investissements.reduce((sum, row) => sum + money(row), 0);

  return {
    ...metaBase({ module: 'finance_pilotage' }),
    period: {
      label: dataMap.periodLabel || null,
      filtered: Boolean(dataMap.periodFiltered),
    },
    treasury: {
      encaissements: shared.encaisse,
      depenses: shared.expenses,
      resultat: shared.treasuryResult,
      marge_brute: shared.grossMargin,
      creances_clients: shared.receivable,
    },
    sales_linked: {
      ca_commandes: shared.salesAmount,
      commandes_count: salesOrders.length,
      paiements_count: payments.length,
    },
    transactions: {
      count: transactions.length,
      depenses_count: arr(transactions).filter(isExpense).length,
      recettes_count: arr(transactions).filter((row) => !isExpense(row) && money(row) > 0).length,
      sans_justificatif: missingProofCount,
    },
    investissements: {
      count: investissements.length,
      montant_total: investmentTotal,
    },
    business_plans_count: pickRows(dataMap, 'business_plans').length,
    finance_periods: shared.financePeriods ?? null,
  };
}

export default getFinancialSummary;
