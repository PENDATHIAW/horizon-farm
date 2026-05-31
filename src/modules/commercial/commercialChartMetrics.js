import { monthKeyFromDate, monthLabelFromKey, resolveChartDate } from '../../utils/chartDates.js';
import { toNumber } from '../../utils/format.js';
import { paidForOrder, remainingForOrder } from '../../utils/salesStatuses.js';
import { summarizeSalesMargins } from '../../utils/salesMarginEngine.js';
import { filterRowsByPeriodScope, isAllTimeScope, normalizePeriodScope, resolvePeriodContext } from '../../utils/periodScope.js';
import {
  activityStartSourceLabel,
  buildActivityYearInputFromDataMap,
  planMonthIndexForKey,
  resolveActivityYearContext,
} from '../../utils/activityYear.js';
import {
  buildActivityYearFinancialTargets,
  defaultFinancialPlan,
  detectRevenueActivity,
} from '../../services/financialPlanService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? 0);
const qtyOf = (row = {}) => Math.max(0, toNumber(row.quantity ?? row.quantite ?? row.qty ?? row.nombre ?? 0));
const isCancelledPayment = (row = {}) => ['annule', 'annulé', 'annulee', 'cancelled', 'supprime', 'supprimé'].includes(lower(row.statut || row.status));
const paymentOrderId = (row = {}) => String(row.order_id || row.sale_id || row.source_record_id || '').trim();

export const ACTIVITY_LABELS = {
  oeufs: 'Œufs / tablettes',
  poulets_chair: 'Poulets chair',
  bovins: 'Bovins / embouche',
  fumier_pondeuses: 'Fumier pondeuses',
  fumier_chair: 'Fumier chair',
  fumier_bovins: 'Fumier bœufs',
  cultures: 'Cultures / récoltes',
  autres: 'Autres ventes',
};

function activityLabel(key = '') {
  return ACTIVITY_LABELS[key] || key || 'Autres ventes';
}

function activeLinkedPayments(orders = [], payments = []) {
  const orderIds = new Set(arr(orders).map((row) => String(row.id || '').trim()).filter(Boolean));
  return arr(payments).filter((payment) => !isCancelledPayment(payment) && paymentOrderId(payment) && orderIds.has(paymentOrderId(payment)));
}

function reliableMargin(row = {}) {
  if (row.cout_a_completer || row.margin_reliable === false) return 0;
  return toNumber(row.marge_directe ?? row.marge ?? 0);
}

function orderMonthKey(order = {}) {
  return monthKeyFromDate(resolveChartDate(order));
}

function buildMarginContext(props = {}) {
  return {
    lots: props.lots || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stocks: props.stocks || [],
    alimentationLogs: props.alimentationLogs || [],
    productionLogs: props.productionLogs || [],
    vaccins: props.vaccins || [],
    businessEvents: props.businessEvents || [],
    payments: props.payments || [],
    transactions: props.transactions || [],
  };
}

function resolveTargetMonthKeys(options = {}) {
  const { activityYear, monthKeys = [], periodFiltered = false } = options;
  const year1Keys = activityYear?.year1MonthKeys || [];
  if (!year1Keys.length) return [];

  if (periodFiltered && monthKeys.length) {
    return monthKeys.filter((key) => activityYear.year1MonthSet.has(key));
  }

  return activityYear.visibleMonthKeys?.length ? activityYear.visibleMonthKeys : year1Keys;
}

/** Marge fiable agrégée par activité (camembert). */
export function buildMarginByActivity(rows = [], context = {}) {
  const marginSummary = summarizeSalesMargins(rows, context);
  const buckets = {};
  marginSummary.details.forEach((row) => {
    const activity = detectRevenueActivity(row, context);
    const margin = reliableMargin(row);
    if (margin <= 0) return;
    buckets[activity] = (buckets[activity] || 0) + margin;
  });
  return Object.entries(buckets)
    .map(([key, value]) => ({ name: activityLabel(key), value, key }))
    .sort((a, b) => b.value - a.value);
}

