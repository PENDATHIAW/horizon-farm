/**
 * Dashboard V3 — brief premium, comparaisons temporelles, dynamique, présentation.
 * Sans LLM obligatoire — règles métier sur données existantes.
 */

import { fmtCurrency } from '../../utils/format.js';
import { remainingForOrder } from '../../utils/salesStatuses.js';
import { rowDateValue } from '../../utils/periodScope.js';
import { buildHeyHorizonFarmContext } from '../../utils/farmConsolidation.js';
import { formatFarmActivitiesLabel } from '../../config/farmAdaptation.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const money = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const paid = (row = {}) => n(row.montant ?? row.amount ?? row.montant_paye ?? row.paid_amount);

function parseRowDate(row = {}) {
  const raw = rowDateValue(row);
  if (!raw) return null;
  const date = new Date(String(raw).slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInRange(row = {}, start = null, end = null) {
  const date = parseRowDate(row);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function weekRange(reference = new Date(), offsetWeeks = 0) {
  const date = new Date(reference);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset + offsetWeeks * 7);
  const start = startOfDay(date);
  const end = endOfDay(new Date(start));
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function monthRange(reference = new Date(), offsetMonths = 0) {
  const date = new Date(reference.getFullYear(), reference.getMonth() + offsetMonths, 1);
  const start = startOfDay(date);
  const end = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { start, end };
}

function sumSales(orders = [], start, end) {
  return arr(orders).filter((row) => isInRange(row, start, end)).reduce((sum, row) => sum + money(row), 0);
}

function sumPayments(payments = [], start, end) {
  return arr(payments).filter((row) => isInRange(row, start, end)).reduce((sum, row) => sum + paid(row), 0);
}

function sumExpenses(transactions = [], start, end) {
  return arr(transactions)
    .filter((row) => ['sortie', 'depense', 'dépense', 'achat', 'expense'].includes(String(row.type || '').toLowerCase()))
    .filter((row) => isInRange(row, start, end))
    .reduce((sum, row) => sum + money(row), 0);
}

function countAlerts(alertes = [], start, end) {
  return arr(alertes).filter((row) => isInRange(row, start, end)).length;
}

function sumProductionEggs(logs = [], start, end) {
  return arr(logs)
    .filter((row) => isInRange(row, start, end))
    .reduce((sum, row) => sum + n(row.oeufs_produits ?? row.eggs_count ?? row.quantite), 0);
}

function countCriticalStock(stocks = []) {
  return arr(stocks).filter((row) => {
    const qty = n(row.quantite ?? row.quantity ?? row.stock);
    const threshold = n(row.seuil ?? row.threshold ?? row.stock_min);
    return threshold > 0 && qty <= threshold;
  }).length;
}

function openReceivables(orders = [], payments = []) {
  return arr(orders).reduce((sum, order) => sum + remainingForOrder(order, payments), 0);
}

export function computeComparisonTrend(current = 0, previous = 0, { hasData = true } = {}) {
  if (!hasData) return { trend: 'unavailable', label: 'Donnée indisponible', delta: null };
  if (current === previous) return { trend: 'stable', label: 'Stable', delta: 0 };
  if (current > previous) return { trend: 'up', label: 'En hausse', delta: current - previous };
  return { trend: 'down', label: 'En baisse', delta: current - previous };
}

function buildMetricComparison(id, label, current, previous, options = {}) {
  const { formatValue = (v) => String(v), snapshot = false } = options;
  const trendInfo = computeComparisonTrend(current, previous, {
    hasData: snapshot || current > 0 || previous > 0 || (current === 0 && previous === 0),
  });
  return {
    id,
    label,
    current,
    previous,
    currentLabel: formatValue(current),
    previousLabel: formatValue(previous),
    ...trendInfo,
    snapshot,
  };
}

function buildPeriodComparison(periodKey, periodLabel, ranges, props = {}) {
  const orders = arr(props.salesOrdersAll || props.salesOrders);
  const payments = arr(props.paymentsAll || props.payments);
  const transactions = arr(props.transactionsAll || props.transactions);
  const alertes = arr(props.alertes);
  const productionLogs = arr(props.productionLogs);
  const stocks = arr(props.stocks);

  const { current, previous } = ranges;
  const metrics = [
    buildMetricComparison('sales', 'Ventes', sumSales(orders, current.start, current.end), sumSales(orders, previous.start, previous.end), { formatValue: fmtCurrency }),
    buildMetricComparison('collections', 'Encaissements', sumPayments(payments, current.start, current.end), sumPayments(payments, previous.start, previous.end), { formatValue: fmtCurrency }),
    buildMetricComparison('expenses', 'Dépenses', sumExpenses(transactions, current.start, current.end), sumExpenses(transactions, previous.start, previous.end), { formatValue: fmtCurrency }),
    buildMetricComparison('treasury', 'Trésorerie (résultat période)', sumPayments(payments, current.start, current.end) - sumExpenses(transactions, current.start, current.end), sumPayments(payments, previous.start, previous.end) - sumExpenses(transactions, previous.start, previous.end), { formatValue: fmtCurrency }),
    buildMetricComparison('receivables', 'Créances ouvertes', openReceivables(orders, payments), openReceivables(orders, payments), { formatValue: fmtCurrency, snapshot: true }),
    buildMetricComparison('alerts', 'Alertes ouvertes', countAlerts(alertes, current.start, current.end), countAlerts(alertes, previous.start, previous.end)),
    buildMetricComparison('production', 'Production (œufs)', sumProductionEggs(productionLogs, current.start, current.end), sumProductionEggs(productionLogs, previous.start, previous.end)),
    buildMetricComparison('stock', 'Stock critique', countCriticalStock(stocks), countCriticalStock(stocks), { snapshot: true }),
  ];

  const temporalMetrics = metrics.filter((row) => !row.snapshot);
  const hasActivity = temporalMetrics.some((row) => row.current > 0 || row.previous > 0);

  return {
    key: periodKey,
    label: periodLabel,
    metrics,
    ready: hasActivity,
    message: hasActivity ? null : 'Comparaison disponible après quelques jours d\'activité.',
  };
}

/** Comparaisons aujourd'hui / hier, semaine / semaine précédente, mois / mois précédent. */
export function buildTemporalComparisons(props = {}, referenceDate = new Date()) {
  const today = startOfDay(referenceDate);
  const yesterday = startOfDay(new Date(today));
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    buildPeriodComparison('today', 'Aujourd\'hui vs hier', {
      current: { start: today, end: endOfDay(today) },
      previous: { start: yesterday, end: endOfDay(yesterday) },
    }, props),
    buildPeriodComparison('week', 'Cette semaine vs semaine précédente', {
      current: weekRange(referenceDate, 0),
      previous: weekRange(referenceDate, -1),
    }, props),
    buildPeriodComparison('month', 'Ce mois vs mois précédent', {
      current: monthRange(referenceDate, 0),
      previous: monthRange(referenceDate, -1),
    }, props),
  ];
}

function situationWord(summary = {}, priorities = []) {
  if (summary.startupMode) return 'en phase de démarrage';
  if (priorities.some((p) => p.tone === 'red')) return 'sous tension sur certains points';
  if (summary.cashNet < 0) return 'fragile côté trésorerie';
  if (summary.alertesOuvertes > 3) return 'active avec des alertes à traiter';
  return 'stable';
}

function treasurySentence(summary = {}) {
  if (summary.cashNet >= 0 && summary.receivable === 0) return 'La trésorerie reste correcte et les créances sont maîtrisées.';
  if (summary.cashNet >= 0 && summary.receivable > 0) return `La trésorerie reste correcte, mais ${summary.receivable > 0 ? 'des créances demandent un suivi' : 'le recouvrement reste à surveiller'}.`;
  if (summary.cashNet < 0) return 'La trésorerie demande une attention immédiate.';
  return 'La trésorerie est suivie dans l\'ERP.';
}

function stockSentence(summary = {}, props = {}) {
  const low = n(summary.stockSummary?.lowStockCount || summary.stockBas);
  if (low > 0) return `Le stock compte ${low} produit(s) sous le seuil — un réapprovisionnement est à prévoir.`;
  const feedCritical = arr(props.stocks).some((row) => /aliment|provende|feed/i.test(`${row.produit || row.nom || ''}`) && n(row.quantite ?? row.quantity) <= n(row.seuil ?? row.threshold));
  if (feedCritical) return 'Le stock d\'aliment nécessite une attention dans les prochains jours.';
  return null;
}

/** Brief dirigeant premium — texte naturel, sans jargon ERP. */
export function buildPremiumExecutiveBrief(options = {}) {
  const {
    displayName = 'Exploitant',
    summary = {},
    priorities = [],
    farmScope = {},
    activeFarm = null,
    accessibleFarms = [],
    demoMode = false,
    dynamics = null,
  } = options;

  const scopeLabel = farmScope?.mode === 'all'
    ? `sur l'ensemble de vos ${accessibleFarms.filter((f) => f.status !== 'archived').length || accessibleFarms.length} fermes`
    : activeFarm?.name
      ? `pour ${activeFarm.name}`
      : 'sur votre exploitation';

  const paragraphs = [];
  const greeting = `Bonjour ${displayName}.`;
  const intro = summary.startupMode
    ? `Votre projet ${scopeLabel} est en phase de démarrage — chaque première saisie renforce le pilotage.`
    : `Aujourd'hui, la situation ${scopeLabel} est ${situationWord(summary, priorities)}.`;

  paragraphs.push(`${greeting} ${intro}`);

  if (summary.ca > 0) {
    paragraphs.push(`Les ventes de la période atteignent ${fmtCurrency(summary.ca)}${summary.encaisse > 0 ? `, avec ${fmtCurrency(summary.encaisse)} déjà encaissés` : ''}.`);
  } else if (!summary.startupMode) {
    paragraphs.push('Aucune vente enregistrée sur la période sélectionnée.');
  }

  paragraphs.push(treasurySentence(summary));

  if (summary.receivable > 0) {
    const count = priorities.find((p) => p.id === 'receivables');
    paragraphs.push(count
      ? `${count.title.toLowerCase()} — ${fmtCurrency(summary.receivable)} restent à encaisser.`
      : `${fmtCurrency(summary.receivable)} de créances clients restent ouverts.`);
  }

  const stockLine = stockSentence(summary, options.props || {});
  if (stockLine) paragraphs.push(stockLine);

  if (summary.production > 0) {
    paragraphs.push(`La production enregistre ${Number(summary.production).toLocaleString('fr-FR')} œufs sur la période.`);
  }

  if (summary.alertesOuvertes > 0) {
    paragraphs.push(`${summary.alertesOuvertes} alerte(s) demandent votre attention.`);
  }

  if (dynamics?.label) {
    paragraphs.push(`La dynamique de l'exploitation est ${dynamics.label.toLowerCase()}.`);
  }

  const nextAction = priorities[0];
  if (nextAction) {
    paragraphs.push(`Prochaine action prioritaire : ${nextAction.title.toLowerCase()}.`);
  } else if (!summary.startupMode) {
    paragraphs.push('Aucune urgence critique — vous pouvez avancer sereinement sur le plan de la semaine.');
  }

  if (demoMode) {
    paragraphs.push('Mode démonstration — certaines fermes affichées sont fictives.');
  }

  const sections = [
    { id: 'situation', label: 'Situation générale', text: paragraphs[0] },
    { id: 'ventes', label: 'Ventes & encaissements', text: paragraphs.find((p) => /ventes|encaiss/i.test(p)) || '—' },
    { id: 'tresorerie', label: 'Trésorerie', text: paragraphs.find((p) => /trésorerie|tresorerie/i.test(p)) || treasurySentence(summary) },
    { id: 'creances', label: 'Créances', text: paragraphs.find((p) => /créance|creance/i.test(p)) || (summary.receivable > 0 ? `${fmtCurrency(summary.receivable)} ouverts.` : 'Créances maîtrisées.') },
    { id: 'stock', label: 'Stock', text: stockLine || 'Stocks globalement suivis.' },
    { id: 'production', label: 'Production', text: summary.production > 0 ? `${Number(summary.production).toLocaleString('fr-FR')} œufs.` : 'Production à renseigner si applicable.' },
    { id: 'alertes', label: 'Alertes', text: summary.alertesOuvertes > 0 ? `${summary.alertesOuvertes} alerte(s) ouverte(s).` : 'Pas d\'alerte urgente.' },
    { id: 'action', label: 'Prochaine action', text: nextAction ? nextAction.title : 'Pilotage à jour.' },
  ];

  return {
    title: 'Brief dirigeant',
    paragraphs,
    speechText: paragraphs.join(' '),
    sections,
    nextAction: nextAction || null,
    demoMode,
  };
}

export function buildDashboardVoiceBriefText(brief = {}) {
  return String(brief.speechText || brief.paragraphs?.join(' ') || '').trim();
}

export function isSpeechSynthesisSupported() {
  return typeof globalThis !== 'undefined'
    && typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Score dynamique — En progression / Stable / À surveiller / En recul. */
export function buildExploitationDynamics(summary = {}, comparisons = []) {
  const week = comparisons.find((row) => row.key === 'week') || null;
  const month = comparisons.find((row) => row.key === 'month') || null;
  const source = month?.ready ? month : week?.ready ? week : null;

  if (!source) {
    return {
      score: null,
      label: 'À surveiller',
      status: 'watch',
      reasons: ['Comparaison disponible après quelques jours d\'activité.'],
      ready: false,
    };
  }

  const signals = source.metrics.filter((row) => !row.snapshot && row.trend !== 'unavailable');
  const up = signals.filter((row) => row.trend === 'up').length;
  const down = signals.filter((row) => row.trend === 'down').length;
  const reasons = [];

  signals.forEach((row) => {
    if (row.trend === 'up' && ['sales', 'collections', 'production'].includes(row.id)) {
      reasons.push(`${row.label} en hausse`);
    }
    if (row.trend === 'down' && ['sales', 'collections'].includes(row.id)) {
      reasons.push(`${row.label} en baisse`);
    }
    if (row.trend === 'up' && ['expenses', 'alerts', 'stock'].includes(row.id)) {
      reasons.push(`${row.label} à surveiller`);
    }
  });

  if (summary.receivable > summary.encaisse * 0.5 && summary.receivable > 0) {
    reasons.push('Créances élevées par rapport aux encaissements');
  }
  if (n(summary.stockSummary?.lowStockCount) > 0) {
    reasons.push(`${summary.stockSummary.lowStockCount} produit(s) sous seuil stock`);
  }

  let label = 'Stable';
  let status = 'stable';
  if (up >= down + 2 && down <= 1) {
    label = 'En progression';
    status = 'up';
  } else if (down >= up + 2) {
    label = 'En recul';
    status = 'down';
  } else if (down > up || summary.alertesOuvertes > 2 || summary.cashNet < 0) {
    label = 'À surveiller';
    status = 'watch';
  }

  if (!reasons.length) {
    reasons.push('Activité régulière sans variation marquée');
  }

  return {
    score: status === 'up' ? 75 : status === 'stable' ? 60 : status === 'watch' ? 45 : 30,
    label,
    status,
    reasons: reasons.slice(0, 4),
    ready: true,
    periodLabel: source.label,
  };
}

const ACTIVE_FARM_QUESTIONS = [
  'Résume cette ferme.',
  'Quelles sont les priorités ?',
  'Quels sont les risques ?',
  'Comment évolue la situation ?',
  'Que dois-je faire aujourd\'hui ?',
];

const ALL_FARMS_QUESTIONS = [
  'Résume toutes les fermes.',
  'Compare les fermes.',
  'Quelle ferme est la plus performante ?',
  'Quelle ferme est la plus à risque ?',
  'Où dois-je agir en priorité ?',
];

export function buildDashboardQuickQuestions(farmScope = {}, accessibleFarms = [], dataProps = {}) {
  const context = buildHeyHorizonFarmContext({
    farmScope,
    accessibleFarms,
    activeFarm: dataProps.activeFarm,
    sales_orders: dataProps.salesOrdersAll || dataProps.salesOrders,
    payments: dataProps.paymentsAll || dataProps.payments,
    finances: dataProps.transactionsAll || dataProps.transactions,
    stock: dataProps.stocks,
    alertes_center: dataProps.alertes,
    taches: dataProps.taches,
    animaux: dataProps.animaux,
    avicole: dataProps.lotsData || dataProps.lots,
    cultures: dataProps.cultures,
  });

  const base = farmScope?.mode === 'all' && accessibleFarms.filter((f) => f.status !== 'archived').length > 1
    ? ALL_FARMS_QUESTIONS
    : ACTIVE_FARM_QUESTIONS;

  const merged = [...new Set([...base, ...arr(context.suggested_questions)])].slice(0, 6);
  return merged.map((question, index) => ({ id: `q-${index}`, question }));
}

export function buildPresentationModeData(options = {}) {
  const {
    displayName = 'Exploitant',
    summary = {},
    pilotage = {},
    brief = {},
    comparisons = [],
    dynamics = {},
    farmScope = {},
    activeFarm = null,
    allFarmsContext = null,
    demoMode = false,
    locationCard = null,
  } = options;

  const farmLabel = farmScope?.mode === 'all'
    ? 'Toutes les fermes'
    : activeFarm?.name || 'Exploitation';

  return {
    farmLabel,
    activities: activeFarm ? formatFarmActivitiesLabel(activeFarm.activity_type) : 'Consolidé multi-fermes',
    displayName,
    keyFigures: [
      { label: 'CA période', value: fmtCurrency(summary.ca) },
      { label: 'Trésorerie', value: fmtCurrency(summary.cashNet) },
      { label: 'Créances', value: fmtCurrency(summary.receivable) },
      { label: 'Encaissé', value: fmtCurrency(summary.encaisse) },
    ],
    exploitationScore: pilotage.exploitation?.score,
    investorScore: pilotage.investor?.score,
    priorities: pilotage.priorities || [],
    brief,
    comparisons: comparisons.filter((row) => row.ready),
    dynamics,
    allFarmsContext,
    locationCard,
    demoMode,
    investorModule: 'objectifs_croissance',
    investorTab: 'Financeurs',
  };
}

export function buildSingleFarmLocationCard(farm = {}, summary = {}, _weather = {}, adaptedAlerts = []) {
  if (!farm?.id) return null;
  return {
    id: farm.id,
    name: farm.name,
    region: farm.region || '—',
    commune: farm.settings?.location_details?.commune || farm.location || farm.ville || '—',
    country: farm.country || 'SN',
    latitude: farm.latitude,
    longitude: farm.longitude,
    activities: formatFarmActivitiesLabel(farm.activity_type),
    status: farm.status || 'active',
    score: summary.exploitationScore ?? null,
    alerts: summary.alertesOuvertes ?? 0,
    mainAlerts: adaptedAlerts.slice(0, 3),
  };
}
