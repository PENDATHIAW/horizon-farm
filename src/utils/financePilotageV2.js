/**
 * Finance & Pilotage V2 - dirigeant, banque, investisseur, multi-fermes.
 * Réutilise financePilotageCore sans recréer les moteurs V1.
 */

import {
  buildFinancePilotageInput,
  buildFinanceSchedule,
  buildOfficialTreasuryView,
  buildProfitabilityView,
  isFinanceStartupMode,
  TREASURY_LABELS,
} from './financePilotageCore.js';
import { buildFinanceReconciliationRows } from './financeReconciliation.js';
import { aggregateMissingProofTransactions, buildFinanceCoherenceRows } from '../modules/finance/financeVisionHelpers.js';
import { remainingForOrder } from './salesStatuses.js';
import { DEFAULT_FARM_ID, rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const amount = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.valeur ?? row.value);
const orderTotal = (row = {}) => n(row.montant_total ?? row.total ?? row.amount);

export const AGING_BUCKET_KEYS = Object.freeze([
  'not_due',
  'days_0_7',
  'days_8_30',
  'days_31_60',
  'days_60_plus',
]);

export const AGING_BUCKET_LABELS = Object.freeze({
  not_due: 'Non échues',
  days_0_7: '0–7 jours',
  days_8_30: '8–30 jours',
  days_31_60: '31–60 jours',
  days_60_plus: '+60 jours',
});

export const REPAYMENT_CAPACITY_LABELS = Object.freeze({
  low: 'Capacité faible',
  watch: 'Capacité à surveiller',
  ok: 'Capacité correcte',
  strong: 'Capacité solide',
});

export const CASHFLOW_RISK_LABELS = Object.freeze({
  low: 'Risque faible',
  medium: 'Risque moyen',
  high: 'Risque élevé',
});

