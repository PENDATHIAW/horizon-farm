const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

export const HORIZON_FARM_BP_ID = 'BP-HORIZON-FARM';
export const HORIZON_FARM_BP_NAME = 'Business Plan Horizon Farm';

export const HORIZON_FARM_INVESTMENT_LINES = [
  { designation: 'Bande pondeuses à dimensionner selon ponte réelle', categorie: 'cheptel_pondeuses', quantite: 0, unite: 'sujets', prix_unitaire: 0 },
  { designation: 'Achat poussins chair - démarrage prudent 500 sujets', categorie: 'cheptel_chair', quantite: 500, unite: 'sujets', prix_unitaire: 350 },
  { designation: 'Achat bovins - démarrage prudent 5 têtes', categorie: 'cheptel_bovins', quantite: 5, unite: 'têtes', prix_unitaire: 250000 },
  { designation: 'Ovins / moutons - option non prioritaire', categorie: 'cheptel_ovins_option', quantite: 0, unite: 'têtes', prix_unitaire: 0 },
  { designation: 'Caprins / chèvres - option non prioritaire', categorie: 'cheptel_caprins_option', quantite: 0, unite: 'têtes', prix_unitaire: 0 },
  { designation: 'Matériel avicole - abreuvoirs 5L', categorie: 'materiel_avicole', quantite: 1, unite: 'lot', prix_unitaire: 250000 },
  { designation: 'Matériel avicole - abreuvoirs 10L', categorie: 'materiel_avicole', quantite: 1, unite: 'lot', prix_unitaire: 500000 },
  { designation: 'Matériel avicole - plateaux démarrage', categorie: 'materiel_avicole', quantite: 1, unite: 'lot', prix_unitaire: 250000 },
  { designation: 'Matériel avicole - mangeoires trémie', categorie: 'materiel_avicole', quantite: 1, unite: 'lot', prix_unitaire: 300000 },
  { designation: 'Matériel chair - radiants', categorie: 'materiel_chair', quantite: 1, unite: 'lot', prix_unitaire: 240000 },
  { designation: 'Bâches', categorie: 'materiel_avicole', quantite: 1, unite: 'lot', prix_unitaire: 48000 },
  { designation: 'Équipement équipe - bottes', categorie: 'epi', quantite: 1, unite: 'lot', prix_unitaire: 50000 },
  { designation: 'Équipement équipe - combinaisons', categorie: 'epi', quantite: 1, unite: 'lot', prix_unitaire: 50000 },
  { designation: 'Matériel bovins - lassos', categorie: 'materiel_bovins', quantite: 1, unite: 'lot', prix_unitaire: 16000 },
  { designation: 'Matériel avicole - mangeoires petits', categorie: 'materiel_avicole', quantite: 1, unite: 'lot', prix_unitaire: 80000 },
  { designation: 'Papeterie / administratif', categorie: 'administratif', quantite: 1, unite: 'lot', prix_unitaire: 35000 },
  { designation: 'Matériel bovins - abreuvoir', categorie: 'materiel_bovins', quantite: 1, unite: 'lot', prix_unitaire: 25000 },
  { designation: 'Effectif pondeuses et stock matières - à répartir selon décision', categorie: 'cheptel_stock_pondeuses', quantite: 1, unite: 'forfait', prix_unitaire: 19960000 },
  { designation: 'Trésorerie de départ', categorie: 'tresorerie_depart', quantite: 1, unite: 'forfait', prix_unitaire: 4260000 },
];

export const HORIZON_FARM_MONTHLY_COSTS = [
  { designation: 'Vaccins / prophylaxie', categorie: 'sante', montant_mensuel: 40000 },
  { designation: 'Aliments pondeuses', categorie: 'alimentation_pondeuses', montant_mensuel: 3240000 },
  { designation: 'Aliments chair', categorie: 'alimentation_chair', montant_mensuel: 1620000 },
  { designation: 'Aliments bœufs', categorie: 'alimentation_bovins', montant_mensuel: 200000 },
  { designation: 'Emballages œufs 30', categorie: 'emballages_oeufs', montant_mensuel: 56000 },
  { designation: 'Achat bœufs', categorie: 'achat_bovins', montant_mensuel: 1250000 },
  { designation: 'Cartons poussins chair', categorie: 'poussins_chair', montant_mensuel: 85333.33 },
  { designation: 'Gaz', categorie: 'gaz', montant_mensuel: 18000 },
  { designation: 'Litière', categorie: 'litiere', montant_mensuel: 200000 },
  { designation: 'Nettoyage & entretien des locaux', categorie: 'entretien', montant_mensuel: 10000 },
  { designation: 'Loyer pondeuses', categorie: 'loyer_pondeuses', montant_mensuel: 150000 },
  { designation: 'Loyer chair', categorie: 'loyer_chair', montant_mensuel: 150000 },
  { designation: 'Loyer bœufs', categorie: 'loyer_bovins', montant_mensuel: 150000 },
  { designation: 'Provisions besoins divers', categorie: 'provisions', montant_mensuel: 40000 },
  { designation: 'Salaires employés', categorie: 'salaires', montant_mensuel: 320000 },
  { designation: 'Rémunération dirigeante', categorie: 'remuneration_dirigeant', montant_mensuel: 600000 },
];

const monthlyRevenueTargets = [215000, 2730000, 6215000, 6230000, 9705000, 12690000, 13995000, 14010000, 13995000, 14010000, 13995000, 14030000];
const monthlyCostTargets = Array.from({ length: 12 }).map(() => HORIZON_FARM_MONTHLY_COSTS.reduce((sum, row) => sum + Number(row.montant_mensuel || 0), 0));

export const HORIZON_FARM_REVENUE_PROJECTIONS = monthlyRevenueTargets.map((ca, index) => ({
  mois_index: index + 1,
  ca_estime: ca,
  charges_estimees: monthlyCostTargets[index] || 0,
  notes: index === 0
    ? 'Mois de démarrage : trésorerie, fumier et préparation des cycles.'
    : index < 4
      ? 'Montée progressive : chair et bœufs avant plein régime œufs.'
      : 'Projection issue du plan financier Horizon Farm : œufs, chair, bœufs et fumier.',
}));

export function buildHorizonFarmBusinessPlan() {
  return {
    id: HORIZON_FARM_BP_ID,
    nom: HORIZON_FARM_BP_NAME,
    title: HORIZON_FARM_BP_NAME,
    statut: 'brouillon_actif',
    source_module: 'investissements',
    source_document: 'Plan financier prévisionnel Horizon Farm',
    activite: 'ferme_mixte',
    description: 'Business plan Horizon Farm aligné avec le plan financier : 500 poulets de chair au démarrage, 5 bovins au démarrage, ovins/caprins non prioritaires, et bande pondeuse à dimensionner selon objectif œufs, taux de ponte réel et continuité annuelle.',
    besoin_demarrage_total: 26064000,
    financement_total: 26064000,
    tresorerie_depart: 4260000,
    objectif_ca_annuel: 121820000,
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
