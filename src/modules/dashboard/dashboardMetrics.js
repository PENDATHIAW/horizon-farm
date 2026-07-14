import { buildDecisionCenterPlan, annualRevenueTarget, monthlyRevenueTargets } from '../../services/growthDecisionEngine.js';
import { filterRealOpenTasks } from '../../utils/healthFindingLabels.js';

import { buildConsolidationInput, consolidateFinance } from '../../utils/financeConsolidationEngine.js';
import { openSalesCount } from '../commercial/commercialMetrics.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { buildDashboardTodayActions } from '../../utils/dashboardWorkflows.js';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../../utils/avicoleMetrics.js';
import { resolveAvicoleLotKind } from '../../utils/avicoleActivity.js';
import { toNumber, fmtCurrency } from '../../utils/format.js';
import { formatPeriodScopeLabel, normalizePeriodScope, resolvePeriodContext, rowMatchesMonthKeys, monthKeyFromRow } from '../../utils/periodScope.js';
import {
  monthTargetForKey,
  resolveActivityYearContext,
} from '../../utils/activityYear.js';
import { summarizeStockValuation } from '../../utils/stockValuation.js';

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

/** Surface totale des parcelles de la ferme (m²) - fiches parcelle ou déduction cultures actives. */
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
 * Effectifs exploitation - animaux unitaires, lots avicoles actifs, surface parcelles.
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

/** Résumé stock - même logique que Stocks / Achats & Stock (seuil > 0 pour « sous seuil »). */
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

/** Cultures - parcelles, surface et fiches actives (sans alourdir le Dashboard). */
export function computeCultureSummary(cultures = []) {
  const rows = arr(cultures);
  const parcelRecords = rows.filter((row) => cultureRecordType(row) === 'parcelle' && isActiveParcelRecord(row));
  const activeCultureRows = rows.filter(
    (row) => cultureRecordType(row) === 'culture'
      && !['termine', 'terminé', 'perdu', 'archive', 'archivé'].includes(lower(row.statut || row.status)),
  );

  let parcelCount = parcelRecords.length;
  if (!parcelCount) {
    const parcelKeys = new Set();
    activeCultureRows.forEach((row) => {
      const label = parcelLabel(row);
      if (label && !label.toLowerCase().includes('non renseign')) parcelKeys.add(lower(label));
    });
    parcelCount = parcelKeys.size;
  }

  const surfaceM2 = Math.round(computeFarmParcelSurfaceM2(rows));
  const activeCultures = activeCultureRows.length;

  return {
    parcelCount,
    surfaceM2,
    activeCultures,
    hasData: parcelCount > 0 || activeCultures > 0 || surfaceM2 > 0,
  };
}

export function formatCultureDetail(summary = {}) {
  const parts = [];
  if (Number(summary.parcelCount || 0) > 0) parts.push(`${Number(summary.parcelCount).toLocaleString('fr-FR')} parcelle(s)`);
  if (Number(summary.activeCultures || 0) > 0) parts.push(`${Number(summary.activeCultures).toLocaleString('fr-FR')} culture(s) active(s)`);
  if (Number(summary.surfaceM2 || 0) > 0) parts.push(`${Number(summary.surfaceM2).toLocaleString('fr-FR')} m²`);
  return parts.length ? parts.join(' · ') : 'Configurer les parcelles';
}

/** Phase de lancement - aucune activité commerciale, stock, production ou encaissement. */
export function isDashboardStartupMode(props = {}) {
  const salesAll = arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders);
  const paymentsAll = arr(props.paymentsAll?.length ? props.paymentsAll : props.payments);
  const stocks = arr(props.stocks);
  const productionLogs = arr(props.productionLogs);

  const hasSales = salesAll.some((row) => money(row) > 0);
  const hasPayments = paymentsAll.some((row) => paid(row) > 0);
  const hasStock = stocks.some((row) => stockQty(row) > 0);
  const hasProduction = productionLogs.some((row) => eggsFromProductionLog(row) > 0);

  return !hasSales && !hasPayments && !hasStock && !hasProduction;
}