function parseDateValue(value = '') {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysPastDue(dueDate = null, referenceDate = new Date()) {
  if (!dueDate) return null;
  const ref = startOfDay(referenceDate);
  const due = startOfDay(dueDate);
  const diff = Math.round((ref - due) / 86400000);
  return diff;
}

export function agingBucketForDate(dueDate = null, referenceDate = new Date()) {
  if (!dueDate) return 'not_due';
  const past = daysPastDue(dueDate, referenceDate);
  if (past <= 0) return 'not_due';
  if (past <= 7) return 'days_0_7';
  if (past <= 30) return 'days_8_30';
  if (past <= 60) return 'days_31_60';
  return 'days_60_plus';
}

function emptyAgingBuckets() {
  return AGING_BUCKET_KEYS.reduce((acc, key) => {
    acc[key] = { key, label: AGING_BUCKET_LABELS[key], amount: 0, count: 0, items: [] };
    return acc;
  }, {});
}

function farmLabelForRow(row = {}, farmsById = new Map()) {
  const farmId = rowFarmId(row);
  if (!farmId) return farmsById.get(DEFAULT_FARM_ID) || 'Horizon Farm';
  return farmsById.get(farmId) || farmId;
}

function pushAgingItem(buckets, bucketKey, item) {
  const bucket = buckets[bucketKey];
  if (!bucket) return;
  bucket.items.push(item);
  bucket.count += 1;
  bucket.amount += n(item.amount);
}

export function buildReceivablesAging(props = {}, options = {}) {
  const input = buildFinancePilotageInput(props);
  const farmsById = new Map(arr(options.accessibleFarms).map((farm) => [farm.id, farm.name]));
  const today = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const buckets = emptyAgingBuckets();

  arr(input.salesOrders).forEach((order) => {
    const remaining = remainingForOrder(order, input.payments);
    if (remaining <= 0) return;
    const dueDate = parseDateValue(order.date_echeance || order.due_date || order.date || order.created_at);
    const bucketKey = agingBucketForDate(dueDate, today);
    pushAgingItem(buckets, bucketKey, {
      id: `recv-o-${order.id}`,
      title: order.client_nom || order.customer_name || 'Client',
      detail: `Commande ${order.reference || order.id || ''}`.trim(),
      amount: remaining,
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      farmLabel: farmLabelForRow(order, farmsById),
      source: 'vente',
    });
  });

  return {
    kind: 'receivables',
    buckets,
    total: Object.values(buckets).reduce((sum, bucket) => sum + bucket.amount, 0),
    count: Object.values(buckets).reduce((sum, bucket) => sum + bucket.count, 0),
  };
}

const isUnpaidExpense = (row = {}) => {
  const status = String(row.statut || row.status || '').toLowerCase();
  const type = String(row.type || '').toLowerCase();
  return ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(type)
    && ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(status);
};

export function buildPayablesAging(props = {}, options = {}) {
  const input = buildFinancePilotageInput(props);
  const farmsById = new Map(arr(options.accessibleFarms).map((farm) => [farm.id, farm.name]));
  const today = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const buckets = emptyAgingBuckets();

  arr(input.transactions).forEach((row) => {
    const val = amount(row);
    if (val <= 0 || !isUnpaidExpense(row)) return;
    const dueDate = parseDateValue(row.date_echeance || row.due_date || row.date || row.created_at);
    const bucketKey = agingBucketForDate(dueDate, today);
    pushAgingItem(buckets, bucketKey, {
      id: `pay-tx-${row.id}`,
      title: row.libelle || row.title || 'Charge à payer',
      detail: row.categorie || row.category || 'Finance',
      amount: val,
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      farmLabel: farmLabelForRow(row, farmsById),
      source: 'finance',
    });
  });

  arr(input.fournisseurs).forEach((supplier) => {
    const debt = n(supplier.dettes ?? supplier.dette ?? supplier.solde_du ?? supplier.montant_du);
    if (debt <= 0) return;
    pushAgingItem(buckets, 'not_due', {
      id: `pay-sup-${supplier.id}`,
      title: supplier.nom || supplier.name || 'Fournisseur',
      detail: 'Dette fournisseur',
      amount: debt,
      dueDate: null,
      farmLabel: farmLabelForRow(supplier, farmsById),
      source: 'fournisseur',
    });
  });

  return {
    kind: 'payables',
    buckets,
    total: Object.values(buckets).reduce((sum, bucket) => sum + bucket.amount, 0),
    count: Object.values(buckets).reduce((sum, bucket) => sum + bucket.count, 0),
  };
}

export function buildExecutiveFinancialSituation(props = {}, options = {}) {
  if (isFinanceStartupMode(props)) {
    const treasury = buildOfficialTreasuryView(props);
    return {
      labels: TREASURY_LABELS,
      treasuryAvailable: treasury.treasuryAvailable,
      receivables: treasury.receivables,
      payables: treasury.payables,
      expectedInflows: 0,
      expectedOutflows: 0,
      realMargin: treasury.realMargin,
      marginRate: null,
      marginRateReliable: false,
      netPosition: treasury.netPosition,
      isProfitable: false,
      treasuryRisk: null,
      forecastReady: false,
      insufficientData: true,
      profitabilityReady: false,
      priorityAction: {
        label: 'En attente de données financières',
        detail: 'Enregistrez une vente, un paiement ou une dépense pour activer la lecture dirigeant.',
        tab: 'Trésorerie',
      },
    };
  }

  const treasury = buildOfficialTreasuryView(props);
  const schedule = buildFinanceSchedule(props, options);
  const profitability = buildProfitabilityView(props);
  const receivablesAging = buildReceivablesAging(props, options);
  const forecast = buildCashFlowForecast(props, options);

  const expectedInflows = n(schedule.totals.inflows);
  const expectedOutflows = n(schedule.totals.outflows);
  const marginRate = treasury.marginRate > 0
    ? treasury.marginRate
    : (profitability.marginRate != null ? profitability.marginRate : null);

  const overdueReceivables = receivablesAging.buckets.days_0_7.amount
    + receivablesAging.buckets.days_8_30.amount
    + receivablesAging.buckets.days_31_60.amount
    + receivablesAging.buckets.days_60_plus.amount;
  const weekPayables = (schedule.buckets?.overdue?.outflows || []).reduce((s, r) => s + r.amount, 0)
    + (schedule.buckets?.today?.outflows || []).reduce((s, r) => s + r.amount, 0)
    + (schedule.buckets?.week?.outflows || []).reduce((s, r) => s + r.amount, 0);

  let priorityAction;
  if (treasury.treasuryAvailable < weekPayables && weekPayables > 0) {
    priorityAction = {
      label: 'Priorité : sécuriser la trésorerie des 7 prochains jours',
      detail: `Des paiements (${weekPayables.toLocaleString('fr-FR')} FCFA) dépassent la trésorerie disponible.`,
      tab: 'Échéancier',
    };
  } else if (overdueReceivables > 0) {
    priorityAction = {
      label: 'Priorité : relancer les créances en retard',
      detail: `${overdueReceivables.toLocaleString('fr-FR')} FCFA de créances dépassent l'échéance.`,
      tab: 'Créances',
    };
  } else if (expectedOutflows > treasury.treasuryAvailable + expectedInflows) {
    priorityAction = {
      label: 'Priorité : anticiper les paiements à venir',
      detail: 'Les sorties prévues dépassent trésorerie et encaissements attendus.',
      tab: 'Échéancier',
    };
  } else if (profitability.ready && profitability.profit.operatingResult < 0) {
    priorityAction = {
      label: 'Priorité : améliorer la rentabilité',
      detail: 'Le résultat opérationnel est négatif sur la période.',
      tab: 'Rentabilité',
    };
  } else {
    priorityAction = {
      label: 'Situation stable - poursuivre le suivi hebdomadaire',
      detail: 'Trésorerie, créances et échéances sont sous contrôle.',
      tab: 'Résumé',
    };
  }

  return {
    labels: TREASURY_LABELS,
    treasuryAvailable: treasury.treasuryAvailable,
    receivables: treasury.receivables,
    payables: treasury.payables,
    expectedInflows,
    expectedOutflows,
    realMargin: treasury.realMargin,
    marginRate,
    marginRateReliable: treasury.marginRate > 0 || profitability.ready,
    netPosition: treasury.netPosition,
    isProfitable: profitability.ready ? profitability.profit.operatingResult >= 0 : treasury.realMargin >= 0,
    treasuryRisk: forecast.ready ? forecast.risk : null,
    forecastReady: forecast.ready,
    insufficientData: false,
    priorityAction,
    profitabilityReady: profitability.ready,
  };
}

export function buildCashFlowForecast(props = {}, options = {}) {
  const treasury = buildOfficialTreasuryView(props);
  const schedule = buildFinanceSchedule(props, options);
  const today = startOfDay(options.referenceDate ? new Date(options.referenceDate) : new Date());

  const datedFlows = [];
  [...schedule.inflows, ...schedule.outflows.map((row) => ({ ...row, amount: -row.amount }))].forEach((row) => {
    const dueDate = parseDateValue(row.dueDate);
    if (!dueDate) return;
    datedFlows.push({ date: dueDate, amount: row.kind === 'paiement' ? -row.amount : row.amount });
  });

  const recurringMonthly = arr(options.bpRecurringCosts || props.bpRecurringCosts)
    .reduce((sum, row) => sum + n(row.montant_mensuel ?? row.monthly_amount ?? row.montant ?? row.amount), 0);

  const hasEnoughData = datedFlows.length > 0 || treasury.treasuryAvailable !== 0 || recurringMonthly > 0;

  if (!hasEnoughData) {
    return {
      ready: false,
      message: 'Prévision disponible après saisie de davantage d\'échéances et de flux financiers.',
      currentTreasury: treasury.treasuryAvailable,
      projection30: null,
      projection60: null,
      projection90: null,
      risk: null,
      riskLabel: null,
    };
  }

  function projectAt(days) {
    let balance = treasury.treasuryAvailable;
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + days);

    datedFlows.forEach((flow) => {
      if (flow.date <= horizon && flow.date >= today) balance += flow.amount;
    });

    if (recurringMonthly > 0) {
      const months = days / 30;
      balance -= recurringMonthly * months;
    }

    return Math.round(balance);
  }

  const projection30 = projectAt(30);
  const projection60 = projectAt(60);
  const projection90 = projectAt(90);

  let risk = 'low';
  if (projection30 < 0 || (projection30 < treasury.payables * 0.2 && treasury.payables > 0)) {
    risk = 'high';
  } else if (projection30 < treasury.treasuryAvailable * 0.3 || projection60 < 0) {
    risk = 'medium';
  }

  return {
    ready: true,
    message: null,
    currentTreasury: treasury.treasuryAvailable,
    projection30,
    projection60,
    projection90,
    risk,
    riskLabel: CASHFLOW_RISK_LABELS[risk],
    inflowCount: schedule.inflows.length,
    outflowCount: schedule.outflows.length,
  };
}

