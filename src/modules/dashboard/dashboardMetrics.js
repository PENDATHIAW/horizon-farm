import { buildDecisionCenterPlan, annualRevenueTarget, monthlyRevenueTargets } from '../../services/growthDecisionEngine';
import { remainingForOrder } from '../../utils/salesStatuses';
import { buildDashboardTodayActions } from '../../utils/dashboardWorkflows';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../../utils/avicoleMetrics';
import { resolveAvicoleLotKind } from '../../utils/avicoleActivity';
import { toNumber, fmtCurrency } from '../../utils/format';
import { formatPeriodScopeLabel, normalizePeriodScope, resolvePeriodContext, rowMatchesMonthKeys } from '../../utils/periodScope';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (row = {}) => Number(row?.montant ?? row?.amount ?? row?.total ?? row?.montant_total ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;

const CLOSED_ANIMAL_WORDS = ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'];
const isClosedAnimal = (row = {}) => CLOSED_ANIMAL_WORDS.some((word) => lower(row.status || row.statut).includes(word));

const cultureRecordType = (row = {}) => lower(row.record_type || row.type_fiche || 'culture');
const parcelLabel = (row = {}) => String(row.parcelle_code || row.parcelle_nom || row.parcelle || row.nom || '').trim();
const CLOSED_PARCEL_WORDS = ['archive', 'archivé', 'supprime', 'supprimé', 'ferme', 'fermé', 'inactive', 'inactif'];

function isActiveParcelRecord(row = {}) {
  const status = lower(row.statut || row.status || 'actif');
  return !CLOSED_PARCEL_WORDS.some((word) => status.includes(word));
}

function surfaceToM2(row = {}) {
  const surface = toNumber(row.surface_exploitable ?? row.surface);
  if (surface <= 0) return 0;
  const unit = lower(String(row.unite_surface || row.unite || 'm²').replace(/\s/g, ''));
  if (unit === 'ha' || unit === 'hectare' || unit === 'hectares') return surface * 10000;
  return surface;
}

/** Surface totale des parcelles de la ferme (m²) — fiches parcelle ou déduction cultures actives. */
export function computeFarmParcelSurfaceM2(cultures = []) {
  const rows = arr(cultures);
  const parcelRecords = rows.filter((row) => cultureRecordType(row) === 'parcelle' && isActiveParcelRecord(row));
  if (parcelRecords.length) {
    return parcelRecords.reduce((sum, row) => sum + surfaceToM2(row), 0);
  }
  const byParcel = new Map();
  rows
    .filter((row) => cultureRecordType(row) === 'culture' && !['termine', 'perdu', 'archive', 'archivé'].includes(lower(row.statut || row.status)))
    .forEach((row) => {
      const key = lower(parcelLabel(row));
      if (!key || key.includes('non renseign')) return;
      const area = surfaceToM2(row);
      if (area <= 0) return;
      byParcel.set(key, Math.max(byParcel.get(key) || 0, area));
    });
  return [...byParcel.values()].reduce((sum, value) => sum + value, 0);
}

/**
 * Effectifs exploitation — animaux unitaires, lots avicoles actifs, surface parcelles.
 * Se met à jour via les CRUD animaux / avicole / cultures (ventes, mortalités, naissances, achats…).
 */
export function computeFarmHeadcount({ animaux = [], lots = [], cultures = [] } = {}) {
  const activeAnimalRows = arr(animaux).filter((row) => !isClosedAnimal(row));
  const activeLotRows = arr(lots).filter(avicoleHasActiveBirds);

  let effectifChair = 0;
  let effectifPondeuses = 0;
  let effectifAvicoleOther = 0;
  let activeLotsChair = 0;
  let activeLotsPondeuses = 0;

  activeLotRows.forEach((lot) => {
    const count = avicoleActiveCount(lot);
    const kind = resolveAvicoleLotKind(lot);
    if (kind === 'pondeuse') {
      effectifPondeuses += count;
      activeLotsPondeuses += 1;
    } else if (kind === 'chair') {
      effectifChair += count;
      activeLotsChair += 1;
    } else {
      effectifAvicoleOther += count;
    }
  });

  const activeAvicole = effectifChair + effectifPondeuses + effectifAvicoleOther;

  return {
    total: activeAnimalRows.length + activeAvicole,
    activeAnimals: activeAnimalRows.length,
    activeAvicole,
    effectifChair,
    effectifPondeuses,
    effectifAvicoleOther,
    activeLots: activeLotRows.length,
    activeLotsChair,
    activeLotsPondeuses,
    parcelSurfaceM2: computeFarmParcelSurfaceM2(cultures),
  };
}

export function formatFarmHeadcountDetail(headcount = {}) {
  const fmt = (value = 0) => Number(value || 0).toLocaleString('fr-FR');
  const parts = [];
  if (Number(headcount.activeAnimals || 0) > 0) {
    parts.push(`${fmt(headcount.activeAnimals)} animaux`);
  }
  parts.push(`${fmt(headcount.effectifChair)} chair`);
  parts.push(`${fmt(headcount.effectifPondeuses)} pondeuses`);
  const m2 = Math.round(Number(headcount.parcelSurfaceM2 || 0));
  if (m2 > 0) parts.push(`${m2.toLocaleString('fr-FR')} m²`);
  return parts.join(' · ');
}

const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.stock_min ?? row.minimum_stock);
const stockUnitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);

