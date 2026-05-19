import { fmtCurrency } from '../utils/format';

const num = (value = 0) => Number(value || 0);
const positive = (...values) => values.map(num).find((value) => value > 0) || 0;
const round = (value) => Math.round(num(value));

const templates = {
  oeufs: {
    title: 'Business plan extension pondeuses',
    leadTimeDays: 150,
    unitLabel: 'tablettes',
    defaultUnitPrice: 2800,
    defaultUnitCost: 550,
    costLabel: 'poulettes amorties, aliment, santé, eau, électricité, main-d’œuvre, alvéoles et transport',
    revenueLabel: 'tablettes d’œufs vendues',
    risks: ['délai avant ponte', 'aliment', 'mortalité', 'stress thermique', 'marché après pic de demande'],
  },
  poulets_chair: {
    title: 'Business plan poulets de chair',
    leadTimeDays: 42,
    unitLabel: 'poulets',
    defaultUnitPrice: 3700,
    defaultUnitCost: 1900,
    costLabel: 'poussins, aliment, chauffage, litière, soins, mortalité',
    revenueLabel: 'poulets vendus',
    risks: ['mortalité', 'prix aliment', 'vente tardive', 'capacité bâtiment', 'précommandes insuffisantes'],
  },
  animaux: {
    title: 'Business plan animaux',
    leadTimeDays: 90,
    unitLabel: 'animaux',
    defaultUnitPrice: 120000,
    defaultUnitCost: 85000,
    costLabel: 'achat sujets, alimentation, santé, transport, garde',
    revenueLabel: 'animaux vendus',
    risks: ['cash immobilisé', 'prix achat élevé', 'maladie', 'vente hors période forte', 'transport'],
  },
  bovins: {
    title: 'Business plan bovins',
    leadTimeDays: 90,
    unitLabel: 'bovins',
    defaultUnitPrice: 365000,
    defaultUnitCost: 300000,
    costLabel: 'achat bovins, alimentation, santé, garde, transport',
    revenueLabel: 'bovins vendus',
    risks: ['cash immobilisé', 'durée de garde', 'alimentation', 'prix de vente', 'précommandes insuffisantes'],
  },
  ovins: {
    title: 'Business plan ovins',
    leadTimeDays: 90,
    unitLabel: 'ovins',
    defaultUnitPrice: 95000,
    defaultUnitCost: 78000,
    costLabel: 'achat ovins, alimentation, santé, garde, transport',
    revenueLabel: 'ovins vendus',
    risks: ['cash immobilisé', 'poids objectif non atteint', 'vente hors période forte', 'santé', 'précommandes insuffisantes'],
  },
  caprins: {
    title: 'Business plan caprins',
    leadTimeDays: 90,
    unitLabel: 'caprins',
    defaultUnitPrice: 75000,
    defaultUnitCost: 61000,
    costLabel: 'achat caprins, alimentation, santé, garde, transport',
    revenueLabel: 'caprins vendus',
    risks: ['cash immobilisé', 'croissance insuffisante', 'marché limité', 'santé', 'précommandes insuffisantes'],
  },
  cultures: {
    title: 'Business plan culture test',
    leadTimeDays: 90,
    unitLabel: 'unités récoltées',
    defaultUnitPrice: 1200,
    defaultUnitCost: 650,
    costLabel: 'semences/plants, eau, engrais, traitements, main-d’œuvre',
    revenueLabel: 'récolte vendue',
    risks: ['sol non validé', 'eau insuffisante', 'maladie', 'prix marché', 'pertes post-récolte'],
  },
};

function deriveUnitEconomics(recommendation = {}, context = {}, template = {}) {
  const units = positive(
    recommendation.gap_units,
    recommendation.demand_units,
    recommendation.quantity,
    recommendation.recommended_quantity,
    context.gapUnits,
    context.units,
    context.quantity,
    1
  );
  const revenueTarget = positive(
    recommendation.gap_revenue,
    recommendation.demand_revenue,
    recommendation.available_revenue,
    recommendation.estimated_value,
    context.expectedRevenue,
    context.revenueTarget
  );
  const unitPrice = positive(
    recommendation.unit_price,
    recommendation.price_per_unit,
    context.unitPrice,
    revenueTarget > 0 && units > 0 ? revenueTarget / units : 0,
    template.defaultUnitPrice
  );
  const unitCost = positive(
    recommendation.unit_cost,
    recommendation.cost_per_unit,
    context.unitCost,
    context.costPerUnit,
    template.defaultUnitCost
  );
  const variableCost = unitCost * units;
  const revenue = unitPrice * units;
  const unitMargin = unitPrice - unitCost;
  const variableMargin = revenue - variableCost;
  return { units, unitPrice, unitCost, variableCost, revenue, unitMargin, variableMargin };
}

