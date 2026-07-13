/**
 * Finance & Pilotage V3 - simulateur, DSCR enrichi, qualité données, multi-fermes avancé.
 * Extension de V2 sans modifier les moteurs V1/V2.
 */

import {
  buildCashFlowForecast,
  buildFinanceExportPayload,
  buildFinanceHeyHorizonQuestions,
  buildFinanceReconciliationView,
  buildFinanceSmartAlerts,
  buildFinancingView,
  buildMultiFarmFinanceContext,
  buildPayablesAging,
  buildReceivablesAging,
  buildRepaymentCapacity,
  REPAYMENT_CAPACITY_LABELS,
} from './financePilotageV2.js';
import {
  buildFinancePilotageInput,
  isFinanceStartupMode,
  buildFinanceSchedule,
  buildOfficialTreasuryView,
  buildProfitabilityView,
} from './financePilotageCore.js';
import { aggregateMissingProofTransactions } from '../modules/finance/financeVisionHelpers.js';
import { remainingForOrder } from './salesStatuses.js';
import { isFarmDemoModeEnabled } from './farmDemoMode.js';
import { rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);

export const FINANCE_SIMULATOR_STORAGE_KEY = 'horizon_finance_simulator_params';

export const PRUDENCE_LABELS = Object.freeze({
  low: 'Prudence faible',
  medium: 'Prudence moyenne',
  high: 'Prudence élevée',
});

export const DIRECT_FINANCE_EXPORT_KEYS = Object.freeze([
  'synthesis',
  'schedule',
  'repayment',
  'financing',
]);

export const DSCR_EXPLANATION = 'Le DSCR compare vos flux disponibles aux remboursements mensuels. Au-dessus de 1,25, la situation est généralement confortable pour une banque.';

const DEFAULT_SIMULATOR = Object.freeze({
  loanAmount: 0,
  durationMonths: 36,
  annualRate: 8,
  deferMonths: 0,
  personalContribution: 0,
});

export function readFinanceSimulatorParams() {
  if (typeof window === 'undefined') return { ...DEFAULT_SIMULATOR };
  try {
    const raw = JSON.parse(window.localStorage.getItem(FINANCE_SIMULATOR_STORAGE_KEY) || '{}');
    return {
      loanAmount: n(raw.loanAmount),
      durationMonths: Math.max(1, n(raw.durationMonths) || DEFAULT_SIMULATOR.durationMonths),
      annualRate: Math.max(0, n(raw.annualRate ?? DEFAULT_SIMULATOR.annualRate)),
      deferMonths: Math.max(0, n(raw.deferMonths)),
      personalContribution: n(raw.personalContribution),
    };
  } catch {
    return { ...DEFAULT_SIMULATOR };
  }
}