/** CA commandé, marge fiable et encaissé par mois. */
export function buildMonthlySalesAndMargin(rows = [], context = {}, payments = []) {
  const marginSummary = summarizeSalesMargins(rows, context);
  const marginMap = new Map(marginSummary.details.map((row) => [String(row.id), row]));
  const linked = activeLinkedPayments(rows, payments);
  const map = new Map();

  arr(rows).forEach((order) => {
    const key = orderMonthKey(order);
    if (!key) return;
    const enriched = marginMap.get(String(order.id)) || order;
    const bucket = map.get(key) || { key, mois: monthLabelFromKey(key), ca: 0, marge: 0, encaisse: 0 };
    bucket.ca += amount(enriched);
    bucket.marge += reliableMargin(enriched);
    bucket.encaisse += paidForOrder(order, linked);
    map.set(key, bucket);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Volumes réalisés vs objectifs par activité (Année 1 d'activité). */
export function buildVolumeVsTargetByActivity(rows = [], options = {}) {
  const plan = options.plan || defaultFinancialPlan;
  const activityYear = options.activityYear || resolveActivityYearContext(options);
  const targetMonthKeys = resolveTargetMonthKeys({ activityYear, monthKeys: options.monthKeys, periodFiltered: options.periodFiltered });
  const dataMap = { animaux: options.animaux || [], cultures: options.cultures || [] };

  return plan.revenueLines.map((line) => {
    const activity = line.activity;
    const activityOrders = arr(rows).filter((order) => {
      const key = orderMonthKey(order);
      if (!key || !activityYear.year1MonthSet.has(key)) return false;
      if (targetMonthKeys.length && !targetMonthKeys.includes(key)) return false;
      return detectRevenueActivity(order, dataMap) === activity;
    });

    const actualQty = activityOrders.reduce((sum, order) => sum + (qtyOf(order) || 1), 0);
    const actualCa = activityOrders.reduce((sum, order) => sum + amount(order), 0);

    let targetQty = 0;
    let targetCa = 0;
    const monthIndexes = targetMonthKeys.length
      ? targetMonthKeys.map((key) => planMonthIndexForKey(key, activityYear.year1MonthKeys)).filter((index) => index !== null)
      : activityYear.year1MonthKeys.map((_, index) => index);

    monthIndexes.forEach((index) => {
      targetQty += toNumber(line.monthlyQty?.[index]);
      targetCa += toNumber(line.monthly?.[index]);
    });

    const attainmentQty = targetQty > 0 ? Math.round((actualQty / targetQty) * 100) : (actualQty > 0 ? 100 : 0);
    const attainmentCa = targetCa > 0 ? Math.round((actualCa / targetCa) * 100) : (actualCa > 0 ? 100 : 0);

    return {
      activity,
      label: line.label || activityLabel(activity),
      unit: line.unit || 'unité',
      actualQty,
      targetQty,
      actualCa,
      targetCa,
      attainmentQty,
      attainmentCa,
    };
  }).filter((row) => row.targetQty > 0 || row.targetCa > 0 || row.actualQty > 0 || row.actualCa > 0);
}

/** CA réalisé vs objectif mensuel + taux d'atteinte (Année 1). */
export function buildMonthlyTargetAttainment(rows = [], options = {}) {
  const plan = options.plan || defaultFinancialPlan;
  const activityYear = options.activityYear || resolveActivityYearContext(options);
  const targetMonthKeys = resolveTargetMonthKeys({ activityYear, monthKeys: options.monthKeys, periodFiltered: options.periodFiltered });
  const monthTargets = buildActivityYearFinancialTargets(plan, activityYear.year1MonthKeys);
  const targetMap = new Map(monthTargets.map((row) => [row.monthCode, row]));

  return targetMonthKeys.map((monthCode) => {
    const target = targetMap.get(monthCode) || { revenueTarget: 0, planMonth: planMonthIndexForKey(monthCode, activityYear.year1MonthKeys) + 1 };
    const actual = arr(rows)
      .filter((order) => orderMonthKey(order) === monthCode)
      .reduce((sum, order) => sum + amount(order), 0);
    const attainment = target.revenueTarget > 0 ? Number(((actual / target.revenueTarget) * 100).toFixed(1)) : 0;
    return {
      key: monthCode,
      mois: activityMonthChartLabel(monthCode, activityYear.year1MonthKeys),
      objectif: target.revenueTarget,
      realise: actual,
      attainment,
    };
  });
}

/** KPIs d'atteinte : mois courant, période filtrée, Année 1. */
export function buildAttainmentKpis(rows = [], options = {}) {
  const plan = options.plan || defaultFinancialPlan;
  const activityYear = options.activityYear || resolveActivityYearContext(options);
  const monthKeys = arr(options.monthKeys);
  const monthTargets = buildActivityYearFinancialTargets(plan, activityYear.year1MonthKeys);
  const targetMap = new Map(monthTargets.map((row) => [row.monthCode, row]));

  const sumActual = (keys) => arr(rows)
    .filter((order) => keys.includes(orderMonthKey(order)))
    .reduce((sum, order) => sum + amount(order), 0);

  const sumTarget = (keys) => keys.reduce((sum, key) => sum + toNumber(targetMap.get(key)?.revenueTarget), 0);

  const currentCode = activityYear.nowKey && activityYear.year1MonthSet.has(activityYear.nowKey)
    ? activityYear.nowKey
    : activityYear.visibleMonthKeys[activityYear.visibleMonthKeys.length - 1];
  const currentTarget = targetMap.get(currentCode)?.revenueTarget || 0;
  const monthActual = sumActual([currentCode]);
  const monthAttainment = currentTarget > 0 ? Math.round((monthActual / currentTarget) * 100) : 0;

  const periodKeys = monthKeys.length
    ? monthKeys.filter((key) => activityYear.year1MonthSet.has(key))
    : activityYear.visibleMonthKeys;
  const periodActual = sumActual(periodKeys);
  const periodTarget = sumTarget(periodKeys);
  const periodAttainment = periodTarget > 0 ? Math.round((periodActual / periodTarget) * 100) : 0;

  const annualKeys = activityYear.year1MonthKeys;
  const annualTarget = sumTarget(annualKeys);
  const annualActual = sumActual(annualKeys);
  const annualAttainment = annualTarget > 0 ? Math.round((annualActual / annualTarget) * 100) : 0;

  return {
    month: {
      label: activityMonthChartLabel(currentCode, activityYear.year1MonthKeys),
      actual: monthActual,
      target: currentTarget,
      attainment: monthAttainment,
    },
    period: {
      label: monthKeys.length ? `${periodKeys.length} mois` : 'Période visible',
      actual: periodActual,
      target: periodTarget,
      attainment: periodAttainment,
    },
    annual: {
      label: activityYear.year1Label,
      actual: annualActual,
      target: annualTarget,
      attainment: annualAttainment,
    },
  };
}

export function buildCommercialChartDataset(props = {}) {
  const scope = normalizePeriodScope(props.periodScope);
  let rows = arr(props.rows || props.salesOrders);
  if (props.periodFiltered && !isAllTimeScope(scope)) {
    rows = filterRowsByPeriodScope(rows, scope);
  }

  const activityYear = resolveActivityYearContext(buildActivityYearInputFromDataMap({
    businessPlans: props.businessPlans,
    investissements: props.investissements,
    lots: props.lots,
    animaux: props.animaux,
    cultures: props.cultures,
    productionLogs: props.productionLogs,
    salesOrders: arr(props.rows || props.salesOrders),
    transactions: props.transactions,
    farm: props.farm || props.ferme,
  }));

  const payments = activeLinkedPayments(rows, arr(props.payments));
  const context = buildMarginContext({ ...props, payments });
  const monthly = buildMonthlySalesAndMargin(rows, context, payments);
  const marginByActivity = buildMarginByActivity(rows, context);
  const periodContext = resolvePeriodContext(scope);
  const monthKeys = props.periodFiltered && periodContext.monthKeys?.length
    ? periodContext.monthKeys
    : monthly.map((row) => row.key);

  const sharedOptions = {
    activityYear,
    monthKeys: props.periodFiltered ? monthKeys : [],
    periodFiltered: props.periodFiltered,
    animaux: props.animaux,
    cultures: props.cultures,
  };

  const volumeVsTarget = buildVolumeVsTargetByActivity(rows, sharedOptions);
  const targetAttainment = buildMonthlyTargetAttainment(rows, sharedOptions);
  const kpis = buildAttainmentKpis(rows, {
    ...sharedOptions,
  });

  const totalPaid = rows.reduce((sum, row) => sum + paidForOrder(row, payments), 0);
  const totalRemaining = rows.reduce((sum, row) => sum + remainingForOrder(row, payments), 0);

  return {
    monthly,
    marginByActivity,
    volumeVsTarget,
    targetAttainment,
    kpis,
    activityYear,
    totalPaid,
    totalRemaining,
    undatedOrders: rows.filter((order) => !orderMonthKey(order)).length,
  };
}