export function generateDecisionBusinessPlan(recommendation = {}, context = {}) {
  const activity = recommendation.activity || 'poulets_chair';
  const template = templates[activity] || templates.animaux;
  const cashAvailable = num(context.cashAvailable);
  const economics = deriveUnitEconomics(recommendation, context, template);
  const suggestedInvestment = positive(context.suggestedInvestment, recommendation.suggested_investment, recommendation.investment_needed, cashAvailable * 0.35, economics.variableCost);
  const fixedCosts = positive(context.fixedCosts, recommendation.fixed_costs, 0);
  const expectedRevenue = economics.revenue;
  const expectedMarginBeforeInvestment = economics.variableMargin - fixedCosts;
  const expectedMargin = expectedMarginBeforeInvestment - suggestedInvestment;
  const breakEvenUnits = economics.unitMargin > 0 ? Math.ceil((suggestedInvestment + fixedCosts) / economics.unitMargin) : null;
  const breakEvenAmount = breakEvenUnits ? breakEvenUnits * economics.unitPrice : 0;
  const roi = suggestedInvestment > 0 ? (expectedMargin / suggestedInvestment) * 100 : 0;

  const title = recommendation.businessPlanTitle || template.title;
  const successConditions = [
    'cash disponible ou précommandes sécurisées',
    'capacité opérationnelle confirmée',
    'stock/aliment/intrants disponibles',
    'clients ou canaux de vente identifiés',
    'suivi sanitaire et pertes maîtrisés',
  ];

  const plan = {
    id: `BP-HORIZON-${Date.now()}`,
    title,
    nom: title,
    activity,
    activite: activity,
    source_recommendation_id: recommendation.id,
    decision: recommendation.title || 'Investissement à étudier',
    why_now: recommendation.recommendation || 'Recommandation générée par le Centre décisionnel.',
    lead_time_days: recommendation.horizon_days || recommendation.lead_time_days || template.leadTimeDays,
    unit_label: template.unitLabel,
    units_target: round(economics.units),
    unit_price: round(economics.unitPrice),
    unit_cost: round(economics.unitCost),
    unit_margin: round(economics.unitMargin),
    variable_costs: round(economics.variableCost),
    fixed_costs: round(fixedCosts),
    investment_needed: round(suggestedInvestment),
    expected_revenue: round(expectedRevenue),
    expected_margin_before_investment: round(expectedMarginBeforeInvestment),
    expected_margin: round(expectedMargin),
    roi_percent: Number(roi.toFixed(1)),
    break_even_units: breakEvenUnits,
    break_even_amount: round(breakEvenAmount),
    montant_investissement: round(suggestedInvestment),
    ca_attendu: round(expectedRevenue),
    marge_attendue: round(expectedMargin),
    seuil_rentabilite: round(breakEvenAmount),
    statut: 'brouillon_decisionnel',
    source_module: 'centre_decisionnel',
    cost_structure: template.costLabel,
    revenue_driver: template.revenueLabel,
    risks: template.risks,
    risques: template.risks.join(', '),
    success_conditions: successConditions,
  };

  return {
    ...plan,
    summary: `${title} · ${round(economics.units)} ${template.unitLabel} · CA ${fmtCurrency(expectedRevenue)} · marge après investissement ${fmtCurrency(expectedMargin)} · seuil ${breakEvenUnits || 'non calculable'} ${template.unitLabel}.`,
    resume: `${title} · ${round(economics.units)} ${template.unitLabel} · CA ${fmtCurrency(expectedRevenue)} · marge après investissement ${fmtCurrency(expectedMargin)} · seuil ${breakEvenUnits || 'non calculable'} ${template.unitLabel}.`,
    notes: buildBusinessPlanDraftText(plan),
  };
}

export function buildBusinessPlanDraftText(plan = {}) {
  return [
    `# ${plan.title}`,
    '',
    `Décision : ${plan.decision}`,
    `Pourquoi maintenant : ${plan.why_now}`,
    `Délai avant retour estimé : ${plan.lead_time_days} jours`,
    '',
    `Objectif : ${plan.units_target || 0} ${plan.unit_label || 'unités'}`,
    `Prix de vente unitaire : ${fmtCurrency(plan.unit_price)}`,
    `Coût unitaire : ${fmtCurrency(plan.unit_cost)}`,
    `Marge unitaire : ${fmtCurrency(plan.unit_margin)}`,
    '',
    `Investissement indicatif : ${fmtCurrency(plan.investment_needed)}`,
    `Charges variables : ${fmtCurrency(plan.variable_costs)}`,
    `Charges fixes : ${fmtCurrency(plan.fixed_costs)}`,
    `CA attendu : ${fmtCurrency(plan.expected_revenue)}`,
    `Marge avant investissement : ${fmtCurrency(plan.expected_margin_before_investment)}`,
    `Marge après investissement : ${fmtCurrency(plan.expected_margin)}`,
    `ROI : ${plan.roi_percent || 0}%`,
    `Seuil de rentabilité : ${plan.break_even_units || 'non calculable'} ${plan.unit_label || 'unités'} (${fmtCurrency(plan.break_even_amount)})`,
    '',
    `Structure de coût : ${plan.cost_structure}`,
    `Source de CA : ${plan.revenue_driver}`,
    '',
    `Risques : ${(plan.risks || []).join(', ')}`,
    `Conditions de réussite : ${(plan.success_conditions || []).join(', ')}`,
  ].join('\n');
}

export default generateDecisionBusinessPlan;