export function writeFinanceSimulatorParams(params = {}) {
  const next = {
    loanAmount: n(params.loanAmount),
    durationMonths: Math.max(1, n(params.durationMonths) || DEFAULT_SIMULATOR.durationMonths),
    annualRate: Math.max(0, n(params.annualRate ?? DEFAULT_SIMULATOR.annualRate)),
    deferMonths: Math.max(0, n(params.deferMonths)),
    personalContribution: n(params.personalContribution),
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FINANCE_SIMULATOR_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

/** Mensualité amortissement constant - formule standard, sans inventer de données. */
export function estimateMonthlyPayment({
  principal = 0,
  annualRate = 0,
  durationMonths = 36,
} = {}) {
  const amount = Math.max(0, n(principal));
  const months = Math.max(1, Math.round(n(durationMonths)));
  if (amount <= 0) return 0;
  const monthlyRate = n(annualRate) / 100 / 12;
  if (monthlyRate <= 0) return Math.round(amount / months);
  const factor = (1 + monthlyRate) ** months;
  return Math.round((amount * monthlyRate * factor) / (factor - 1));
}

export function resolveLoanParameters(props = {}, options = {}, userParams = {}) {
  const financing = buildFinancingView(props, options);
  const stored = userParams.loanAmount != null ? userParams : readFinanceSimulatorParams();
  const loanAmount = n(stored.loanAmount) || n(financing.soughtFunding) || 0;
  const durationMonths = Math.max(1, n(stored.durationMonths) || 36);
  const annualRate = Math.max(0, n(stored.annualRate ?? 8));
  const deferMonths = Math.max(0, n(stored.deferMonths));
  const personalContribution = n(stored.personalContribution) || n(financing.personalContribution) || 0;

  const estimatedMonthlyPayment = estimateMonthlyPayment({ principal: loanAmount, annualRate, durationMonths });
  const filled = loanAmount > 0 && durationMonths > 0;

  return {
    loanAmount,
    durationMonths,
    annualRate,
    deferMonths,
    personalContribution,
    estimatedMonthlyPayment,
    filled,
    hint: filled
      ? null
      : 'Renseignez les paramètres du financement pour obtenir une estimation plus précise.',
  };
}

export function buildEnhancedRepaymentCapacity(props = {}, options = {}, loanParams = {}) {
  const base = buildRepaymentCapacity(props, options);
  const loan = resolveLoanParameters(props, options, loanParams);
  const profitability = buildProfitabilityView(props);
  const monthlyOperating = (profitability.ready ? n(profitability.profit.operatingResult) : n(base.operatingResult)) / 12;

  const existingService = n(base.monthlyDebtService) || 0;
  const projectedService = loan.filled ? existingService + loan.estimatedMonthlyPayment : existingService;

  let dscr = base.dscr;
  let dscrSource = 'simplified';
  if (projectedService > 0 && monthlyOperating > 0) {
    dscr = Number((monthlyOperating / projectedService).toFixed(2));
    dscrSource = loan.filled ? 'loan_simulation' : (base.monthlyDebtService ? 'bp_debt_service' : 'simplified');
  }

  let capacityKey = base.capacityKey;
  if (dscr != null) {
    if (dscr < 1) capacityKey = 'low';
    else if (dscr < 1.25) capacityKey = 'watch';
    else if (dscr >= 1.5) capacityKey = 'strong';
    else capacityKey = 'ok';
  }

  const safetyMargin = n(base.availableCashFlow) - (loan.filled ? loan.estimatedMonthlyPayment * 12 : 0);

  return {
    ...base,
    loanParameters: loan,
    monthlyDebtService: projectedService || null,
    existingMonthlyDebtService: existingService || null,
    simulatedMonthlyPayment: loan.filled ? loan.estimatedMonthlyPayment : null,
    dscr,
    dscrSource,
    dscrExplanation: DSCR_EXPLANATION,
    safetyMargin,
    capacityKey,
    capacityLabel: REPAYMENT_CAPACITY_LABELS[capacityKey],
    preciseEstimateAvailable: loan.filled,
  };
}

export function buildFinancingSimulator(props = {}, options = {}, loanParams = {}) {
  const loan = resolveLoanParameters(props, options, loanParams);
  const capacity = buildEnhancedRepaymentCapacity(props, options, loanParams);
  const forecast = buildCashFlowForecast(props, options);

  if (!loan.filled) {
    return {
      ready: false,
      message: loan.hint,
      disclaimer: 'Simulation indicative à confirmer avec l\'établissement financier.',
      params: loan,
    };
  }

  const monthlyPayment = loan.estimatedMonthlyPayment;
  const totalRepaid = monthlyPayment * loan.durationMonths;
  const totalCost = Math.max(0, totalRepaid - loan.loanAmount);
  const annualCharge = monthlyPayment * 12;
  const availableCashFlow = n(capacity.availableCashFlow);
  const monthlyOperating = n(capacity.operatingResult) / 12;

  let prudence = 'medium';
  if (monthlyPayment > monthlyOperating * 0.4 || (forecast.ready && forecast.projection30 < monthlyPayment * 3)) {
    prudence = 'low';
  } else if (monthlyPayment <= monthlyOperating * 0.25 && dscrAbove(capacity.dscr, 1.5)) {
    prudence = 'high';
  }

  const vsCashFlow = availableCashFlow - annualCharge;

  return {
    ready: true,
    message: null,
    disclaimer: 'Simulation indicative à confirmer avec l\'établissement financier.',
    params: loan,
    monthlyPayment,
    totalCost,
    totalRepaid,
    annualCharge,
    availableCashFlow,
    vsCashFlow,
    prudence,
    prudenceLabel: PRUDENCE_LABELS[prudence],
    dscr: capacity.dscr,
    capacityLabel: capacity.capacityLabel,
  };
}

function dscrAbove(value, threshold) {
  return value != null && value >= threshold;
}

function hasDueDate(row = {}) {
  return Boolean(row.date_echeance || row.due_date);
}

export function buildFinanceDataQuality(props = {}, options = {}) {
  if (isFinanceStartupMode(props)) {
    return {
      score: null,
      issues: [],
      issueCount: 0,
      summary: 'En attente de données - enregistrez une vente, un paiement ou une dépense.',
      empty: true,
      insufficientData: true,
    };
  }

  const input = buildFinancePilotageInput(props);
  const reconciliation = buildFinanceReconciliationView(props, options);
  const missingProof = aggregateMissingProofTransactions(input.transactions);
  const receivablesAging = buildReceivablesAging(props, options);
  const payablesAging = buildPayablesAging(props, options);
  const financing = buildFinancingView(props, options);
  const profitability = buildProfitabilityView(props);

  const unreconciledPayments = reconciliation.anomalies.filter((row) => row.kind === 'payment_without_finance').length;
  const salesWithoutPayment = reconciliation.anomalies.filter((row) => row.kind === 'sale_without_payment').length;

  const receivablesWithoutDate = arr(input.salesOrders).filter((order) => {
    const remaining = remainingForOrder(order, input.payments);
    return remaining > 0 && !hasDueDate(order) && !order.date && !order.created_at;
  }).length;

  const debtsWithoutDueDate = arr(input.transactions).filter((row) => {
    const status = String(row.statut || row.status || '').toLowerCase();
    const type = String(row.type || '').toLowerCase();
    const unpaid = ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(status);
    const expense = ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(type);
    return unpaid && expense && n(row.montant ?? row.amount) > 0 && !hasDueDate(row);
  }).length + payablesAging.buckets.not_due.items.filter((item) => item.source === 'fournisseur' && !item.dueDate).length;

  const missingFinancingData = !financing.planName && financing.investmentNeed <= 0 && financing.soughtFunding <= 0;
  const incompleteCosts = profitability.ready && profitability.profit.chargesBeforeInvestments <= 0 && input.transactions.some((row) => {
    const type = String(row.type || '').toLowerCase();
    return ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(type);
  });

  const issues = [];

  if (missingProof.length) {
    issues.push({
      id: 'missing-proof',
      label: `${missingProof.length} transaction(s) sans preuve`,
      detail: profitability.ready
        ? `La rentabilité est calculée, mais ${missingProof.length} dépense(s) n'ont pas encore de justificatif.`
        : 'Certaines dépenses ne peuvent pas être vérifiées sans justificatif.',
      tab: 'Trésorerie',
      count: missingProof.length,
    });
  }
  if (unreconciledPayments) {
    issues.push({
      id: 'unreconciled',
      label: `${unreconciledPayments} paiement(s) non rapproché(s)`,
      detail: 'Des encaissements ne sont pas encore liés à une écriture finance.',
      tab: 'Réconciliation',
      count: unreconciledPayments,
    });
  }
  if (salesWithoutPayment) {
    issues.push({
      id: 'sales-unpaid',
      label: `${salesWithoutPayment} vente(s) sans paiement complet`,
      detail: 'Des ventes restent à encaisser ou à rapprocher.',
      tab: 'Créances',
      count: salesWithoutPayment,
    });
  }
  if (debtsWithoutDueDate) {
    issues.push({
      id: 'debts-no-date',
      label: `${debtsWithoutDueDate} dette(s) sans échéance`,
      detail: 'L\'échéancier et la prévision cash-flow seront plus précis avec des dates.',
      tab: 'Dettes',
      count: debtsWithoutDueDate,
    });
  }
  if (receivablesWithoutDate || receivablesAging.buckets.not_due.count > 0) {
    const count = receivablesWithoutDate || receivablesAging.buckets.not_due.count;
    issues.push({
      id: 'recv-no-date',
      label: `${count} créance(s) sans date claire`,
      detail: 'Ajoutez une date d\'échéance pour prioriser les relances.',
      tab: 'Créances',
      count,
    });
  }
  if (missingFinancingData) {
    issues.push({
      id: 'financing-missing',
      label: 'Données de financement incomplètes',
      detail: 'Le business plan ou les sources de financement ne sont pas encore renseignés.',
      tab: 'Financement',
      count: 1,
    });
  }
  if (incompleteCosts) {
    issues.push({
      id: 'costs-incomplete',
      label: 'Coûts incomplets',
      detail: 'Certaines charges métier ne sont pas encore intégrées à la rentabilité.',
      tab: 'Rentabilité',
      count: 1,
    });
  }

  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + Math.min(20, issue.count * 5), 0));

  return {
    score,
    issues,
    issueCount: issues.length,
    summary: issues.length
      ? `${issues.length} point(s) à compléter pour des calculs plus fiables.`
      : 'Qualité des données financières satisfaisante.',
    empty: issues.length === 0,
  };
}

