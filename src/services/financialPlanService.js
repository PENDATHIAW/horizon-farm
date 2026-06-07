import { HORIZON_FARM_OFFICIAL_BP } from './horizonFarmOfficialBusinessPlan.js';
import {
  activityMonthChartLabel,
  buildActivityYearInputFromDataMap,
  planMonthIndexForKey,
  resolveActivityYearContext,
} from '../utils/activityYear.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0) || 0;
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
const monthKey = (value) => String(value || '').slice(0, 7);
const currentYear = () => new Date().getFullYear();

export const FINANCIAL_PLAN_ID = 'HORIZON-FARM-PREVISIONNEL-5-ANS';
export const monthlyRevenueTargets = HORIZON_FARM_OFFICIAL_BP.revenue.monthly.map((row) => row.total);

const monthlyArray = (activity) => HORIZON_FARM_OFFICIAL_BP.revenue.monthly.map((row) => Number(row[activity] || 0));
const monthlyQtyFromRevenue = (activity, unitPrice) => monthlyArray(activity).map((amount) => unitPrice > 0 ? Math.round(amount / unitPrice) : 0);
const officialActivity = (activity) => HORIZON_FARM_OFFICIAL_BP.revenue.byActivity.find((row) => row.activity === activity) || {};
const activityKeyMap = { oeufs: 'oeufs', poulets_chair: 'chair', bovins: 'bovins', fumier_pondeuses: 'fumierPondeuses', fumier_chair: 'fumierChair', fumier_bovins: 'fumierBovins' };
const activityLabelFallback = { oeufs: 'Tablettes 30 œufs', poulets_chair: 'Poulets de chair', bovins: 'Bœufs / embouche', fumier_pondeuses: 'Fumier pondeuses', fumier_chair: 'Fumier chair', fumier_bovins: 'Fumier bœufs' };
const mapActivityName = (category = '') => {
  if (category.includes('pondeuses') || category.includes('oeufs')) return 'pondeuses';
  if (category.includes('chair') || category.includes('poussins')) return 'chair';
  if (category.includes('bovins') || category.includes('boeufs')) return 'bovins';
  return 'global';
};

export const defaultFinancialPlan = {
  id: FINANCIAL_PLAN_ID,
  name: 'Horizon Farm — Plan financier prévisionnel 5 ans',
  sourceWorkbook: HORIZON_FARM_OFFICIAL_BP.sourceDocument,
  year: currentYear(),
  annualRevenueTarget: HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal,
  startingNeedsTotal: HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal,
  fundingTotal: HORIZON_FARM_OFFICIAL_BP.funding.officialTotal,
  workingCashStart: HORIZON_FARM_OFFICIAL_BP.startupNeeds.lines.find((line) => line.category === 'tresorerie_depart')?.total || 0,
  revenueLines: HORIZON_FARM_OFFICIAL_BP.revenue.byActivity.map((row) => {
    const key = activityKeyMap[row.activity] || row.activity;
    return {
      activity: row.activity,
      label: row.label || activityLabelFallback[row.activity] || row.activity,
      annualRevenue: row.annual,
      unit: row.activity === 'oeufs' ? 'tablette' : row.activity === 'bovins' ? 'bœuf' : row.activity.includes('fumier') ? 'lot' : 'unité',
      annualQty: row.quantity,
      unitPrice: row.unitPrice,
      monthlyQty: monthlyQtyFromRevenue(key, row.unitPrice),
      monthly: monthlyArray(key),
    };
  }),
  variableCostLines: HORIZON_FARM_OFFICIAL_BP.variableCosts.lines.map((line) => ({
    activity: mapActivityName(line.category),
    category: line.category,
    label: line.designation,
    monthlyBudget: line.monthly,
    annualBudget: line.annual,
    corrected: Boolean(line.corrected),
  })),
  fixedCostLines: HORIZON_FARM_OFFICIAL_BP.fixedCosts.lines.map((line) => ({
    activity: mapActivityName(line.category),
    category: line.category,
    label: line.designation,
    monthlyBudget: line.monthly,
    annualBudget: line.annual,
  })),
  salaryLines: HORIZON_FARM_OFFICIAL_BP.payroll.lines.map((line) => ({
    activity: line.designation.toLowerCase().includes('bovin') ? 'bovins' : line.designation.toLowerCase().includes('aviculture') ? 'avicole' : 'global',
    category: 'salaires',
    label: line.designation,
    monthlyBudget: line.annual / 12,
    annualBudget: line.annual,
  })),
  investmentLines: HORIZON_FARM_OFFICIAL_BP.startupNeeds.lines.map((line) => ({
    activity: mapActivityName(line.category),
    category: line.category,
    label: line.designation,
    budget: line.total,
  })),
};

