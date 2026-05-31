import { monthLabelFromKey } from './chartDates.js';
import { currentMonthKey, rowDateValue } from './periodScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);

const STARTUP_INVESTMENT_HINTS = ['demarrage', 'démarrage', 'startup', 'invest', 'equipement', 'équipement', 'materiel', 'matériel', 'cheptel', 'poussin', 'pondeuse', 'infrastructure'];

function asValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function normalizeText(value = '') {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function monthKeyFromDateValue(value) {
  const date = asValidDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function pushCandidate(candidates, date, source, weight) {
  const parsed = asValidDate(date);
  if (!parsed) return;
  candidates.push({ date: firstDayOfMonth(parsed), source, weight });
}

function earliestDate(rows = [], pickDate) {
  const dates = arr(rows).map(pickDate).map(asValidDate).filter(Boolean).sort((a, b) => a - b);
  return dates[0] || null;
}

/** Normalise les entrées ERP vers le résolveur de démarrage. */
export function buildActivityYearInputFromDataMap(dataMap = {}) {
  const farm = dataMap.farm || dataMap.ferme || {};
  return {
    farm,
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    investissements: arr(dataMap.investissements || dataMap.investments),
    lots: arr(dataMap.avicole || dataMap.lots),
    animaux: arr(dataMap.animaux),
    cultures: arr(dataMap.cultures),
    productionLogs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    salesOrders: arr(dataMap.sales_orders || dataMap.salesOrders),
    transactions: arr(dataMap.finances || dataMap.transactions),
  };
}

/**
 * Date de démarrage d'activité — priorité explicite puis signaux terrain.
 * 1. Ferme / BP Investissements (date_debut)
 * 2. Investissements de démarrage
 * 3. Premiers lots / cultures / animaux
 * 4. Première production ou vente
 * 5. Première écriture financière
 */
export function resolveActivityStartDate(options = {}) {
  const candidates = [];
  const farm = options.farm || {};

  pushCandidate(candidates, farm.date_demarrage || farm.activity_start_date || farm.date_debut_activite, 'ferme', 120);

  arr(options.businessPlans).forEach((row) => {
    pushCandidate(candidates, row.date_debut || row.start_date, 'business_plan', 100);
  });

  arr(options.investissements).forEach((row) => {
    const text = normalizeText(`${row.categorie || ''} ${row.category || ''} ${row.designation || ''} ${row.libelle || ''}`);
    const isStartup = STARTUP_INVESTMENT_HINTS.some((hint) => text.includes(hint));
    pushCandidate(candidates, row.date || row.date_debut || row.start_date, isStartup ? 'investissement_demarrage' : 'investissement', isStartup ? 85 : 55);
  });

  arr(options.lots).forEach((row) => {
    pushCandidate(candidates, row.date_debut || row.entry_date || row.date_entree, 'lot_avicole', 75);
  });

  arr(options.cultures).forEach((row) => {
    pushCandidate(candidates, row.date_debut_campagne || row.date_semis || row.date_debut, 'culture', 65);
  });

  arr(options.animaux).forEach((row) => {
    pushCandidate(candidates, row.date_entree_ferme || row.date_entree || row.date_achat || row.date_debut, 'animal', 60);
  });

  const firstProduction = earliestDate(options.productionLogs, (row) => row.date || row.date_ramassage || row.created_at);
  if (firstProduction) pushCandidate(candidates, firstProduction, 'production', 45);

  const firstSale = earliestDate(options.salesOrders, (row) => rowDateValue(row) || row.date_commande || row.date);
  if (firstSale) pushCandidate(candidates, firstSale, 'vente', 35);

  const firstFinance = earliestDate(options.transactions, (row) => row.date || row.created_at);
  if (firstFinance) pushCandidate(candidates, firstFinance, 'finance', 25);

  if (candidates.length) {
    candidates.sort((a, b) => b.weight - a.weight || a.date - b.date);
    return candidates[0].date;
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 11, 1);
}

export function resolveActivityStartMeta(options = {}) {
  const candidates = [];
  const farm = options.farm || {};
  pushCandidate(candidates, farm.date_demarrage || farm.activity_start_date || farm.date_debut_activite, 'ferme', 120);
  arr(options.businessPlans).forEach((row) => pushCandidate(candidates, row.date_debut || row.start_date, 'business_plan', 100));
  arr(options.investissements).forEach((row) => {
    const text = normalizeText(`${row.categorie || ''} ${row.category || ''} ${row.designation || ''} ${row.libelle || ''}`);
    const isStartup = STARTUP_INVESTMENT_HINTS.some((hint) => text.includes(hint));
    pushCandidate(candidates, row.date || row.date_debut || row.start_date, isStartup ? 'investissement_demarrage' : 'investissement', isStartup ? 85 : 55);
  });
  arr(options.lots).forEach((row) => pushCandidate(candidates, row.date_debut || row.entry_date || row.date_entree, 'lot_avicole', 75));
  arr(options.cultures).forEach((row) => pushCandidate(candidates, row.date_debut_campagne || row.date_semis || row.date_debut, 'culture', 65));
  arr(options.animaux).forEach((row) => pushCandidate(candidates, row.date_entree_ferme || row.date_entree || row.date_achat || row.date_debut, 'animal', 60));
  const firstProduction = earliestDate(options.productionLogs, (row) => row.date || row.date_ramassage || row.created_at);
  if (firstProduction) pushCandidate(candidates, firstProduction, 'production', 45);
  const firstSale = earliestDate(options.salesOrders, (row) => rowDateValue(row) || row.date_commande || row.date);
  if (firstSale) pushCandidate(candidates, firstSale, 'vente', 35);
  const firstFinance = earliestDate(options.transactions, (row) => row.date || row.created_at);
  if (firstFinance) pushCandidate(candidates, firstFinance, 'finance', 25);

  if (!candidates.length) {
    const today = new Date();
    const fallback = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    return { startDate: fallback, source: 'fallback_12_mois', startDateIso: fallback.toISOString().slice(0, 10) };
  }

  candidates.sort((a, b) => b.weight - a.weight || a.date - b.date);
  const best = candidates[0];
  return { startDate: best.date, source: best.source, startDateIso: best.date.toISOString().slice(0, 10) };
}

/** 12 mois glissants à partir du démarrage = Année 1 d'activité. */
export function buildActivityYear1MonthKeys(startDate) {
  const start = firstDayOfMonth(asValidDate(startDate) || new Date());
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return monthKeyFromDateValue(date);
  });
}