export function buildFinancingAlerts(props = {}, options = {}, context = {}) {
  if (isFinanceStartupMode(props)) return [];

  const capacity = context.enhancedCapacity || buildEnhancedRepaymentCapacity(props, options, context.loanParams);
  const dataQuality = context.dataQuality || buildFinanceDataQuality(props, options);
  const financing = context.financing || buildFinancingView(props, options);
  const forecast = buildCashFlowForecast(props, options);
  const treasury = buildOfficialTreasuryView(props);
  const schedule = buildFinanceSchedule(props, options);

  const alerts = [];

  if (!capacity.existingMonthlyDebtService && !capacity.loanParameters?.filled) {
    alerts.push({
      id: 'debt-service-missing',
      message: 'Le service de dette n\'est pas renseigné.',
      severity: 'info',
      tab: 'Financement',
      action: 'Compléter le simulateur',
    });
  }

  const weekPayables = (schedule.buckets?.overdue?.outflows || [])
    .concat(schedule.buckets?.today?.outflows || [])
    .concat(schedule.buckets?.week?.outflows || [])
    .reduce((sum, row) => sum + row.amount, 0);
  if (weekPayables > treasury.treasuryAvailable && weekPayables > 0) {
    alerts.push({
      id: 'supplier-treasury',
      message: 'Les échéances fournisseurs dépassent la trésorerie disponible.',
      severity: 'warn',
      tab: 'Dettes',
      action: 'Planifier les paiements',
    });
  }

  if (forecast.ready && forecast.risk === 'high') {
    alerts.push({
      id: 'cashflow-30-fin',
      message: 'Le cash-flow prévisionnel à 30 jours devient faible.',
      severity: 'warn',
      tab: 'Échéancier',
      action: 'Voir la prévision',
    });
  }

  if (financing.documentCount < 2 && (financing.investmentNeed > 0 || financing.soughtFunding > 0)) {
    alerts.push({
      id: 'bank-docs-missing',
      message: 'Le dossier de financement manque de pièces justificatives.',
      severity: 'info',
      tab: 'Financement',
      action: 'Ajouter des documents',
    });
  }

  if (capacity.capacityKey === 'watch' || capacity.capacityKey === 'low') {
    alerts.push({
      id: 'repayment-watch',
      message: 'La capacité de remboursement est à surveiller.',
      severity: capacity.capacityKey === 'low' ? 'warn' : 'info',
      tab: 'Financement',
      action: 'Ajuster le simulateur',
    });
  }

  const financingIssue = dataQuality.issues.find((issue) => issue.id === 'financing-missing');
  if (financingIssue) {
    alerts.push({
      id: 'financing-data',
      message: financingIssue.detail,
      severity: 'info',
      tab: 'Financement',
      action: 'Compléter le BP',
    });
  }

  return alerts;
}

