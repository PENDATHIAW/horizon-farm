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
  { designation: 'Effectif poules pondeuses & stock de matières et produits', categorie: 'cheptel_stock_pondeuses', quantite: 1, unite: 'forfait', prix_unitaire: 19960000 },
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

export const HORIZON_FARM_OPERATIONAL_CYCLES = {
  pondeuses: {
    objectif: 'Œufs toute l’année',
    principe: 'La bande pondeuse est dimensionnée par le Centre décisionnel selon l’objectif œufs, le taux de ponte réel et le besoin de continuité annuelle.',
    objectif_ca_annuel: 36630000,
    quantite_annuelle_tablettes: 16650,
    prix_tablette: 2200,
  },
  chair: {
    objectif: 'Atteindre progressivement un rythme de ventes régulier',
    demarrage_prudent: 500,
    cible_operationnelle: '500 poulets vendables tous les 15 jours lorsque le pipeline est stabilisé',
    objectif_ca_annuel: 47520000,
    quantite_annuelle: 19008,
    prix_unitaire: 2500,
  },
  bovins: {
    objectif: 'Embouche progressive',
    demarrage_prudent: 5,
    objectif_ca_annuel: 35000000,
    quantite_annuelle: 50,
    prix_unitaire: 700000,
  },
};

const monthlyRevenueTargets = [215000, 2730000, 6215000, 6230000, 9705000, 12690000, 13995000, 14010000, 13995000, 14010000, 13995000, 14030000];
const monthlyCostTarget = HORIZON_FARM_MONTHLY_COSTS.reduce((sum, row) => sum + Number(row.montant_mensuel || 0), 0);

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
    description: 'Business plan Horizon Farm issu du fichier financier officiel : besoins de démarrage 26 064 000 FCFA, financement 26 064 000 FCFA, objectif CA année 1 de 121 820 000 FCFA. Les cycles opérationnels sont pilotés séparément : chair avec démarrage prudent à 500, bovins avec démarrage à 5, et pondeuses dimensionnées selon le taux de ponte réel pour garantir des œufs toute l’année.',
    besoin_demarrage_total: 26064000,
    financement_total: 26064000,
    tresorerie_depart: 4260000,
    objectif_ca_annuel: 121820000,
    charges_variables_annuelles: 80512000,
    charges_fixes_annuelles: 6000000,
    salaires_remuneration_annuels: 11040000,
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