export function buildRepaymentCapacity(props = {}, options = {}) {
  const treasury = buildOfficialTreasuryView(props);
  const profitability = buildProfitabilityView(props);
  const forecast = buildCashFlowForecast(props, options);

  const operatingResult = profitability.ready ? n(profitability.profit.operatingResult) : n(treasury.realMargin);
  const monthlyOperating = operatingResult / 12;
  const availableCashFlow = treasury.treasuryAvailable + treasury.receivables - treasury.payables;

  const existingDebts = treasury.payables + arr(options.bpFundingSources || props.bpFundingSources)
    .filter((row) => ['pret', 'prêt', 'loan', 'credit', 'crédit'].includes(String(row.type || row.nature || '').toLowerCase()))
    .reduce((sum, row) => sum + n(row.montant ?? row.amount ?? row.montant_restant ?? row.remaining), 0);

  const monthlyDebtService = arr(options.bpRecurringCosts || props.bpRecurringCosts)
    .filter((row) => /rembours|mensual|credit|crédit|pret|prêt|loan|emprunt/i.test(String(row.libelle || row.label || row.categorie || '')))
    .reduce((sum, row) => sum + n(row.montant_mensuel ?? row.monthly_amount ?? row.montant ?? row.amount), 0);

  const safetyMargin = availableCashFlow - existingDebts;
  const maxMonthlyPayment = Math.max(0, Math.round(monthlyOperating * 0.35));

  let dscr = null;
  if (monthlyDebtService > 0 && monthlyOperating > 0) {
    dscr = Number((monthlyOperating / monthlyDebtService).toFixed(2));
  }

  let capacityKey = 'ok';
  if (dscr != null) {
    if (dscr < 1) capacityKey = 'low';
    else if (dscr < 1.25) capacityKey = 'watch';
    else if (dscr >= 1.5) capacityKey = 'strong';
  } else if (availableCashFlow < 0 || operatingResult < 0) {
    capacityKey = 'low';
  } else if (safetyMargin < maxMonthlyPayment * 3) {
    capacityKey = 'watch';
  } else if (safetyMargin > maxMonthlyPayment * 12 && operatingResult > 0) {
    capacityKey = 'strong';
  }

  const hasData = profitability.ready || treasury.revenue > 0 || treasury.treasuryAvailable !== 0;

  return {
    ready: hasData,
    operatingResult,
    availableCashFlow,
    maxMonthlyPayment,
    existingDebts,
    safetyMargin,
    monthlyDebtService: monthlyDebtService || null,
    dscr,
    capacityKey,
    capacityLabel: REPAYMENT_CAPACITY_LABELS[capacityKey],
    explanation: 'Cet indicateur estime la capacité du projet à rembourser un financement à partir des flux disponibles.',
    forecastRisk: forecast.riskLabel,
  };
}

