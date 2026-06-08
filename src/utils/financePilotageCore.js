/**
 * Finance & Pilotage V1 — trésorerie officielle, échéancier, mode démarrage.
 * Source de vérité trésorerie : consolidateFinance().cashNet
 */

import { buildConsolidationInput, consolidateFinance } from './financeConsolidationEngine.js';
import { computeGlobalProfitability } from '../services/globalProfitabilityService.js';
import { remainingForOrder } from './salesStatuses.js';
import { rowFarmId, DEFAULT_FARM_ID } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const amount = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.valeur ?? row.value);
const orderTotal = (row = {}) => n(row.montant_total ?? row.total ?? row.amount);

export const TREASURY_LABELS = Object.freeze({
  treasuryAvailable: 'Trésorerie disponible',
  receivables: 'Créances clients',
  payables: 'Dettes à payer',
  netPosition: 'Position nette',
  realMargin: 'Marge réelle',
  revenue: 'Chiffre d\'affaires',
  chargesEngaged: 'Charges engagées',
  cashCollected: 'Encaissé',
});

export function buildFinancePilotageInput(props = {}) {
  return buildConsolidationInput({
    transactions: props.transactionsAll || props.transactions || props.finances || props.rows,
    salesOrders: props.salesOrdersAll || props.salesOrders,
    payments: props.paymentsAll || props.payments,
    fournisseurs: props.fournisseurs,
    stocks: props.stocks,
    animaux: props.animaux,
    lots: props.lots || props.lotsData,
    cultures: props.cultures,
    sante: props.sante || props.vaccins,
    alimentationLogs: props.alimentationLogs,
    productionLogs: props.productionLogs,
    investissements: props.investissements,
    businessEvents: props.businessEvents,
  });
}

/** Lecture officielle unique — consolidateFinance comme source de vérité. */
export function buildOfficialTreasuryView(props = {}) {
  const input = buildFinancePilotageInput(props);
  const finance = consolidateFinance(input);
  const payables = n(finance.dettesFournisseurs);
  const treasuryAvailable = n(finance.cashNet);
  const receivables = n(finance.creancesReelles);
  const netPosition = treasuryAvailable + receivables - payables;

  return {
    labels: TREASURY_LABELS,
    treasuryAvailable,
    receivables,
    payables,
    netPosition,
    revenue: n(finance.caConsolide),
    cashCollected: n(finance.cashEncaisse),
    chargesEngaged: n(finance.chargesEngagees),
    realMargin: n(finance.margeReelle),
    marginRate: n(finance.marginRate),
    warnings: arr(finance.warnings),
    finance,
    input,
  };
}

export function isFinanceStartupMode(props = {}) {
  const input = buildFinancePilotageInput(props);
  const hasTransactions = input.transactions.some((row) => Math.abs(amount(row)) > 0);
  const hasSales = input.salesOrders.some((row) => orderTotal(row) > 0);
  const hasPayments = input.payments.some((row) => amount(row) > 0);
  return !hasTransactions && !hasSales && !hasPayments;
}

function parseDateValue(value = '') {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleBucket(date = null, today = new Date()) {
  if (!date) return 'future';
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - start) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'week';
  if (diff <= 30) return 'month';
  return 'future';
}

const BUCKET_LABELS = Object.freeze({
  overdue: 'En retard',
  today: 'Aujourd\'hui',
  week: '7 jours',
  month: '30 jours',
  future: 'Futur',
});

const isUnpaidExpense = (row = {}) => {
  const status = String(row.statut || row.status || '').toLowerCase();
  const type = String(row.type || '').toLowerCase();
  return ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(type)
    && ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(status);
};