const EGGS_PER_TABLET = 30;

function resolvePeriodContextLocal(scope = {}) {
  return resolvePeriodContext(scope);
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

/** Ponte - période sélectionnée, cumuls ramassage/vente, delta vs mois précédent. */
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
const isOpenAlert = (row = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée'].includes(lower(row.status || row.statut));

function dashboardMonthTarget(monthKey, activityYear, annualTarget = annualRevenueTarget) {
  const target = monthTargetForKey(monthKey, activityYear, monthlyRevenueTargets);
  if (target > 0) return target;
  return Number(annualTarget / 12) || 0;
}

function sumYear1Sales(orders = [], activityYear = {}) {
  return arr(orders)
    .filter((row) => activityYear.year1MonthSet?.has(monthKeyFromRow(row)))
    .reduce((sum, row) => sum + money(row), 0);
}

function sumSalesAmount(orders = [], monthKeys = null) {
  return arr(orders)
    .filter((row) => !monthKeys || rowMatchesMonthKeys(row, monthKeys))
    .reduce((sum, row) => sum + money(row), 0);
}

/** Objectifs alignés sur la période ERP et l'Année 1 d'activité. */
export function computeDashboardPeriodGoal(salesOrders = [], periodScope = {}, goalBase = {}, activityYear = null) {
  const { mode, monthKeys, isSingleMonth } = resolvePeriodContext(periodScope);
  const annualTarget = Number(goalBase.annualTarget || annualRevenueTarget);
  const periodSubtitle = formatPeriodScopeLabel(periodScope);
  const yearCtx = activityYear || resolveActivityYearContext({ salesOrders });
  const year1Realized = sumYear1Sales(salesOrders, yearCtx);
  const allTimeRealized = sumSalesAmount(salesOrders, null);
  const year1Label = yearCtx.year1Label || 'Année 1';

  if (mode === 'all') {
    const periodAttainment = annualTarget ? Math.round((year1Realized / annualTarget) * 100) : 0;
    return {
      activityYear: yearCtx,
      periodMode: 'all',
      periodLabel: year1Label,
      periodSubtitle,
      periodTarget: annualTarget,
      periodRealized: year1Realized,
      periodAttainment,
      periodRemaining: Math.max(0, annualTarget - year1Realized),
      secondaryLabel: 'CA total cumulé',
      secondaryTarget: null,
      secondaryRealized: allTimeRealized,
      secondaryAttainment: null,
      secondaryRemaining: null,
      annualTarget,
      annualRealized: year1Realized,
      annualAttainment: periodAttainment,
      annualRemaining: Math.max(0, annualTarget - year1Realized),
    };
  }

  const periodTarget = monthKeys.reduce((sum, key) => sum + dashboardMonthTarget(key, yearCtx, annualTarget), 0);
  const periodRealized = sumSalesAmount(salesOrders, monthKeys);
  const periodAttainment = periodTarget ? Math.round((periodRealized / periodTarget) * 100) : 0;
  const annualAttainment = annualTarget ? Math.round((year1Realized / annualTarget) * 100) : 0;

  return {
    activityYear: yearCtx,
    periodMode: isSingleMonth ? 'month' : 'period',
    periodLabel: isSingleMonth ? 'Objectif du mois' : 'Objectif période',
    periodSubtitle,
    periodTarget,
    periodRealized,
    periodAttainment,
    periodRemaining: Math.max(0, periodTarget - periodRealized),
    secondaryLabel: year1Label,
    secondaryTarget: annualTarget,
    secondaryRealized: year1Realized,
    secondaryAttainment: annualAttainment,
    secondaryRemaining: Math.max(0, annualTarget - year1Realized),
    annualTarget,
    annualRealized: year1Realized,
    annualAttainment,
    annualRemaining: Math.max(0, annualTarget - year1Realized),
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
  const deliveriesAll = arr(props.deliveries || props.deliveriesAll);
  const invoicesAll = arr(props.invoices || props.invoicesAll);
  const clientsAll = arr(props.clients);

  const commercialKpisPeriod = buildConsolidatedCommercialKpis({
    orders: salesOrders,
    payments,
    clients: clientsAll,
    deliveries: deliveriesAll,
    invoices: invoicesAll,
    periodScope: scope,
  });
  const commercialKpisAll = buildConsolidatedCommercialKpis({
    orders: salesAll,
    payments: paymentsAll,
    clients: clientsAll,
    deliveries: deliveriesAll,
    invoices: invoicesAll,
    periodScope: {},
  });

  const ca = commercialKpisPeriod.ca;
  const financePeriods = computeFinancePeriodSummary(payments, transactions, scope);
  const encaisse = commercialKpisPeriod.collected || financePeriods.encaissePeriod;
  const depenses = financePeriods.depensesPeriod;
  const resultat = encaisse - depenses;
  const transactionsAll = arr(props.transactionsAll?.length ? props.transactionsAll : props.transactions);
  const financeConsolidated = consolidateFinance(buildConsolidationInput({
    ...props,
    salesOrders: salesAll,
    payments: paymentsAll,
    transactions: transactionsAll,
  }));
  const cashNet = financeConsolidated.cashNet;
  const receivable = commercialKpisAll.receivable;
  const payables = financeConsolidated.payablesTotal ?? financeConsolidated.dettesFournisseurs;
  const openSales = commercialKpisAll.openOrders ?? openSalesCount(salesAll, paymentsAll);
  const cultureSummary = computeCultureSummary(cultures);
  const startupMode = isDashboardStartupMode(props);
  const stockBas = stocks.filter(isCriticalStock).length;
  const stockSummary = computeStockSummary(stocks);
  const stockValuation = summarizeStockValuation(stocks, arr(props.stockMovements), transactionsAll);
  if (stockValuation?.totalValue > 0) {
    stockSummary.stockValue = stockValuation.totalValue;
    stockSummary.valuationMethod = 'cmup';
  } else {
    stockSummary.valuationMethod = 'fiche';
  }
  const tachesOuvertes = filterRealOpenTasks(taches).length;
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
    business_plans: props.businessPlans || [],
    investissements: props.investissements || [],
    farm: props.farm || props.ferme || {},
  }, { periodScope: scope });

  const actions = buildDashboardTodayActions({
    ...props,
    salesOrders: salesAll,
    sales_orders: salesAll,
    payments: paymentsAll,
  });
  const goalBase = plan.goals?.global || { monthTarget: 0, realized: 0, attainment: 0, annualTarget: 0 };
  const goal = computeDashboardPeriodGoal(salesAll, scope, goalBase, plan.activityYear);

  return {
    ca,
    caAll: commercialKpisAll.ca,
    encaisse,
    encaisseAll: commercialKpisAll.collected,
    depenses,
    resultat,
    receivable,
    payables,
    openSales,
    cashNet,
    cultureSummary,
    startupMode,
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
    commercialKpis: commercialKpisAll,
    commercialKpisPeriod,
    kpiSource: 'buildConsolidatedCommercialKpis',
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
  centre_ia: 'Décisions',
  assistant_erp: 'Assistant',
};

export const DASHBOARD_MODULES = [
  { id: 'elevage', label: 'Élevage', hint: 'Animaux · lots · santé', tab: 'Lots & bandes' },
  { id: 'commercial', label: 'Commercial', hint: 'Ventes · clients', tab: 'Pilotage' },
  { id: 'achats_stock', label: 'Achats & Stock', hint: 'Inventaire · fournisseurs', tab: 'Inventaire' },
  { id: 'finance_pilotage', label: 'Finance', hint: 'Trésorerie · créances', tab: 'Résumé' },
  { id: 'activite_suivi', label: 'Activité', hint: 'Tâches · alertes', tab: 'Cockpit & décisions' },
  { id: 'centre_ia', label: 'Décisions', hint: 'Urgences · croissance', tab: 'Urgences & risques' },
  { id: 'objectifs_croissance', label: 'Vision', hint: 'Objectifs · financeurs', tab: 'Suivi du Business Plan' },
];