export function detectRevenueActivity(row = {}, dataMap = {}) {
  const text = norm(`${row.activity || ''} ${row.activite || ''} ${row.source_type || ''} ${row.type_vente || ''} ${row.product_type || ''} ${row.product_name || ''} ${row.libelle || ''} ${row.description || ''} ${row.source_id || ''}`);
  if (text.includes('oeuf') || text.includes('tablette') || text.includes('plateau') || text.includes('pondeuse')) return 'oeufs';
  if (text.includes('chair') || text.includes('poulet')) return 'poulets_chair';
  if (text.includes('fumier') && (text.includes('pondeuse') || text.includes('oeuf'))) return 'fumier_pondeuses';
  if (text.includes('fumier') && (text.includes('chair') || text.includes('poulet'))) return 'fumier_chair';
  if (text.includes('fumier') && (text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf'))) return 'fumier_bovins';
  if (text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf') || text.includes('taureau') || text.includes('veau')) return 'bovins';
  const sourceId = String(row.source_id || row.related_id || row.product_id || row.entity_id || '');
  const animal = arr(dataMap.animaux).find((item) => String(item.id) === sourceId || String(item.tag) === sourceId);
  if (animal && norm(`${animal.type || ''} ${animal.espece || ''}`).includes('bovin')) return 'bovins';
  return 'autres';
}

export function detectExpenseBucket(row = {}) {
  const text = norm(`${row.category || ''} ${row.categorie || ''} ${row.libelle || ''} ${row.description || ''} ${row.product_name || ''} ${row.produit || ''}`);
  if (text.includes('aliment') && (text.includes('pondeuse') || text.includes('oeuf'))) return 'aliments_pondeuses';
  if (text.includes('aliment') && (text.includes('chair') || text.includes('poulet'))) return 'aliments_chair';
  if (text.includes('aliment') && (text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf'))) return 'aliments_bovins';
  if (text.includes('emballage') || text.includes('alveole') || text.includes('alvéole') || text.includes('tablette') || text.includes('plateau')) return 'emballages_oeufs';
  if (text.includes('vaccin') || text.includes('prophylaxie') || text.includes('sante') || text.includes('sant') || text.includes('veterinaire')) return 'sante';
  if (text.includes('gaz') || text.includes('chauffage')) return 'gaz';
  if (text.includes('litiere') || text.includes('litière') || text.includes('copeau')) return 'litiere';
  if (text.includes('loyer')) return 'loyer';
  if (text.includes('salaire') || text.includes('remuneration') || text.includes('rh') || text.includes('paie')) return 'salaires';
  if (text.includes('achat') && (text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf'))) return 'achat_boeufs';
  return 'autres';
}

function revenueAmount(row = {}) { return num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total); }
function expenseAmount(row = {}) { return num(row.montant ?? row.amount ?? row.total ?? row.total_cost ?? row.cout_total ?? row.cost); }

export function buildMonthlyFinancialTargets(plan = defaultFinancialPlan, year = currentYear()) {
  return Array.from({ length: 12 }).map((_, index) => {
    const month = index + 1;
    const monthCode = `${year}-${String(month).padStart(2, '0')}`;
    const revenueTarget = plan.revenueLines.reduce((sum, line) => sum + num(line.monthly?.[index]), 0);
    const variableCosts = plan.variableCostLines.reduce((sum, line) => sum + num(line.monthlyBudget), 0);
    const fixedCosts = plan.fixedCostLines.reduce((sum, line) => sum + num(line.monthlyBudget), 0);
    const salaries = plan.salaryLines.reduce((sum, line) => sum + num(line.monthlyBudget), 0);
    return { month, monthCode, revenueTarget, variableCosts, fixedCosts, salaries, costTarget: variableCosts + fixedCosts + salaries, marginTarget: revenueTarget - variableCosts - fixedCosts - salaries };
  });
}

/** Objectifs mensuels calés sur l'Année 1 d'activité (M1 = mois de démarrage). */
export function buildActivityYearFinancialTargets(plan = defaultFinancialPlan, year1MonthKeys = []) {
  return arr(year1MonthKeys).map((monthCode, index) => {
    const revenueTarget = plan.revenueLines.reduce((sum, line) => sum + num(line.monthly?.[index]), 0);
    const variableCosts = plan.variableCostLines.reduce((sum, line) => sum + num(line.monthlyBudget), 0);
    const fixedCosts = plan.fixedCostLines.reduce((sum, line) => sum + num(line.monthlyBudget), 0);
    const salaries = plan.salaryLines.reduce((sum, line) => sum + num(line.monthlyBudget), 0);
    return {
      planMonth: index + 1,
      monthCode,
      revenueTarget,
      variableCosts,
      fixedCosts,
      salaries,
      costTarget: variableCosts + fixedCosts + salaries,
      marginTarget: revenueTarget - variableCosts - fixedCosts - salaries,
    };
  });
}

export function buildFinancialPlanVsActual(dataMap = {}, plan = defaultFinancialPlan, options = {}) {
  const activityYear = options.activityYear || resolveActivityYearContext(buildActivityYearInputFromDataMap(dataMap));
  const salesOrders = arr(dataMap.salesOrders || dataMap.sales_orders);
  const payments = arr(dataMap.payments);
  const transactions = arr(dataMap.transactions || dataMap.finances);
  const monthTargets = buildActivityYearFinancialTargets(plan, activityYear.year1MonthKeys);
  const targetMap = new Map(monthTargets.map((row) => [row.monthCode, row]));

  const monthCode = options.monthCode
    || (activityYear.nowKey && activityYear.year1MonthSet.has(activityYear.nowKey)
      ? activityYear.nowKey
      : activityYear.visibleMonthKeys[activityYear.visibleMonthKeys.length - 1]);
  const planMonthIndex = planMonthIndexForKey(monthCode, activityYear.year1MonthKeys);
  const currentMonthTarget = targetMap.get(monthCode) || monthTargets[planMonthIndex ?? 0] || monthTargets[0];

  const revenueByActivity = plan.revenueLines.map((line) => {
    const actual = salesOrders
      .filter((order) => monthKey(order.date || order.date_commande || order.created_at) === monthCode)
      .filter((order) => detectRevenueActivity(order, dataMap) === line.activity)
      .reduce((sum, order) => sum + revenueAmount(order), 0);
    const target = planMonthIndex !== null ? num(line.monthly?.[planMonthIndex]) : 0;
    return { ...line, target, actual, gap: actual - target, attainment: target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0 };
  });

  const actualRevenue = revenueByActivity.reduce((sum, row) => sum + row.actual, 0);
  const actualCashRaw = Math.max(
    payments.filter((payment) => monthKey(payment.date || payment.date_paiement || payment.created_at) === monthCode).reduce((sum, payment) => sum + num(payment.montant_paye ?? payment.montant ?? payment.amount), 0),
    transactions.filter((trx) => monthKey(trx.date || trx.created_at) === monthCode && norm(trx.type).includes('entree')).reduce((sum, trx) => sum + expenseAmount(trx), 0)
  );
  const expensesThisMonth = transactions.filter((trx) => monthKey(trx.date || trx.created_at) === monthCode && norm(trx.type).includes('sortie'));
  const actualCosts = expensesThisMonth.reduce((sum, trx) => sum + expenseAmount(trx), 0);
  const costsByBucket = expensesThisMonth.reduce((acc, trx) => {
    const bucket = detectExpenseBucket(trx);
    acc[bucket] = (acc[bucket] || 0) + expenseAmount(trx);
    return acc;
  }, {});

  const annualTarget = plan.revenueLines.reduce((sum, line) => sum + num(line.annualRevenue), 0);
  const annualActual = salesOrders
    .filter((order) => activityYear.year1MonthSet.has(monthKey(order.date || order.date_commande || order.created_at)))
    .reduce((sum, order) => sum + revenueAmount(order), 0);
  const actualCash = actualRevenue > 0 ? Math.min(actualRevenue, actualCashRaw) : actualCashRaw;

  return {
    plan,
    activityYear,
    year: activityYear.year1Label,
    month: planMonthIndex !== null ? planMonthIndex + 1 : 1,
    monthCode,
    monthLabel: activityMonthChartLabel(monthCode, activityYear.year1MonthKeys),
    monthTargets,
    currentMonthTarget,
    revenueByActivity,
    costsByBucket,
    actualRevenue,
    actualCash,
    actualCosts,
    actualMargin: actualRevenue - actualCosts,
    revenueGap: actualRevenue - currentMonthTarget.revenueTarget,
    costGap: actualCosts - currentMonthTarget.costTarget,
    marginGap: (actualRevenue - actualCosts) - currentMonthTarget.marginTarget,
    revenueAttainment: currentMonthTarget.revenueTarget > 0 ? Math.round((actualRevenue / currentMonthTarget.revenueTarget) * 100) : 0,
    cashRate: actualRevenue > 0 ? Math.min(100, Math.round((actualCash / actualRevenue) * 100)) : 0,
    annualTarget,
    annualActual,
    annualAttainment: annualTarget > 0 ? Math.round((annualActual / annualTarget) * 100) : 0,
  };
}

export default buildFinancialPlanVsActual;
