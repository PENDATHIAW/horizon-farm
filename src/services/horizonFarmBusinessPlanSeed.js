const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

export const HORIZON_FARM_BP_ID = 'BP-HORIZON-FARM';
export const HORIZON_FARM_BP_NAME = 'Business Plan Horizon Farm';

export const HORIZON_FARM_INVESTMENT_LINES = [
  { designation: 'Abreuvoir 5L', categorie: 'petit_materiel_avicole', quantite: 100, unite: 'unités', prix_unitaire: 2500 },
  { designation: 'Abreuvoir 10L', categorie: 'petit_materiel_avicole', quantite: 100, unite: 'unités', prix_unitaire: 5000 },
  { designation: 'Plateaux démarrage', categorie: 'petit_materiel_avicole', quantite: 100, unite: 'unités', prix_unitaire: 2500 },
  { designation: 'Mangeoires trémie', categorie: 'petit_materiel_avicole', quantite: 100, unite: 'unités', prix_unitaire: 3000 },
  { designation: 'Radiants', categorie: 'materiel_chair', quantite: 4, unite: 'unités', prix_unitaire: 60000 },
  { designation: 'Bâches', categorie: 'petit_materiel_avicole', quantite: 120, unite: 'unités', prix_unitaire: 400 },
  { designation: 'Bottes', categorie: 'epi', quantite: 5, unite: 'paires', prix_unitaire: 10000 },
  { designation: 'Combinaisons', categorie: 'epi', quantite: 5, unite: 'unités', prix_unitaire: 10000 },
  { designation: 'Lassos', categorie: 'materiel_bovins', quantite: 2, unite: 'unités', prix_unitaire: 8000 },
  { designation: 'Mangeoires petits', categorie: 'petit_materiel_avicole', quantite: 100, unite: 'unités', prix_unitaire: 800 },
  { designation: 'Papier', categorie: 'administratif', quantite: 50, unite: 'unités', prix_unitaire: 700 },
  { designation: 'Abreuvoir bovins', categorie: 'materiel_bovins', quantite: 5, unite: 'unités', prix_unitaire: 5000 },
  { designation: '3000 poussins pondeuses', categorie: 'cheptel_pondeuses', quantite: 3000, unite: 'sujets', prix_unitaire: 900 },
  { designation: 'Stock de matières et produits de démarrage', categorie: 'stock_depart', quantite: 1, unite: 'forfait', prix_unitaire: 17260000 },
  { designation: 'Trésorerie de départ', categorie: 'tresorerie_depart', quantite: 1, unite: 'forfait', prix_unitaire: 4260000 },
];

