import {
  HORIZON_FARM_OFFICIAL_BP,
  getOfficialMonthlyCosts,
  getOfficialMonthlyRevenueProjections,
  getOfficialStartupInvestmentLines,
} from './horizonFarmOfficialBusinessPlan';

const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const activity = (key) => HORIZON_FARM_OFFICIAL_BP.revenue.byActivity.find((row) => row.activity === key) || {};
const variableCost = (category) => HORIZON_FARM_OFFICIAL_BP.variableCosts.lines.find((row) => row.category === category) || {};
const startupLine = (category) => HORIZON_FARM_OFFICIAL_BP.startupNeeds.lines.find((row) => row.category === category) || {};

export const HORIZON_FARM_BP_ID = 'BP-HORIZON-FARM';
export const HORIZON_FARM_BP_NAME = 'Business Plan Horizon Farm';

export const HORIZON_FARM_INVESTMENT_LINES = getOfficialStartupInvestmentLines();
export const HORIZON_FARM_MONTHLY_COSTS = getOfficialMonthlyCosts();
export const HORIZON_FARM_REVENUE_PROJECTIONS = getOfficialMonthlyRevenueProjections();

const oeufsRevenue = activity('oeufs');
const chairRevenue = activity('poulets_chair');
const bovinsRevenue = activity('bovins');
const poussinsChairCost = variableCost('poussins_chair');
const achatBovinsCost = variableCost('achat_bovins');
const pondeusesStartup = startupLine('cheptel_pondeuses');
const tresorerieStartup = startupLine('tresorerie_depart');

export const HORIZON_FARM_OPERATIONAL_CYCLES = {
  pondeuses: {
    objectif: 'Œufs toute l’année',
    demarrage: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.pondeuses.initialBand,
    prix_unitaire_poussin: pondeusesStartup.unitPrice,
    investissement_pondeuses: pondeusesStartup.total,
    principe: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.pondeuses.nextBandPolicy,
    objectif_ca_annuel: oeufsRevenue.annual,
    quantite_annuelle_tablettes: oeufsRevenue.quantity,
    prix_tablette: oeufsRevenue.unitPrice,
  },
  chair: {
    objectif: 'Installer progressivement un roulement de bandes de 500',
    demarrage_prudent: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.starterBand,
    cycle_jours: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.cycleDays,
    cadence_apres_demarrage_jours: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.cadenceDaysAfterRamp,
    sequence: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.sequence,
    cartons_par_mois: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.cartonsPerMonth,
    poussins_par_carton: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.chicksPerCarton,
    poussins_mois: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.chair.chicksPerMonth,
    prix_carton: poussinsChairCost.unitPrice,
    cout_poussins_mensuel: poussinsChairCost.monthly,
    cout_poussins_annuel: poussinsChairCost.annual,
    objectif_ca_annuel: chairRevenue.annual,
    quantite_annuelle: chairRevenue.quantity,
    prix_unitaire: chairRevenue.unitPrice,
  },
  bovins: {
    objectif: 'Pipeline d’embouche de 5 bovins par mois',
    demarrage_m1: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.starterM1,
    achat_m2: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.purchaseM2,
    achat_m3: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.purchaseM3,
    cycle_jours: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.cycleDays,
    sequence: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.sequence,
    achat_mensuel_apres_pipeline: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.starterM1,
    vente_mensuelle_apres_pipeline: HORIZON_FARM_OFFICIAL_BP.operatingStrategy.bovins.starterM1,
    prix_achat_unitaire: achatBovinsCost.unitPrice,
    prix_vente_unitaire: bovinsRevenue.unitPrice,
    cout_achat_annuel: achatBovinsCost.annual,
    objectif_ca_annuel: bovinsRevenue.annual,
    quantite_annuelle: bovinsRevenue.quantity,
  },
};

export function buildHorizonFarmBusinessPlan() {
  return {
    id: HORIZON_FARM_BP_ID,
    nom: HORIZON_FARM_BP_NAME,
    title: HORIZON_FARM_BP_NAME,
    statut: 'brouillon_actif',
    source_module: 'investissements',
    source_document: HORIZON_FARM_OFFICIAL_BP.sourceDocument,
    activite: 'ferme_mixte',
    description: 'Business plan Horizon Farm issu du fichier financier officiel. Les chiffres proviennent de la source unique horizonFarmOfficialBusinessPlan : besoins, financement, charges, CA, BFR, trésorerie, prévisionnel et hypothèses opérationnelles validées.',
    identite_projet: HORIZON_FARM_OFFICIAL_BP.identity,
    besoin_demarrage_total: HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal,
    financement_total: HORIZON_FARM_OFFICIAL_BP.funding.officialTotal,
    tresorerie_depart: tresorerieStartup.total,
    objectif_ca_annuel: HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal,
    charges_variables_annuelles: HORIZON_FARM_OFFICIAL_BP.variableCosts.correctedAnnualTotal,
    charges_variables_fichier_annuelles: HORIZON_FARM_OFFICIAL_BP.variableCosts.workbookAnnualTotal,
    charges_fixes_annuelles: HORIZON_FARM_OFFICIAL_BP.fixedCosts.annualByYear[0],
    salaires_remuneration_annuels: HORIZON_FARM_OFFICIAL_BP.payroll.annualTotal,
    amortissement: HORIZON_FARM_OFFICIAL_BP.amortization,
    bfr: HORIZON_FARM_OFFICIAL_BP.workingCapital,
    resultat_previsionnel: HORIZON_FARM_OFFICIAL_BP.forecast.resultByYear,
    caf_previsionnelle: HORIZON_FARM_OFFICIAL_BP.forecast.cashFlowCapacityByYear,
    tresorerie_mensuelle_previsionnelle: HORIZON_FARM_OFFICIAL_BP.forecast.monthlyCashYear1,
    hypotheses_cycles: HORIZON_FARM_OPERATIONAL_CYCLES,
    alertes_integration: HORIZON_FARM_OFFICIAL_BP.integrationWarnings,
    duree_cycle_mois: 12,
    created_at: now(),
  };
}

export function buildHorizonFarmBpLine(line, businessPlanId) {
  return { id: makeId('BPLI'), business_plan_id: businessPlanId, ...line, total: Number(line.quantite || 0) * Number(line.prix_unitaire || 0), statut: 'prevu', source_module: 'investissements', source_business_plan: HORIZON_FARM_BP_NAME };
}

export function buildHorizonFarmMonthlyCost(cost, businessPlanId) {
  return { id: makeId('BPCOST'), business_plan_id: businessPlanId, ...cost, frequence: 'mensuelle', source_module: 'investissements', source_business_plan: HORIZON_FARM_BP_NAME };
}

export function buildHorizonFarmProjection(projection, businessPlanId) {
  return { id: makeId('BPPREV'), business_plan_id: businessPlanId, ...projection, source_module: 'investissements', source_business_plan: HORIZON_FARM_BP_NAME };
}