export function activityYear1Label(monthKeys = []) {
  if (!monthKeys.length) return 'Année 1';
  return `Année 1 (${monthLabelFromKey(monthKeys[0])} → ${monthLabelFromKey(monthKeys[monthKeys.length - 1])})`;
}

export function planMonthIndexForKey(monthKey, year1MonthKeys = []) {
  const index = year1MonthKeys.indexOf(monthKey);
  return index >= 0 ? index : null;
}

export function isInActivityYear1(monthKey, activityYear = {}) {
  if (!monthKey) return false;
  return Boolean(activityYear.year1MonthSet?.has(monthKey));
}

/** Objectif CA plan pour un mois calendaire (index M1..M12 du BP). */
export function monthTargetForKey(monthKey, activityYear = {}, monthlyPlanTargets = []) {
  const index = planMonthIndexForKey(monthKey, activityYear.year1MonthKeys || []);
  if (index === null) return 0;
  return Number(monthlyPlanTargets[index] || 0);
}

export function sumTargetsForKeys(monthKeys = [], activityYear = {}, monthlyPlanTargets = []) {
  return arr(monthKeys).reduce((sum, key) => sum + monthTargetForKey(key, activityYear, monthlyPlanTargets), 0);
}

export function resolveActivityYearContext(options = {}) {
  const input = options.farm || options.businessPlans
    ? options
    : buildActivityYearInputFromDataMap(options);
  const meta = resolveActivityStartMeta(input);
  const startDate = meta.startDate;
  const year1MonthKeys = buildActivityYear1MonthKeys(startDate);
  const year1MonthSet = new Set(year1MonthKeys);
  const nowKey = currentMonthKey();
  const currentPlanMonthIndex = planMonthIndexForKey(nowKey, year1MonthKeys);

  const monthsWithData = arr(input.salesOrders)
    .map((row) => monthKeyFromDateValue(rowDateValue(row) || row.date_commande || row.date))
    .filter((key) => key && year1MonthSet.has(key));

  const lastDataIndex = monthsWithData.reduce(
    (max, key) => Math.max(max, year1MonthKeys.indexOf(key)),
    -1,
  );

  const lastVisibleIndex = Math.max(
    currentPlanMonthIndex ?? -1,
    lastDataIndex,
    0,
  );
  const visibleCount = Math.min(12, Math.max(lastVisibleIndex + 1, 1));

  return {
    startDate: meta.startDateIso,
    startSource: meta.source,
    year1MonthKeys,
    year1MonthSet,
    visibleMonthKeys: year1MonthKeys.slice(0, visibleCount),
    year1Label: activityYear1Label(year1MonthKeys),
    currentPlanMonthIndex,
    nowKey,
  };
}

export function activityMonthChartLabel(monthKey, year1MonthKeys = []) {
  const index = year1MonthKeys.indexOf(monthKey);
  if (index < 0) return monthLabelFromKey(monthKey);
  return `M${index + 1} · ${monthLabelFromKey(monthKey)}`;
}

export function activityStartSourceLabel(source = '') {
  const labels = {
    ferme: 'paramètre ferme',
    business_plan: 'business plan (Investissements)',
    investissement_demarrage: 'investissement de démarrage',
    investissement: 'investissement',
    lot_avicole: 'premier lot avicole',
    culture: 'première culture',
    animal: 'premier animal',
    production: 'première production',
    vente: 'première vente',
    finance: 'première écriture financière',
    fallback_12_mois: 'estimation (12 derniers mois)',
  };
  return labels[source] || source || 'estimation';
}