export const HORIZON_FARM_MONTHLY_COSTS = [
  { designation: 'Vaccins / prophylaxie', categorie: 'sante', montant_mensuel: 40000 },
  { designation: 'Aliments pondeuses', categorie: 'alimentation_pondeuses', montant_mensuel: 3240000 },
  { designation: 'Aliments chair', categorie: 'alimentation_chair', montant_mensuel: 1620000 },
  { designation: 'Aliments bœufs', categorie: 'alimentation_bovins', montant_mensuel: 200000 },
  { designation: 'Emballages œufs 30', categorie: 'emballages_oeufs', montant_mensuel: 56000 },
  { designation: 'Achat bœufs', categorie: 'achat_bovins', montant_mensuel: 1250000 },
  { designation: 'Cartons poussins chair', categorie: 'poussins_chair', montant_mensuel: 1024000 },
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

export const HORIZON_FARM_OPERATIONAL_CYCLES = {
  pondeuses: {
    objectif: 'Œufs toute l’année',
    demarrage: 3000,
    prix_unitaire_poussin: 900,
    investissement_pondeuses: 2700000,
    principe: 'Démarrer avec 3 000 pondeuses. La deuxième bande n’est pas figée : elle sera décidée selon le taux de ponte réel, la demande clients et le risque de rupture d’œufs.',
    objectif_ca_annuel: 36630000,
    quantite_annuelle_tablettes: 16650,
    prix_tablette: 2200,
  },
  chair: {
    objectif: 'Installer progressivement un roulement de bandes de 500',
    demarrage_prudent: 500,
    cycle_jours: 40,
    cadence_apres_demarrage_jours: 15,
    sequence: ['Acheter 500 poussins', 'Attendre environ 40 jours', 'Écouler la bande', 'Racheter 500 poussins', '15 jours après, ajouter 500 autres poussins', 'Maintenir le roulement'],
    cartons_par_mois: 32,
    poussins_par_carton: 50,
    poussins_mois: 1600,
    prix_carton: 32000,
    cout_poussins_mensuel: 1024000,
    cout_poussins_annuel: 12288000,
    objectif_ca_annuel: 47520000,
    quantite_annuelle: 19008,
    prix_unitaire: 2500,
  },
  bovins: {
    objectif: 'Pipeline d’embouche de 5 bovins par mois',
    demarrage_m1: 5,
    achat_m2: 5,
    achat_m3: 5,
    cycle_jours: 90,
    sequence: ['M1 : acheter 5 bovins', 'M2 : acheter 5 bovins', 'M3 : acheter 5 bovins', 'M4 : vendre les bovins achetés en M1 et racheter 5', 'M5 : vendre les bovins achetés en M2 et racheter 5', 'M6 : vendre les bovins achetés en M3 et racheter 5', 'Ensuite : vendre et racheter 5 bovins chaque mois'],
    achat_mensuel_apres_pipeline: 5,
    vente_mensuelle_apres_pipeline: 5,
    prix_achat_unitaire: 300000,
    prix_vente_unitaire: 700000,
    cout_achat_annuel: 15000000,
    objectif_ca_annuel: 35000000,
    quantite_annuelle: 50,
  },
};

const monthlyRevenueTargets = [215000, 2730000, 6215000, 6230000, 9705000, 12690000, 13995000, 14010000, 13995000, 14010000, 13995000, 14030000];
const monthlyCostTarget = HORIZON_FARM_MONTHLY_COSTS.reduce((sum, row) => sum + Number(row.montant_mensuel || 0), 0);
const annualVariableCosts = HORIZON_FARM_MONTHLY_COSTS.filter((row) => ['sante', 'alimentation_pondeuses', 'alimentation_chair', 'alimentation_bovins', 'emballages_oeufs', 'achat_bovins', 'poussins_chair', 'gaz', 'litiere'].includes(row.categorie)).reduce((sum, row) => sum + Number(row.montant_mensuel || 0) * 12, 0);

export const HORIZON_FARM_REVENUE_PROJECTIONS = monthlyRevenueTargets.map((ca, index) => ({
  mois_index: index + 1,
  ca_estime: ca,
  charges_estimees: monthlyCostTarget,
  notes: index === 0
    ? 'Mois de démarrage : fumier, trésorerie et préparation des cycles.'
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
    source_document: 'Plan-financier-previsionnel HORIZON FARM(4).xlsx',
    activite: 'ferme_mixte',
    description: 'Business plan Horizon Farm issu du fichier financier officiel : besoins de démarrage 26 064 000 FCFA, financement 26 064 000 FCFA, objectif CA année 1 de 121 820 000 FCFA. Hypothèses validées : 3 000 pondeuses au démarrage, chair en bandes de 500 avec vente à J+40 puis roulement tous les 15 jours, bovins en pipeline M1/M2/M3 puis M4 vend M1, M5 vend M2, M6 vend M3.',
    besoin_demarrage_total: 26064000,
    financement_total: 26064000,
    tresorerie_depart: 4260000,
    objectif_ca_annuel: 121820000,
    charges_variables_annuelles: annualVariableCosts,
    charges_fixes_annuelles: 6000000,
    salaires_remuneration_annuels: 11040000,
    hypotheses_cycles: HORIZON_FARM_OPERATIONAL_CYCLES,
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