function bpRowsForPlan(plan, rows = []) {
  if (!plan?.id) return arr(rows);
  return arr(rows).filter((row) => String(row.business_plan_id || '') === String(plan.id));
}

export function buildFinancingView(props = {}, options = {}) {
  const plans = arr(props.businessPlans || options.businessPlans);
  const activePlan = plans.find((p) => ['actif', 'active', 'validé', 'valide'].includes(String(p.statut || p.status || '').toLowerCase()))
    || plans[0]
    || null;

  const lines = bpRowsForPlan(activePlan, props.bpInvestmentLines || options.bpInvestmentLines);
  const costs = bpRowsForPlan(activePlan, props.bpRecurringCosts || options.bpRecurringCosts);
  const fundings = bpRowsForPlan(activePlan, props.bpFundingSources || options.bpFundingSources);
  const documents = arr(props.documents || options.documents);

  const investmentNeed = lines.reduce((sum, row) => sum + amount(row), 0);
  const personalContribution = fundings
    .filter((row) => ['apport', 'personal', 'fonds_propres', 'equity'].some((k) => String(row.type || row.nature || row.source || '').toLowerCase().includes(k)))
    .reduce((sum, row) => sum + n(row.montant ?? row.amount), 0);
  const soughtFunding = fundings
    .filter((row) => ['pret', 'prêt', 'loan', 'subvention', 'grant', 'garantie'].some((k) => String(row.type || row.nature || row.source || '').toLowerCase().includes(k)))
    .reduce((sum, row) => sum + n(row.montant ?? row.amount), 0);

  const useOfFunds = lines.slice(0, 8).map((row) => ({
    label: row.designation || row.libelle || row.name || 'Poste investissement',
    amount: amount(row),
  }));

  const repayment = buildRepaymentCapacity(props, options);
  const financeDocs = documents.filter((doc) => /finance|banque|dossier|bp|business|invest|pret|prêt|credit|crédit/i.test(
    `${doc.categorie || ''} ${doc.category || ''} ${doc.title || doc.nom || ''} ${doc.type || ''}`,
  ));

  return {
    ready: Boolean(activePlan || investmentNeed > 0 || soughtFunding > 0),
    planName: activePlan?.nom || activePlan?.name || null,
    planId: activePlan?.id || null,
    investmentNeed,
    personalContribution,
    soughtFunding,
    existingDebts: repayment.existingDebts,
    useOfFunds,
    recurringCostsMonthly: costs.reduce((sum, row) => sum + n(row.montant_mensuel ?? row.monthly_amount ?? row.montant), 0),
    repayment,
    documents: financeDocs,
    documentCount: financeDocs.length,
    investorsModule: 'financements',
    investorsTab: 'cockpit-dashboard',
  };
}