/** Résumé stock — même logique que Stocks / Achats & Stock (seuil > 0 pour « sous seuil »). */
export function computeStockSummary(stocks = []) {
  const rows = arr(stocks);
  const lowStock = rows.filter((row) => {
    const threshold = stockThreshold(row);
    return threshold > 0 && stockQty(row) <= threshold;
  });
  const available = rows.filter((row) => stockQty(row) > 0);
  const stockValue = rows.reduce((sum, row) => sum + stockQty(row) * stockUnitPrice(row), 0);
  return {
    totalProducts: rows.length,
    availableProducts: available.length,
    lowStockCount: lowStock.length,
    stockValue,
  };
}

export function formatStockDetail(summary = {}) {
  const low = Number(summary.lowStockCount || 0);
  const available = Number(summary.availableProducts || 0);
  const parts = [`${available} en stock`];
  if (low > 0) parts.unshift(`${low} sous seuil`);
  return parts.join(' · ');
}

const EGGS_PER_TABLET = 30;

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKeyFromValue(value) {
  const date = asDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function resolvePeriodContextLocal(scope = {}) {
  return resolvePeriodContext(scope);
}

function rowDateValue(row = {}) {
  return row.date || row.date_paiement || row.payment_date || row.date_commande || row.order_date || row.created_at || '';
}

export function formatMonthDelta(delta, { unit = '', formatValue = (value) => String(value) } = {}) {
  const value = Number(delta || 0);
  if (value === 0) return '±0 vs mois dernier';
  const sign = value > 0 ? '+' : '';
  const suffix = unit ? ` ${unit}` : '';
  return `${sign}${formatValue(value)}${suffix} vs mois dernier`;
}

function eggsFromProductionLog(row = {}) {
  return toNumber(row.oeufs_produits ?? row.eggs_count ?? row.eggs ?? row.quantite);
}

function isEggSale(order = {}) {
  const text = lower(`${order.product_name || order.produit || ''} ${order.source_label || ''} ${order.sale_kind || ''} ${order.unit || order.unite || ''} ${order.source_type || ''}`);
  if (order.sale_kind === 'oeufs_tablettes') return true;
  if (order.source_type === 'lot_avicole' && /oeuf|œuf|tablette|ponte|plateau/.test(text)) return true;
  return /oeuf|œuf|tablette|plateau|ponte|alvéole|alveole/.test(text);
}

function eggsFromSale(order = {}) {
  const explicit = toNumber(order.eggs_quantity ?? order.oeufs_quantity ?? order.oeufs_vendus ?? order.eggs_sold);
  if (explicit > 0) return explicit;
  const qty = toNumber(order.quantity ?? order.quantite);
  const unit = lower(order.unit || order.unite || '');
  if (unit.includes('tablette') || unit.includes('plateau')) return qty * EGGS_PER_TABLET;
  if (isEggSale(order) && qty > 0) return qty;
  return 0;
}

function tabletsFromSale(order = {}) {
  const explicit = toNumber(order.tablettes_quantity ?? order.tablettes_vendues ?? order.plateaux_vendus);
  if (explicit > 0) return explicit;
  const qty = toNumber(order.quantity ?? order.quantite);
  const unit = lower(order.unit || order.unite || '');
  if (unit.includes('tablette') || unit.includes('plateau') || order.sale_kind === 'oeufs_tablettes') return qty;
  if (isEggSale(order)) return tabletsFromEggs(eggsFromSale(order));
  return 0;
}

function tabletsFromEggs(eggs = 0) {
  return Math.floor(Math.max(0, toNumber(eggs)) / EGGS_PER_TABLET);
}

function sumProductionEggs(logs = [], monthKeys = null) {
  return arr(logs)
    .filter((row) => !monthKeys || rowMatchesMonthKeys(row, monthKeys))
    .reduce((sum, row) => sum + eggsFromProductionLog(row), 0);
}

function sumTabletSales(orders = [], monthKeys = null) {
  return arr(orders)
    .filter(isEggSale)
    .filter((row) => !monthKeys || rowMatchesMonthKeys(row, monthKeys))
    .reduce((sum, row) => sum + tabletsFromSale(row), 0);
}

/** Ponte — période sélectionnée, cumuls ramassage/vente, delta vs mois précédent. */
export function computeEggProductionSummary(productionLogs = [], salesOrders = [], periodScope = {}) {
  const { mode, monthKeys, compareMonthKey, isSingleMonth } = resolvePeriodContextLocal(periodScope);
  const logs = arr(productionLogs);
  const orders = arr(salesOrders);

  const totalEggs = sumProductionEggs(logs);
  const eggsPeriod = mode === 'all' ? totalEggs : sumProductionEggs(logs, monthKeys);
  const eggsCompare = isSingleMonth ? sumProductionEggs(logs, [compareMonthKey]) : 0;
  const tablettesSoldAllTime = sumTabletSales(orders);
  const tablettesSoldPeriod = mode === 'all' ? tablettesSoldAllTime : sumTabletSales(orders, monthKeys);
  const tablettesSoldCompare = isSingleMonth ? sumTabletSales(orders, [compareMonthKey]) : 0;

  return {
    mode,
    monthKeys,
    isSingleMonth,
    eggsPeriod,
    eggsAllTime: totalEggs,
    tablettesSoldAllTime,
    tablettesSoldPeriod,
    deltaEggsVsPrevious: isSingleMonth ? eggsPeriod - eggsCompare : null,
    deltaTablettesSoldVsPrevious: isSingleMonth ? tablettesSoldPeriod - tablettesSoldCompare : null,
  };
}

export function formatEggProductionDetail(summary = {}) {
  const fmt = (value = 0) => Number(value || 0).toLocaleString('fr-FR');
  if (summary.mode === 'all') {
    return `${fmt(summary.tablettesSoldAllTime)} tablettes vendues`;
  }
  return `${fmt(summary.eggsAllTime)} œufs ramassés · ${fmt(summary.tablettesSoldAllTime)} tablettes vendues · depuis le début`;
}

export function formatEggProductionDelta(summary = {}) {
  if (summary.mode === 'all' || !summary.isSingleMonth || summary.deltaEggsVsPrevious == null) return null;
  return formatMonthDelta(summary.deltaEggsVsPrevious, { unit: 'œufs', formatValue: (value) => Number(value).toLocaleString('fr-FR') });
}

function sumPayments(payments = [], monthKeys = null) {
  return arr(payments)
    .filter((row) => !monthKeys || rowMatchesMonthKeys(row, monthKeys))
    .reduce((sum, row) => sum + paid(row), 0);
}

function sumDepenses(transactions = [], monthKeys = null) {
  return arr(transactions)
    .filter((row) => ['sortie', 'depense', 'dépense', 'achat'].includes(lower(row.type || '')))
    .filter((row) => !monthKeys || rowMatchesMonthKeys(row, monthKeys))
    .reduce((sum, row) => sum + money(row), 0);
}

export function computeFinancePeriodSummary(payments = [], transactions = [], periodScope = {}) {
  const { mode, monthKeys, compareMonthKey, isSingleMonth } = resolvePeriodContextLocal(periodScope);
  const encaisseAllTime = sumPayments(payments);
  const depensesAllTime = sumDepenses(transactions);
  const encaissePeriod = mode === 'all' ? encaisseAllTime : sumPayments(payments, monthKeys);
  const depensesPeriod = mode === 'all' ? depensesAllTime : sumDepenses(transactions, monthKeys);
  const encaisseCompare = isSingleMonth ? sumPayments(payments, [compareMonthKey]) : 0;
  const depensesCompare = isSingleMonth ? sumDepenses(transactions, [compareMonthKey]) : 0;
  const resultatAllTime = encaisseAllTime - depensesAllTime;
  const resultatPeriod = encaissePeriod - depensesPeriod;
  const resultatCompare = encaisseCompare - depensesCompare;

  return {
    mode,
    monthKeys,
    isSingleMonth,
    encaisseAllTime,
    encaissePeriod,
    depensesAllTime,
    depensesPeriod,
    resultatAllTime,
    resultatPeriod,
    deltaEncaisseVsPrevious: isSingleMonth ? encaissePeriod - encaisseCompare : null,
    deltaResultatVsPrevious: isSingleMonth ? resultatPeriod - resultatCompare : null,
  };
}

export function formatEncaisseDetail(periods = {}) {
  if (periods.mode === 'all') return null;
  return `${fmtCurrency(periods.encaisseAllTime || 0)} depuis le début`;
}

export function formatEncaisseDelta(periods = {}) {
  if (periods.mode === 'all' || !periods.isSingleMonth || periods.deltaEncaisseVsPrevious == null) return null;
  return formatMonthDelta(periods.deltaEncaisseVsPrevious, { formatValue: (value) => `${Number(value).toLocaleString('fr-FR')} FCFA` });
}

export function formatResultatDelta(periods = {}) {
  if (periods.mode === 'all' || !periods.isSingleMonth || periods.deltaResultatVsPrevious == null) return null;
  return formatMonthDelta(periods.deltaResultatVsPrevious, { formatValue: (value) => `${Number(value).toLocaleString('fr-FR')} FCFA` });
}

export function formatResultatDetail(periods = {}) {
  if (periods.mode === 'all') return null;
  return `${fmtCurrency(periods.resultatAllTime || 0)} depuis le début`;
}

const isCriticalStock = (row = {}) => {
  const threshold = stockThreshold(row);
  return threshold > 0 && stockQty(row) <= threshold;
};
const isOpenTask = (row = {}) => !['termine', 'terminé', 'done', 'closed'].includes(lower(row.status || row.statut));
const isOpenAlert = (row = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée'].includes(lower(row.status || row.statut));

const rowYear = (row = {}) => {
  const raw = row.date || row.date_commande || row.order_date || row.created_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
};

function monthTargetForKey(monthKey, annualTarget = annualRevenueTarget) {
  const month = Number(String(monthKey || '').split('-')[1]) - 1;
  return Number(monthlyRevenueTargets[month] || annualTarget / 12) || 0;
}

function sumSalesAmount(orders = [], monthKeys = null) {
  return arr(orders)
    .filter((row) => !monthKeys || rowMatchesMonthKeys(row, monthKeys))
    .reduce((sum, row) => sum + money(row), 0);
}

/** Objectifs alignés sur la période ERP sélectionnée. */
export function computeDashboardPeriodGoal(salesOrders = [], periodScope = {}, goalBase = {}) {
  const { mode, monthKeys, isSingleMonth } = resolvePeriodContext(periodScope);
  const annualTarget = Number(goalBase.annualTarget || annualRevenueTarget);
  const periodSubtitle = formatPeriodScopeLabel(periodScope);
  const currentYear = new Date().getFullYear();
  const yearRealizedCurrentYear = arr(salesOrders)
    .filter((row) => rowYear(row) === currentYear)
    .reduce((sum, row) => sum + money(row), 0);
  const allTimeRealized = sumSalesAmount(salesOrders, null);

  if (mode === 'all') {
    const periodAttainment = annualTarget ? Math.round((yearRealizedCurrentYear / annualTarget) * 100) : 0;
    return {
      periodMode: 'all',
      periodLabel: 'Objectif annuel',
      periodSubtitle,
      periodTarget: annualTarget,
      periodRealized: yearRealizedCurrentYear,
      periodAttainment,
      periodRemaining: Math.max(0, annualTarget - yearRealizedCurrentYear),
      secondaryLabel: 'CA total cumulé',
      secondaryTarget: null,
      secondaryRealized: allTimeRealized,
      secondaryAttainment: null,
      secondaryRemaining: null,
      annualTarget,
      annualRealized: yearRealizedCurrentYear,
      annualAttainment: periodAttainment,
      annualRemaining: Math.max(0, annualTarget - yearRealizedCurrentYear),
    };
  }

  const periodTarget = monthKeys.reduce((sum, key) => sum + monthTargetForKey(key, annualTarget), 0);
  const periodRealized = sumSalesAmount(salesOrders, monthKeys);
  const periodAttainment = periodTarget ? Math.round((periodRealized / periodTarget) * 100) : 0;
  const annualAttainment = annualTarget ? Math.round((yearRealizedCurrentYear / annualTarget) * 100) : 0;

  return {
    periodMode: isSingleMonth ? 'month' : 'period',
    periodLabel: isSingleMonth ? 'Objectif du mois' : 'Objectif période',
    periodSubtitle,
    periodTarget,
    periodRealized,
    periodAttainment,
    periodRemaining: Math.max(0, periodTarget - periodRealized),
    secondaryLabel: `Objectif annuel ${currentYear}`,
    secondaryTarget: annualTarget,
    secondaryRealized: yearRealizedCurrentYear,
    secondaryAttainment: annualAttainment,
    secondaryRemaining: Math.max(0, annualTarget - yearRealizedCurrentYear),
    annualTarget,
    annualRealized: yearRealizedCurrentYear,
    annualAttainment,
    annualRemaining: Math.max(0, annualTarget - yearRealizedCurrentYear),
    monthTarget: isSingleMonth ? periodTarget : undefined,
    realized: periodRealized,
    attainment: periodAttainment,
    remaining: Math.max(0, periodTarget - periodRealized),
  };
}

export function buildDashboardSummary(props = {}, periodScope = {}) {
  const payments = arr(props.payments);
  const transactions = arr(props.transactions);
  const salesOrders = arr(props.salesOrders);
  const stocks = arr(props.stocks);
  const taches = arr(props.taches);
  const alertes = arr(props.alertes);
  const animaux = arr(props.animaux);
  const lots = arr(props.lotsData || props.lots);
  const cultures = arr(props.cultures);
  const productionLogs = arr(props.productionLogs);
  const scope = normalizePeriodScope(periodScope);
  const salesAll = arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders);
  const paymentsAll = arr(props.paymentsAll?.length ? props.paymentsAll : props.payments);

  const ca = salesOrders.reduce((sum, row) => sum + money(row), 0);
  const financePeriods = computeFinancePeriodSummary(payments, transactions, scope);
  const encaisse = financePeriods.encaissePeriod;
  const resultat = financePeriods.resultatPeriod;
  const depenses = financePeriods.depensesPeriod;
  const receivable = salesAll.reduce((sum, order) => sum + remainingForOrder(order, paymentsAll), 0);
  const stockBas = stocks.filter(isCriticalStock).length;
  const stockSummary = computeStockSummary(stocks);
  const tachesOuvertes = taches.filter(isOpenTask).length;
  const alertesOuvertes = alertes.filter(isOpenAlert).length;
  const headcount = computeFarmHeadcount({ animaux, lots, cultures });
  const effectifs = headcount.total;
  const eggProduction = computeEggProductionSummary(productionLogs, salesOrders, scope);
  const production = eggProduction.eggsPeriod;

  const plan = buildDecisionCenterPlan({
    animaux: props.animaux || [],
    avicole: props.lotsData || props.lots || [],
    lots: props.lotsData || props.lots || [],
    cultures: props.cultures || [],
    stock: props.stocks || [],
    clients: props.clients || [],
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.transactions || [],
    production_oeufs_logs: props.productionLogs || [],
    alimentation_logs: props.alimentationLogs || [],
    meteo: props.meteo || {},
  });

  const actions = buildDashboardTodayActions({
    ...props,
    salesOrders: salesAll,
    sales_orders: salesAll,
    payments: paymentsAll,
  });
  const goalBase = plan.goals?.global || { monthTarget: 0, realized: 0, attainment: 0, annualTarget: 0 };
  const goal = computeDashboardPeriodGoal(salesAll, scope, goalBase);

  return {
    ca,
    encaisse,
    depenses,
    resultat,
    receivable,
    stockBas,
    stockSummary,
    tachesOuvertes,
    alertesOuvertes,
    effectifs,
    headcount,
    production,
    eggProduction,
    financePeriods,
    periodScope: scope,
    actions,
    goal,
    plan,
    todoCount: actions.length,
  };
}

export const DASHBOARD_MODULE_LABELS = {
  commercial: 'Commercial',
  finance_pilotage: 'Finance',
  achats_stock: 'Achats & Stock',
  elevage: 'Élevage',
  activite_suivi: 'Activité',
  documents_rapports: 'Documents',
  smartfarm: 'Smart Farm',
  sync_activity: 'Sync ERP',
  objectifs_croissance: 'Vision',
  assistant_erp: 'Assistant',
};

export const DASHBOARD_MODULES = [
  { id: 'elevage', label: 'Élevage', hint: 'Animaux · lots · santé', tab: 'Résumé' },
  { id: 'commercial', label: 'Commercial', hint: 'Ventes · clients', tab: 'Résumé' },
  { id: 'achats_stock', label: 'Achats & Stock', hint: 'Inventaire · fournisseurs', tab: 'Résumé' },
  { id: 'finance_pilotage', label: 'Finance', hint: 'Trésorerie · créances', tab: 'Résumé' },
  { id: 'activite_suivi', label: 'Activité', hint: 'Tâches · alertes', tab: 'Résumé' },
  { id: 'objectifs_croissance', label: 'Vision', hint: 'Objectifs · IA', tab: 'À traiter' },
];