export function buildAdvancedMultiFarmContext(props = {}, options = {}) {
  const base = buildMultiFarmFinanceContext(props, options);
  if (base.singleFarm || !base.comparison?.length) {
    return { ...base, advanced: null, comparison: base.comparison };
  }

  const scopeFarm = (farmId) => {
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
    };
  };

  const comparison = base.comparison.map((row) => {
    const farmProps = scopeFarm(row.farmId);
    const forecast = buildCashFlowForecast(farmProps, options);
    const input = buildFinancePilotageInput(farmProps);
    const hasData = input.transactions.length + input.salesOrders.length + input.payments.length > 0
      || row.treasury !== 0 || row.receivables > 0 || row.payables > 0;
    return {
      ...row,
      cashFlow30: forecast.ready ? forecast.projection30 : null,
      dataComplete: hasData,
      priorityAction: row.nextAction,
      riskBadge: row.risk,
    };
  });

  const withData = comparison.filter((row) => row.dataComplete);
  const pick = (list, key, direction = 'max') => {
    if (!list.length) return null;
    return [...list].sort((a, b) => (direction === 'max' ? b[key] - a[key] : a[key] - b[key]))[0];
  };

  const highlights = withData.length ? {
    mostProfitable: pick(withData, 'margin'),
    weakestTreasury: pick(withData, 'treasury', 'min'),
    mostReceivables: pick(withData, 'receivables'),
    mostDebts: pick(withData, 'payables'),
    riskiest: pick(withData, 'treasury', 'min'),
    mostStable: pick(withData.filter((row) => row.risk === 'Faible'), 'margin') || pick(withData, 'margin'),
  } : null;

  return {
    ...base,
    comparison,
    advanced: {
      highlights,
      incompleteFarms: comparison.filter((row) => !row.dataComplete).length,
    },
  };
}

