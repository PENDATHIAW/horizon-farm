const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0) || 0;
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
const monthKey = (value) => String(value || '').slice(0, 7);
const currentYear = () => new Date().getFullYear();

export const FINANCIAL_PLAN_ID = 'HORIZON-FARM-PREVISIONNEL-5-ANS';

export const defaultFinancialPlan = {
  id: FINANCIAL_PLAN_ID,
  name: 'Horizon Farm — Plan financier prévisionnel 5 ans',
  year: currentYear(),
  annualRevenueTarget: 121820000,
  revenueLines: [
    { activity: 'oeufs', label: 'Tablettes 30 œufs', annualRevenue: 36630000, unit: 'tablette', unitPrice: 2200, monthly: [0, 0, 0, 0, 990000, 1980000, 2970000, 3960000, 4950000, 5940000, 6930000, 7920000] },
    { activity: 'poulets_chair', label: 'Poulets de chair', annualRevenue: 47520000, unit: 'poulet', unitPrice: 2500, monthly: [0, 4320000, 4320000, 4320000, 4320000, 4320000, 4320000, 4320000, 4320000, 4320000, 4320000, 4320000] },
    { activity: 'bovins', label: 'Bœufs / embouche', annualRevenue: 35000000, unit: 'bœuf', unitPrice: 700000, monthly: [0, 0, 3500000, 3500000, 3500000, 3500000, 3500000, 3500000, 3500000, 3500000, 3500000, 3500000] },
    { activity: 'fumier_pondeuses', label: 'Fumier pondeuses', annualRevenue: 1800000, unit: 'lot', unitPrice: 0, monthly: [0, 0, 0, 0, 150000, 150000, 150000, 150000, 150000, 150000, 450000, 450000] },
    { activity: 'fumier_chair', label: 'Fumier chair', annualRevenue: 600000, unit: 'lot', unitPrice: 0, monthly: [0, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000] },
    { activity: 'fumier_bovins', label: 'Fumier bœufs', annualRevenue: 270000, unit: 'lot', unitPrice: 0, monthly: [0, 0, 27000, 27000, 27000, 27000, 27000, 27000, 27000, 27000, 27000, 27000] },
  ],
  variableCostLines: [
    { activity: 'pondeuses', category: 'vaccins', label: 'Vaccins pondeuses', monthlyBudget: 0 },
    { activity: 'pondeuses', category: 'alimentation', label: 'Aliments pondeuses', monthlyBudget: 3240000 },
    { activity: 'pondeuses', category: 'emballage', label: 'Emballages œufs / tablettes', monthlyBudget: 56000 },
    { activity: 'chair', category: 'poussins', label: 'Poussins chair', monthlyBudget: 0 },
    { activity: 'chair', category: 'alimentation', label: 'Aliments chair', monthlyBudget: 0 },
    { activity: 'chair', category: 'gaz', label: 'Gaz chauffage chair', monthlyBudget: 0 },
    { activity: 'chair', category: 'litiere', label: 'Litière chair', monthlyBudget: 0 },
    { activity: 'bovins', category: 'achat_animaux', label: 'Achat bœufs', monthlyBudget: 1500000 },
    { activity: 'bovins', category: 'alimentation', label: 'Aliments bœufs', monthlyBudget: 0 },
    { activity: 'global', category: 'sante', label: 'Santé / prophylaxie', monthlyBudget: 0 },
  ],
  fixedCostLines: [
    { activity: 'pondeuses', category: 'loyer', label: 'Loyer pondeuses', monthlyBudget: 150000 },
    { activity: 'chair', category: 'loyer', label: 'Loyer chair', monthlyBudget: 100000 },
    { activity: 'bovins', category: 'loyer', label: 'Loyer bœufs', monthlyBudget: 100000 },
    { activity: 'global', category: 'entretien', label: 'Nettoyage / entretien', monthlyBudget: 100000 },
    { activity: 'global', category: 'provisions', label: 'Provisions diverses', monthlyBudget: 100000 },
  ],
  salaryLines: [
    { activity: 'global', category: 'salaires', label: 'Salaires équipe', monthlyBudget: 920000 },
  ],
  investmentLines: [
    { activity: 'pondeuses', category: 'cheptel', label: '3000 poussins pondeuses', budget: 0 },
    { activity: 'chair', category: 'materiel', label: 'Matériel chair : mangeoires, abreuvoirs, radiants, bâches', budget: 0 },
    { activity: 'bovins', category: 'materiel', label: 'Matériel bovins', budget: 0 },
  ],
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
  if (text.includes('vaccin') || text.includes('sante') || text.includes('sant') || text.includes('veterinaire')) return 'sante';
  if (text.includes('gaz') || text.includes('chauffage')) return 'gaz';
  if (text.includes('litiere') || text.includes('litière') || text.includes('copeau')) return 'litiere';
  if (text.includes('loyer')) return 'loyer';
  if (text.includes('salaire') || text.includes('rh') || text.includes('paie')) return 'salaires';
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

export function buildFinancialPlanVsActual(dataMap = {}, plan = defaultFinancialPlan, options = {}) {
  const year = options.year || currentYear();
  const month = options.month || new Date().getMonth() + 1;
  const monthCode = `${year}-${String(month).padStart(2, '0')}`;
  const salesOrders = arr(dataMap.salesOrders || dataMap.sales_orders);
  const payments = arr(dataMap.payments);
  const transactions = arr(dataMap.transactions || dataMap.finances);
  const monthTargets = buildMonthlyFinancialTargets(plan, year);
  const currentMonthTarget = monthTargets[month - 1] || monthTargets[0];

  const revenueByActivity = plan.revenueLines.map((line) => {
    const actual = salesOrders
      .filter((order) => monthKey(order.date || order.date_commande || order.created_at) === monthCode)
      .filter((order) => detectRevenueActivity(order, dataMap) === line.activity)
      .reduce((sum, order) => sum + revenueAmount(order), 0);
    const target = num(line.monthly?.[month - 1]);
    return { ...line, target, actual, gap: actual - target, attainment: target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0 };
  });

  const actualRevenue = revenueByActivity.reduce((sum, row) => sum + row.actual, 0);
  const actualCash = Math.max(
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
  const annualActual = salesOrders.filter((order) => String(order.date || order.date_commande || order.created_at || '').startsWith(String(year))).reduce((sum, order) => sum + revenueAmount(order), 0);

  return {
    plan,
    year,
    month,
    monthCode,
    monthTargets,
    currentMonthTarget,
    revenueByActivity,
    costsByBucket,
    actualRevenue,
    actualCash: Math.min(actualRevenue || actualCash, actualCash),
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