export function buildFinanceReconciliationView(props = {}, options = {}) {
  const input = buildFinancePilotageInput(props);
  const engineRows = buildFinanceReconciliationRows({
    transactions: input.transactions,
    payments: input.payments,
    salesOrders: input.salesOrders,
    stocks: input.stocks,
  });

  const coherenceRows = buildFinanceCoherenceRows(
    input.transactions,
    input.salesOrders,
    input.payments,
    arr(options.tasks || props.tasks),
  );

  const anomalies = [];

  engineRows.forEach((row) => {
    let recommendedAction = 'Vérifier et rapprocher manuellement';
    if (row.kind === 'payment_without_finance') recommendedAction = 'Créer la ligne finance ou lier le paiement';
    if (row.kind === 'finance_without_payment') recommendedAction = 'Enregistrer ou lier le paiement vente';
    if (row.kind === 'stockable_without_stock') recommendedAction = 'Créer l\'entrée stock correspondante';

    anomalies.push({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.detail,
      amount: amount(row.payment || row.transaction || {}),
      source: row.kind === 'stockable_without_stock' ? 'stock' : 'ventes/finance',
      recommendedAction,
      canAutoFix: Boolean(row.canCreate || row.canLink),
      row,
    });
  });

  coherenceRows.slice(0, 10).forEach((row) => {
    if (row.type === 'preuve') {
      anomalies.push({
        id: `coh-${row.id}`,
        kind: 'missing_proof',
        title: row.title,
        description: row.detail,
        amount: row.value,
        source: 'finance',
        recommendedAction: 'Ajouter un justificatif',
        canAutoFix: false,
        row,
      });
    }
    if (row.type === 'creance') {
      anomalies.push({
        id: `coh-${row.id}`,
        kind: 'sale_without_payment',
        title: row.title,
        description: row.detail,
        amount: row.value,
        source: 'commercial',
        recommendedAction: 'Encaisser ou planifier relance',
        canAutoFix: false,
        row,
      });
    }
  });

  return {
    anomalies,
    count: anomalies.length,
    engineCount: engineRows.length,
    coherenceCount: coherenceRows.length,
  };
}

