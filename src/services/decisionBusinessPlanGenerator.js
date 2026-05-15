import { fmtCurrency } from '../utils/format';

const num = (value = 0) => Number(value || 0);

const templates = {
  oeufs: {
    title: 'Business plan extension pondeuses',
    leadTimeDays: 150,
    costLabel: 'poulettes, bâtiment, aliment, vaccins, mortalité, collecte',
    revenueLabel: 'tablettes d’œufs',
    risks: ['délai avant ponte', 'aliment', 'mortalité', 'stress thermique', 'marché après pic de demande'],
  },
  poulets_chair: {
    title: 'Business plan poulets de chair',
    leadTimeDays: 42,
    costLabel: 'poussins, aliment, chauffage, litière, soins, mortalité',
    revenueLabel: 'poulets vendus',
    risks: ['mortalité', 'prix aliment', 'vente tardive', 'capacité bâtiment', 'précommandes insuffisantes'],
  },
  animaux: {
    title: 'Business plan animaux',
    leadTimeDays: 90,
    costLabel: 'achat sujets, alimentation, santé, transport, garde',
    revenueLabel: 'animaux vendus',
    risks: ['cash immobilisé', 'prix achat élevé', 'maladie', 'vente hors période forte', 'transport'],
  },
  bovins: {
    title: 'Business plan bovins',
    leadTimeDays: 90,
    costLabel: 'achat bovins, alimentation, santé, garde, transport',
    revenueLabel: 'bovins vendus',
    risks: ['cash immobilisé', 'durée de garde', 'alimentation', 'prix de vente', 'précommandes insuffisantes'],
  },
  ovins: {
    title: 'Business plan ovins',
    leadTimeDays: 90,
    costLabel: 'achat ovins, alimentation, santé, garde, transport',
    revenueLabel: 'ovins vendus',
    risks: ['cash immobilisé', 'poids objectif non atteint', 'vente hors période forte', 'santé', 'précommandes insuffisantes'],
  },
  caprins: {
    title: 'Business plan caprins',
    leadTimeDays: 90,
    costLabel: 'achat caprins, alimentation, santé, garde, transport',
    revenueLabel: 'caprins vendus',
    risks: ['cash immobilisé', 'croissance insuffisante', 'marché limité', 'santé', 'précommandes insuffisantes'],
  },
  cultures: {
    title: 'Business plan culture test',
    leadTimeDays: 90,
    costLabel: 'semences/plants, eau, engrais, traitements, main-d’œuvre',
    revenueLabel: 'récolte vendue',
    risks: ['sol non validé', 'eau insuffisante', 'maladie', 'prix marché', 'pertes post-récolte'],
  },
};

export function generateDecisionBusinessPlan(recommendation = {}, context = {}) {
  const activity = recommendation.activity || 'poulets_chair';
  const template = templates[activity] || templates.animaux;
  const cashAvailable = num(context.cashAvailable);
  const suggestedInvestment = num(context.suggestedInvestment || cashAvailable * 0.35 || 0);
  const expectedRevenue = suggestedInvestment > 0 ? suggestedInvestment * 1.35 : 0;
  const expectedMargin = Math.max(0, expectedRevenue - suggestedInvestment);
  const breakEven = suggestedInvestment;

  return {
    id: `BP-HORIZON-${Date.now()}`,
    title: recommendation.businessPlanTitle || template.title,
    nom: recommendation.businessPlanTitle || template.title,
    activity,
    activite: activity,
    source_recommendation_id: recommendation.id,
    decision: recommendation.title || 'Investissement à étudier',
    why_now: recommendation.recommendation || 'Recommandation générée par le Centre décisionnel.',
    lead_time_days: recommendation.horizon_days || template.leadTimeDays,
    investment_needed: suggestedInvestment,
    expected_revenue: expectedRevenue,
    expected_margin: expectedMargin,
    break_even_amount: breakEven,
    montant_investissement: suggestedInvestment,
    ca_attendu: expectedRevenue,
    marge_attendue: expectedMargin,
    seuil_rentabilite: breakEven,
    statut: 'brouillon_decisionnel',
    source_module: 'centre_decisionnel',
    cost_structure: template.costLabel,
    revenue_driver: template.revenueLabel,
    risks: template.risks,
    risques: template.risks.join(', '),
    success_conditions: [
      'cash disponible ou précommandes sécurisées',
      'capacité opérationnelle confirmée',
      'stock/aliment/intrants disponibles',
      'clients ou canaux de vente identifiés',
      'suivi sanitaire et pertes maîtrisés',
    ],
    summary: `${template.title} · investissement indicatif ${fmtCurrency(suggestedInvestment)} · CA attendu ${fmtCurrency(expectedRevenue)} · marge estimée ${fmtCurrency(expectedMargin)}.`,
    resume: `${template.title} · investissement indicatif ${fmtCurrency(suggestedInvestment)} · CA attendu ${fmtCurrency(expectedRevenue)} · marge estimée ${fmtCurrency(expectedMargin)}.`,
    notes: buildBusinessPlanDraftText({
      title: recommendation.businessPlanTitle || template.title,
      decision: recommendation.title || 'Investissement à étudier',
      why_now: recommendation.recommendation || 'Recommandation générée par le Centre décisionnel.',
      lead_time_days: recommendation.horizon_days || template.leadTimeDays,
      investment_needed: suggestedInvestment,
      expected_revenue: expectedRevenue,
      expected_margin: expectedMargin,
      break_even_amount: breakEven,
      cost_structure: template.costLabel,
      revenue_driver: template.revenueLabel,
      risks: template.risks,
      success_conditions: [
        'cash disponible ou précommandes sécurisées',
        'capacité opérationnelle confirmée',
        'stock/aliment/intrants disponibles',
        'clients ou canaux de vente identifiés',
        'suivi sanitaire et pertes maîtrisés',
      ],
    }),
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
    `Investissement indicatif : ${fmtCurrency(plan.investment_needed)}`,
    `CA attendu : ${fmtCurrency(plan.expected_revenue)}`,
    `Marge attendue : ${fmtCurrency(plan.expected_margin)}`,
    `Seuil de rentabilité : ${fmtCurrency(plan.break_even_amount)}`,
    '',
    `Structure de coût : ${plan.cost_structure}`,
    `Source de CA : ${plan.revenue_driver}`,
    '',
    `Risques : ${(plan.risks || []).join(', ')}`,
    `Conditions de réussite : ${(plan.success_conditions || []).join(', ')}`,
  ].join('\n');
}

export default generateDecisionBusinessPlan;