export function buildFinanceDemoPresentation() {
  const enabled = isFarmDemoModeEnabled();
  return {
    enabled,
    label: 'Mode démonstration',
    message: enabled
      ? 'Vue présentable pour banque ou investisseur - aucune fausse donnée n\'est injectée en production.'
      : null,
    presentationTips: enabled ? [
      'Commencez par la situation financière et la trésorerie.',
      'Montrez le simulateur de financement avec des paramètres prudents.',
      'Exportez la synthèse PDF directement depuis Finance.',
    ] : [],
  };
}

export function buildFinanceHeyHorizonQuestionsV3(options = {}) {
  const multi = options.farmScope?.mode === 'all';
  const extra = [
    { id: 'borrow-prudent', label: 'Combien puis-je emprunter prudemment ?', query: 'Combien puis-je emprunter prudemment ?' },
    { id: 'receivables-priority', label: 'Quelles créances dois-je relancer en priorité ?', query: 'Quelles créances dois-je relancer en priorité ?' },
    { id: 'debts-week', label: 'Quelles dettes dois-je payer cette semaine ?', query: 'Quelles dettes dois-je payer cette semaine ?' },
    { id: 'treasury-30', label: 'Ma trésorerie tiendra-t-elle 30 jours ?', query: 'Ma trésorerie tiendra-t-elle 30 jours ?' },
    ...(multi ? [{ id: 'fragile-farm', label: 'Quelle ferme est la plus fragile financièrement ?', query: 'Quelle ferme est la plus fragile financièrement ?' }] : []),
    { id: 'bank-docs', label: 'Quels documents financiers manquent pour la banque ?', query: 'Quels documents financiers manquent pour la banque ?' },
    { id: 'today-finance', label: 'Que dois-je faire aujourd\'hui côté finances ?', query: 'Que dois-je faire aujourd\'hui côté finances ?' },
  ];
  const base = buildFinanceHeyHorizonQuestions(options);
  const merged = [...extra];
  base.forEach((item) => {
    if (!merged.some((row) => row.id === item.id)) merged.push(item);
  });
  return merged.slice(0, 8);
}

export function buildFinanceAlertsV3(props = {}, options = {}, context = {}) {
  const general = buildFinanceSmartAlerts(props, options);
  const financing = buildFinancingAlerts(props, options, context);
  const seen = new Set();
  return [...financing, ...general].filter((alert) => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  }).slice(0, 10);
}

export function buildFinanceDirectExports(props = {}, options = {}) {
  const full = buildFinanceExportPayload(props, options);
  const enhanced = buildEnhancedRepaymentCapacity(props, options, options.loanParams);
  const financing = buildFinancingView(props, options);

  return {
    synthesis: full.synthesis,
    schedule: full.schedule,
    repayment: {
      ...full.repayment,
      extra: {
        ...full.repayment.extra,
        'Mensualité simulée': enhanced.simulatedMonthlyPayment ?? '-',
        'Service de dette mensuel': enhanced.monthlyDebtService ?? '-',
        DSCR: enhanced.dscr ?? '-',
        'Capacité': enhanced.capacityLabel,
      },
    },
    financing: {
      ...full.financing,
      extra: {
        ...full.financing.extra,
        'Montant recherché': financing.soughtFunding,
        'Apport personnel': financing.personalContribution,
        'Documents disponibles': financing.documentCount,
      },
    },
  };
}

export function buildFinancingViewV3(props = {}, options = {}) {
  const financing = buildFinancingView(props, options);
  const enhancedRepayment = buildEnhancedRepaymentCapacity(props, options, options.loanParams);
  return {
    ...financing,
    repayment: enhancedRepayment,
  };
}