function scopedPropsForFarm(props = {}, farmId = null) {
  if (!farmId) return props;
  const filter = (rows) => arr(rows).filter((row) => {
    const rid = rowFarmId(row);
    return !rid || rid === farmId;
  });
  return {
    ...props,
    transactions: filter(props.transactionsAll || props.transactions),
    transactionsAll: filter(props.transactionsAll || props.transactions),
    salesOrders: filter(props.salesOrdersAll || props.salesOrders),
    salesOrdersAll: filter(props.salesOrdersAll || props.salesOrders),
    payments: filter(props.paymentsAll || props.payments),
    paymentsAll: filter(props.paymentsAll || props.payments),
    fournisseurs: filter(props.fournisseurs),
    animaux: filter(props.animaux),
    lots: filter(props.lots),
    cultures: filter(props.cultures),
  };
}

function financialRiskLabel(treasury = {}, forecast = {}) {
  if (forecast.risk === 'high' || treasury.treasuryAvailable < 0) return 'Élevé';
  if (forecast.risk === 'medium') return 'Moyen';
  return 'Faible';
}

export function buildMultiFarmFinanceContext(props = {}, options = {}) {
  const farms = arr(options.accessibleFarms).filter((farm) => farm.status !== 'archived');
  const farmScope = options.farmScope || { mode: 'all' };

  if (farmScope.mode !== 'all' || farms.length <= 1) {
    const executive = buildExecutiveFinancialSituation(props, options);
    return {
      consolidated: true,
      singleFarm: true,
      executive,
      farms: [],
      comparison: [],
    };
  }

  const consolidatedExecutive = buildExecutiveFinancialSituation(props, options);
  const comparison = farms.map((farm) => {
    const farmProps = scopedPropsForFarm(props, farm.id);
    const treasury = buildOfficialTreasuryView(farmProps);
    const profitability = buildProfitabilityView(farmProps);
    const forecast = buildCashFlowForecast(farmProps, options);
    const receivablesAging = buildReceivablesAging(farmProps, { ...options, accessibleFarms: farms });

    const overdue = receivablesAging.buckets.days_8_30.count
      + receivablesAging.buckets.days_31_60.count
      + receivablesAging.buckets.days_60_plus.count;

    let nextAction = 'Suivi normal';
    if (treasury.treasuryAvailable < 0) nextAction = 'Renforcer trésorerie';
    else if (overdue > 0) nextAction = 'Relancer créances';
    else if (profitability.ready && profitability.profit.operatingResult < 0) nextAction = 'Corriger marge';

    return {
      farmId: farm.id,
      farmName: farm.name,
      treasury: treasury.treasuryAvailable,
      receivables: treasury.receivables,
      payables: treasury.payables,
      margin: treasury.realMargin,
      marginRate: profitability.marginRate,
      risk: financialRiskLabel(treasury, forecast),
      nextAction,
    };
  }).sort((a, b) => a.treasury - b.treasury);

  return {
    consolidated: true,
    singleFarm: false,
    executive: consolidatedExecutive,
    farms,
    comparison,
  };
}