export function buildFinanceSchedule(props = {}, options = {}) {
  const input = buildFinancePilotageInput(props);
  const farmsById = new Map(arr(options.accessibleFarms).map((farm) => [farm.id, farm.name]));
  const farmLabel = (row = {}) => {
    const farmId = rowFarmId(row);
    if (!farmId) return farmsById.get(DEFAULT_FARM_ID) || 'Horizon Farm';
    return farmsById.get(farmId) || farmId;
  };
  const today = new Date();
  const inflows = [];
  const outflows = [];

  arr(input.salesOrders).forEach((order) => {
    const remaining = remainingForOrder(order, input.payments);
    if (remaining <= 0) return;
    const dueDate = parseDateValue(order.date_echeance || order.due_date || order.date || order.created_at);
    inflows.push({
      id: `in-${order.id}`,
      kind: 'encaissement',
      title: order.client_nom || order.customer_name || 'Vente client',
      detail: `Commande ${order.reference || order.id || ''}`.trim(),
      amount: remaining,
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      bucket: scheduleBucket(dueDate, today),
      farmLabel: farmLabel(order),
    });
  });

  arr(input.transactions).forEach((row) => {
    const val = amount(row);
    if (val <= 0) return;
    const dueDate = parseDateValue(row.date_echeance || row.due_date || row.date || row.created_at);
    if (isUnpaidExpense(row)) {
      outflows.push({
        id: `out-tx-${row.id}`,
        kind: 'paiement',
        title: row.libelle || row.title || 'Charge à payer',
        detail: row.categorie || row.category || 'Finance',
        amount: val,
        dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
        bucket: scheduleBucket(dueDate, today),
        farmLabel: farmLabel(row),
      });
    }
  });

  arr(input.fournisseurs).forEach((supplier) => {
    const debt = n(supplier.dettes ?? supplier.dette ?? supplier.solde_du ?? supplier.montant_du);
    if (debt <= 0) return;
    outflows.push({
      id: `out-sup-${supplier.id}`,
      kind: 'paiement',
      title: supplier.nom || supplier.name || 'Fournisseur',
      detail: 'Dette fournisseur',
      amount: debt,
      dueDate: null,
      bucket: 'month',
      farmLabel: farmLabel(supplier),
    });
  });

  const sortByDate = (a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
  inflows.sort(sortByDate);
  outflows.sort(sortByDate);

  const buckets = ['overdue', 'today', 'week', 'month', 'future'].reduce((acc, key) => {
    acc[key] = {
      key,
      label: BUCKET_LABELS[key],
      inflows: inflows.filter((row) => row.bucket === key),
      outflows: outflows.filter((row) => row.bucket === key),
    };
    return acc;
  }, {});

  return {
    inflows,
    outflows,
    buckets,
    totals: {
      inflows: inflows.reduce((sum, row) => sum + row.amount, 0),
      outflows: outflows.reduce((sum, row) => sum + row.amount, 0),
    },
  };
}

export function buildProfitabilityView(props = {}) {
  const input = buildFinancePilotageInput(props);
  const treasury = buildOfficialTreasuryView(props);
  const profit = computeGlobalProfitability({
    transactions: input.transactions,
    salesOrders: input.salesOrders,
    payments: input.payments,
    animaux: input.animaux,
    lots: input.lots,
    cultures: input.cultures,
    stocks: input.stocks,
    sante: input.sante,
    alimentationLogs: input.alimentationLogs,
    productionLogs: input.productionLogs,
    fournisseurs: input.fournisseurs,
    investissements: input.investissements,
    businessEvents: input.businessEvents,
  });

  const activityCounts = {
    animaux: input.animaux.length,
    lots: input.lots.length,
    cultures: input.cultures.length,
    sales: input.salesOrders.length,
    transactions: input.transactions.length,
  };
  const hasActivity = activityCounts.animaux + activityCounts.lots + activityCounts.cultures > 0;
  const hasRevenue = profit.caTotal > 0;
  const hasCostSignals = profit.chargesBeforeInvestments > 0 || treasury.finance.chargesDerivees > 0;

  let ready = true;
  let message = null;
  if (!hasRevenue && !hasCostSignals && !hasActivity) {
    ready = false;
    message = 'Rentabilité non encore calculable : enregistrez des ventes, des dépenses ou des activités métier.';
  } else if (hasRevenue && !hasCostSignals && hasActivity) {
    ready = false;
    message = 'Rentabilité non encore calculable : certaines données de coûts ou de ventes sont manquantes.';
  } else if (!hasRevenue && hasCostSignals) {
    ready = false;
    message = 'Rentabilité non encore calculable : des coûts sont présents mais le chiffre d\'affaires est insuffisant.';
  }

  return {
    ready,
    message,
    profit,
    treasury,
    activityBreakdown: {
      aviculture: profit.buckets.avicole || 0,
      bovins: profit.buckets.animaux || 0,
      cultures: profit.buckets.cultures || 0,
      commercial: profit.caTotal,
    },
    marginRate: profit.caTotal > 0 ? Number(((profit.operatingResult / profit.caTotal) * 100).toFixed(1)) : null,
  };
}

export function filterFinanceAnnexeDocuments(documents = []) {
  return arr(documents).filter((doc) => {
    const text = `${doc.categorie || doc.category || ''} ${doc.type || ''} ${doc.title || doc.nom || ''} ${doc.module || ''}`.toLowerCase();
    return /finance|compta|facture|justificatif|preuve|tresorerie|trésorerie|banque|relevé|releve|rapport/.test(text);
  });
}
