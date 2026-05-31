import { monthLabelFromKey } from './chartDates.js';
import { currentMonthKey, rowDateValue } from './periodScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);

function asValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthKeyFromDateValue(value) {
  const date = asValidDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Date de démarrage d'activité — BP Investissements en priorité, puis terrain. */
export function resolveActivityStartDate(options = {}) {
  const dates = [];

  arr(options.businessPlans).forEach((row) => {
    dates.push(asValidDate(row.date_debut || row.start_date || row.created_at));
  });
  arr(options.investissements).forEach((row) => {
    dates.push(asValidDate(row.date || row.date_debut || row.start_date || row.created_at));
  });
  arr(options.lots).forEach((row) => {
    dates.push(asValidDate(row.date_debut || row.entry_date || row.date_entree || row.created_at));
  });
  arr(options.animaux).forEach((row) => {
    dates.push(asValidDate(row.date_entree_ferme || row.date_entree || row.date_achat || row.date_debut || row.created_at));
  });
  arr(options.salesOrders).forEach((row) => {
    dates.push(asValidDate(rowDateValue(row) || row.date_commande || row.date || row.created_at));
  });

  const sorted = dates.filter(Boolean).sort((a, b) => a - b);
  if (sorted.length) return firstDayOfMonth(sorted[0]);

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 11, 1);
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

export function resolveActivityYearContext(options = {}) {
  const startDate = resolveActivityStartDate(options);
  const year1MonthKeys = buildActivityYear1MonthKeys(startDate);
  const year1MonthSet = new Set(year1MonthKeys);
  const nowKey = currentMonthKey();
  const currentPlanMonthIndex = planMonthIndexForKey(nowKey, year1MonthKeys);

  const monthsWithData = arr(options.salesOrders)
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
    startDate: startDate.toISOString().slice(0, 10),
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