export function buildFinanceStartupJourneyV2(props = {}) {
  const input = buildFinancePilotageInput(props);
  const hasExpense = input.transactions.some((row) => {
    const type = String(row.type || '').toLowerCase();
    return ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(type) && amount(row) > 0;
  });
  const hasProof = input.transactions.some((row) => amount(row) > 0 && (row.document_id || row.proof_url || row.justificatif_id || row.file_url));
  const hasSale = input.salesOrders.some((row) => orderTotal(row) > 0);
  const hasPayment = input.payments.some((row) => amount(row) > 0);
  const hasReceivable = input.salesOrders.some((row) => remainingForOrder(row, input.payments) > 0);
  const hasReport = arr(props.documents).some((doc) => /rapport|report|synth/i.test(`${doc.title || ''} ${doc.type || ''}`));
  const hasBankDossier = arr(props.businessPlans).length > 0 || arr(props.bpFundingSources).length > 0;

  const steps = [
    { key: 'expense', label: 'Enregistrer une première dépense', tab: 'Trésorerie', done: hasExpense },
    { key: 'proof', label: 'Ajouter une preuve', module: 'documents_rapports', tab: 'Preuves', done: hasProof },
    { key: 'sale', label: 'Enregistrer une première vente', module: 'commercial', tab: 'Ventes', done: hasSale },
    { key: 'payment', label: 'Rattacher un paiement', module: 'commercial', tab: 'Ventes', done: hasPayment },
    { key: 'receivable', label: 'Suivre une créance', tab: 'Créances', done: hasReceivable || hasPayment },
    { key: 'report', label: 'Générer un premier rapport', module: 'documents_rapports', tab: 'Rapports', done: hasReport },
    { key: 'bank', label: 'Préparer un dossier banque', tab: 'Financement', done: hasBankDossier },
  ];

  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) || steps[steps.length - 1];

  return {
    steps,
    completed,
    total: steps.length,
    progressPct: Math.round((completed / steps.length) * 100),
    nextStep,
  };
}

export function buildFinanceSmartAlerts(props = {}, options = {}) {
  const treasury = buildOfficialTreasuryView(props);
  const receivablesAging = buildReceivablesAging(props, options);
  const payablesAging = buildPayablesAging(props, options);
  const forecast = buildCashFlowForecast(props, options);
  const missingProof = aggregateMissingProofTransactions(arr(props.transactionsAll || props.transactions));
  const multiFarm = buildMultiFarmFinanceContext(props, options);
  const schedule = buildFinanceSchedule(props, options);

  const alerts = [];

  const overdue30 = receivablesAging.buckets.days_8_30.count
    + receivablesAging.buckets.days_31_60.count
    + receivablesAging.buckets.days_60_plus.count;
  if (overdue30 >= 2) {
    alerts.push({
      id: 'recv-overdue',
      message: `${overdue30} créances dépassent 30 jours.`,
      severity: 'warn',
      tab: 'Créances',
      action: 'Relancer les clients',
    });
  }

  if (forecast.ready && forecast.risk === 'high') {
    alerts.push({
      id: 'cashflow-30',
      message: 'La trésorerie projetée à 30 jours devient faible.',
      severity: 'bad',
      tab: 'Échéancier',
      action: 'Voir la prévision',
    });
  }

  if (missingProof.length >= 3) {
    alerts.push({
      id: 'missing-proof',
      message: `${missingProof.length} transactions n'ont pas encore de justificatif.`,
      severity: 'warn',
      tab: 'Trésorerie',
      action: 'Compléter les preuves',
    });
  }

  const weekOutflows = (schedule.buckets?.overdue?.outflows || [])
    .concat(schedule.buckets?.today?.outflows || [])
    .concat(schedule.buckets?.week?.outflows || [])
    .reduce((sum, row) => sum + row.amount, 0);

  if (weekOutflows > treasury.treasuryAvailable && weekOutflows > 0) {
    alerts.push({
      id: 'debts-week',
      message: 'Les dettes à payer dans les 7 jours dépassent la trésorerie disponible.',
      severity: 'bad',
      tab: 'Dettes',
      action: 'Prioriser les paiements',
    });
  }

  if (!multiFarm.singleFarm) {
    const fragile = multiFarm.comparison.find((row) => row.margin < 0);
    if (fragile) {
      alerts.push({
        id: 'farm-negative-margin',
        message: `La ferme « ${fragile.farmName} » présente une marge négative.`,
        severity: 'warn',
        tab: 'Rentabilité',
        action: 'Analyser la ferme',
      });
    }
  } else {
    const profitability = buildProfitabilityView(props);
    if (profitability.ready && profitability.profit.operatingResult < 0) {
      alerts.push({
        id: 'negative-margin',
        message: 'La marge opérationnelle est négative sur la période.',
        severity: 'warn',
        tab: 'Rentabilité',
        action: 'Voir rentabilité',
      });
    }
  }

  const payablesOverdue = payablesAging.buckets.days_0_7.count + payablesAging.buckets.days_8_30.count;
  if (payablesOverdue >= 3) {
    alerts.push({
      id: 'payables-overdue',
      message: `${payablesOverdue} dettes sont en retard de paiement.`,
      severity: 'warn',
      tab: 'Dettes',
      action: 'Planifier paiements',
    });
  }

  return alerts.slice(0, 8);
}

