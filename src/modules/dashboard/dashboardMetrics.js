import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine';
import { remainingForOrder } from '../../utils/salesStatuses';
import { buildDashboardTodayActions } from '../../utils/dashboardWorkflows';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../../utils/avicoleMetrics';
import { resolveAvicoleLotKind } from '../../utils/avicoleActivity';
import { toNumber, fmtCurrency } from '../../utils/format';

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

function currentMonthKey() {
  return monthKeyFromValue(new Date());
}

function previousMonthKey() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return monthKeyFromValue(date);
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

function brokenFromProductionLog(row = {}) {
  return toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
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

function tabletsFromEggs(eggs = 0) {
  return Math.floor(Math.max(0, toNumber(eggs)) / EGGS_PER_TABLET);
}

function sumProductionEggs(logs = [], monthKey = null) {
  return arr(logs)
    .filter((row) => !monthKey || monthKeyFromValue(rowDateValue(row)) === monthKey)
    .reduce((sum, row) => sum + eggsFromProductionLog(row), 0);
}

function sumEggSales(orders = [], monthKey = null) {
  return arr(orders)
    .filter(isEggSale)
    .filter((row) => !monthKey || monthKeyFromValue(rowDateValue(row)) === monthKey)
    .reduce((sum, row) => sum + eggsFromSale(row), 0);
}

/** Ponte — mois en cours, cumuls ramassage/vente, delta vs mois dernier. */
export function computeEggProductionSummary(productionLogs = [], salesOrders = []) {
  const logs = arr(productionLogs);
  const thisMonth = currentMonthKey();
  const lastMonth = previousMonthKey();

  const totalEggs = sumProductionEggs(logs);
  const totalBroken = logs.reduce((sum, row) => sum + brokenFromProductionLog(row), 0);
  const sellableEggs = Math.max(0, totalEggs - totalBroken);
  const eggsSoldAllTime = sumEggSales(salesOrders);
  const eggsThisMonth = sumProductionEggs(logs, thisMonth);
  const eggsLastMonth = sumProductionEggs(logs, lastMonth);
  const eggsSoldThisMonth = sumEggSales(salesOrders, thisMonth);
  const eggsSoldLastMonth = sumEggSales(salesOrders, lastMonth);

  return {
    eggsThisMonth,
    eggsAllTime: totalEggs,
    sellableEggsAllTime: sellableEggs,
    tablettesAllTime: tabletsFromEggs(sellableEggs),
    eggsSoldAllTime,
    tablettesSoldAllTime: tabletsFromEggs(eggsSoldAllTime),
    deltaEggsVsLastMonth: eggsThisMonth - eggsLastMonth,
    deltaSoldVsLastMonth: eggsSoldThisMonth - eggsSoldLastMonth,
  };
}

export function formatEggProductionDetail(summary = {}) {
  const fmt = (value = 0) => Number(value || 0).toLocaleString('fr-FR');
  return `${fmt(summary.tablettesAllTime)} tablettes ramassées · ${fmt(summary.eggsSoldAllTime)} œufs vendus`;
}

export function formatEggProductionDelta(summary = {}) {
  return formatMonthDelta(summary.deltaEggsVsLastMonth, { unit: 'œufs', formatValue: (value) => Number(value).toLocaleString('fr-FR') });
}

function sumPayments(payments = [], monthKey = null) {
  return arr(payments)
    .filter((row) => !monthKey || monthKeyFromValue(rowDateValue(row)) === monthKey)
    .reduce((sum, row) => sum + paid(row), 0);
}

export function computeFinancePeriodDeltas(payments = [], transactions = []) {
  const thisMonth = currentMonthKey();
  const lastMonth = previousMonthKey();
  const encaisseThisMonth = sumPayments(payments, thisMonth);
  const encaisseLastMonth = sumPayments(payments, lastMonth);
  const depensesThisMonth = arr(transactions)
    .filter((row) => ['sortie', 'depense', 'dépense', 'achat'].includes(lower(row.type || '')))
    .filter((row) => monthKeyFromValue(rowDateValue(row)) === thisMonth)
    .reduce((sum, row) => sum + money(row), 0);
  const depensesLastMonth = arr(transactions)
    .filter((row) => ['sortie', 'depense', 'dépense', 'achat'].includes(lower(row.type || '')))
    .filter((row) => monthKeyFromValue(rowDateValue(row)) === lastMonth)
    .reduce((sum, row) => sum + money(row), 0);

  return {
    encaisseThisMonth,
    encaisseLastMonth,
    deltaEncaisseVsLastMonth: encaisseThisMonth - encaisseLastMonth,
    resultatThisMonth: encaisseThisMonth - depensesThisMonth,
    deltaResultatVsLastMonth: (encaisseThisMonth - depensesThisMonth) - (encaisseLastMonth - depensesLastMonth),
  };
}

export function formatEncaisseDetail(periods = {}) {
  return `${fmtCurrency(periods.encaisseThisMonth || 0)} ce mois`;
}

export function formatEncaisseDelta(periods = {}) {
  return formatMonthDelta(periods.deltaEncaisseVsLastMonth, { formatValue: (value) => `${Number(value).toLocaleString('fr-FR')} FCFA` });
}

export function formatResultatDelta(periods = {}) {
  return formatMonthDelta(periods.deltaResultatVsLastMonth, { formatValue: (value) => `${Number(value).toLocaleString('fr-FR')} FCFA` });
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

export function buildDashboardSummary(props = {}) {
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

  const ca = salesOrders.reduce((sum, row) => sum + money(row), 0);
  const encaisse = payments.reduce((sum, row) => sum + paid(row), 0);
  const depenses = transactions
    .filter((row) => ['sortie', 'depense', 'dépense', 'achat'].includes(lower(row.type || '')))
    .reduce((sum, row) => sum + money(row), 0);
  const resultat = encaisse - depenses;
  const receivable = salesOrders.reduce((sum, order) => sum + remainingForOrder(order, payments), 0);
  const stockBas = stocks.filter(isCriticalStock).length;
  const stockSummary = computeStockSummary(stocks);
  const tachesOuvertes = taches.filter(isOpenTask).length;
  const alertesOuvertes = alertes.filter(isOpenAlert).length;
  const headcount = computeFarmHeadcount({ animaux, lots, cultures });
  const effectifs = headcount.total;
  const eggProduction = computeEggProductionSummary(productionLogs, salesOrders);
  const financePeriods = computeFinancePeriodDeltas(payments, transactions);
  const production = eggProduction.eggsThisMonth;

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

  const actions = buildDashboardTodayActions(props);
  const goalBase = plan.goals?.global || { monthTarget: 0, realized: 0, attainment: 0, annualTarget: 0 };
  const currentYear = new Date().getFullYear();
  const annualRealized = salesOrders
    .filter((row) => rowYear(row) === currentYear)
    .reduce((sum, row) => sum + money(row), 0);
  const annualTarget = Number(goalBase.annualTarget || 0);
  const annualAttainment = annualTarget ? Math.round((annualRealized / annualTarget) * 100) : 0;
  const goal = {
    ...goalBase,
    annualRealized,
    annualAttainment,
    annualRemaining: Math.max(0, annualTarget - annualRealized),
  };

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
