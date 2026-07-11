import { computeSharedPilotageFinanceKpis } from '../../utils/objectifsCroissanceWorkflow.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { arr, metaBase, money, pickRows } from './coreUtils.js';

const isExpense = (row = {}) => ['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(
  String(row.type || row.nature || row.sens || row.transaction_type || '').toLowerCase(),
);

/**
 * Synthèse finance & trésorerie — lecture seule depuis dataMap.
 * KPI ventes/créances alignés sur `buildConsolidatedCommercialKpis` (source unique Commercial).
 */
export function getFinancialSummary(dataMap = {}) {
  const salesOrders = pickRows(dataMap, 'sales_orders', 'salesOrders');
  const salesOrdersAll = pickRows(dataMap, 'salesOrdersAll', 'sales_orders', 'salesOrders');
  const payments = pickRows(dataMap, 'payments');
  const paymentsAll = pickRows(dataMap, 'paymentsAll', 'payments');
  const transactions = pickRows(dataMap, 'finances', 'transactions', 'transactionsAll');
  const investissements = pickRows(dataMap, 'investissements');
  const clients = pickRows(dataMap, 'clients');
  const deliveries = pickRows(dataMap, 'deliveries');
  const invoices = pickRows(dataMap, 'invoices');

  const shared = computeSharedPilotageFinanceKpis({
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    periodScope: dataMap.periodScope || {},
    periodFiltered: Boolean(dataMap.periodFiltered),
  });

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: salesOrdersAll,
    payments: paymentsAll,
    clients,
    deliveries,
    invoices,
    periodScope: {},
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
      creances_clients: commercialKpis.receivable,
    },
    sales_linked: {
      ca_commandes: commercialKpis.ca,
      commandes_count: commercialKpis.orderCount,
      paiements_count: payments.length,
      encaisse_ventes: commercialKpis.collected,
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
    consolidated_source: 'buildConsolidatedCommercialKpis',
  };
}

export default getFinancialSummary;