export function buildFinanceExportPayload(props = {}, options = {}) {
  const executive = buildExecutiveFinancialSituation(props, options);
  const receivablesAging = buildReceivablesAging(props, options);
  const payablesAging = buildPayablesAging(props, options);
  const forecast = buildCashFlowForecast(props, options);
  const repayment = buildRepaymentCapacity(props, options);
  const financing = buildFinancingView(props, options);
  const schedule = buildFinanceSchedule(props, options);

  return {
    synthesis: {
      module: 'Finance & Pilotage',
      title: 'Synthèse financière',
      period: options.periodLabel || 'Toutes les périodes',
      subtitle: executive.priorityAction?.label || '',
      extra: {
        'Trésorerie disponible': executive.treasuryAvailable,
        'Créances clients': executive.receivables,
        'Dettes à payer': executive.payables,
        'Marge réelle': executive.realMargin,
        'Encaissements attendus': executive.expectedInflows,
        'Paiements à venir': executive.expectedOutflows,
      },
    },
    schedule: {
      module: 'Finance & Pilotage',
      title: 'Échéancier financier',
      period: options.periodLabel || 'Toutes les périodes',
      extra: {
        'À encaisser': schedule.totals.inflows,
        'À payer': schedule.totals.outflows,
      },
    },
    profitability: {
      module: 'Finance & Pilotage',
      title: 'Rentabilité',
      period: options.periodLabel || 'Toutes les périodes',
      extra: {
        'Marge réelle': executive.realMargin,
        'Taux de marge': executive.marginRateReliable ? `${executive.marginRate} %` : '-',
      },
    },
    repayment: {
      module: 'Finance & Pilotage',
      title: 'Capacité de remboursement',
      period: options.periodLabel || 'Toutes les périodes',
      extra: {
        'Résultat opérationnel': repayment.operatingResult,
        'Capacité': repayment.capacityLabel,
        DSCR: repayment.dscr ?? '-',
        'Mensualité max. estimée': repayment.maxMonthlyPayment,
      },
    },
    financing: {
      module: 'Finance & Pilotage',
      title: 'Vue financement',
      period: options.periodLabel || 'Toutes les périodes',
      extra: {
        'Besoin financement': financing.investmentNeed,
        'Apport personnel': financing.personalContribution,
        'Financement recherché': financing.soughtFunding,
        'Dettes existantes': financing.existingDebts,
      },
    },
    aging: {
      receivables: receivablesAging,
      payables: payablesAging,
    },
    forecast,
  };
}

export function buildFinanceHeyHorizonQuestions(options = {}) {
  const multi = options.farmScope?.mode === 'all';
  return [
    { id: 'summary', label: 'Résume ma situation financière.', query: 'Résume ma situation financière.' },
    { id: 'receivables', label: 'Quelles créances dois-je relancer ?', query: 'Quelles créances dois-je relancer ?' },
    { id: 'financing', label: 'Puis-je supporter un financement ?', query: 'Puis-je supporter un financement ?' },
    { id: 'cashflow', label: 'Quels sont mes risques de trésorerie ?', query: 'Quels sont mes risques de trésorerie ?' },
    ...(multi ? [{ id: 'fragile-farm', label: 'Quelle ferme est la plus fragile financièrement ?', query: 'Quelle ferme est la plus fragile financièrement ?' }] : []),
    { id: 'profitability', label: 'Comment évolue ma rentabilité ?', query: 'Comment évolue ma rentabilité ?' },
  ];
}

export function filterFinancePropsByScope(props = {}, farmScope = {}) {
  if (!farmScope || farmScope.mode === 'all') return props;
  const farmId = farmScope.farmId;
  if (!farmId) return props;
  return scopedPropsForFarm(props, farmId);
}
