const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

export const HORIZON_FARM_BP_ID = 'BP-HORIZON-FARM';
export const HORIZON_FARM_BP_NAME = 'Business Plan Horizon Farm';

export const HORIZON_FARM_INVESTMENT_LINES = [
  { designation: 'Achat poussins pondeuses - 4 000 sujets', categorie: 'cheptel_pondeuses', quantite: 4000, unite: 'sujets', prix_unitaire: 900 },
  { designation: 'Achat poussins chair - 200 sujets', categorie: 'cheptel_chair', quantite: 200, unite: 'sujets', prix_unitaire: 350 },
  { designation: 'Achat bovins - 10 têtes', categorie: 'cheptel_bovins', quantite: 10, unite: 'têtes', prix_unitaire: 0 },
  { designation: 'Achat ovins / moutons - 5 têtes', categorie: 'cheptel_ovins', quantite: 5, unite: 'têtes', prix_unitaire: 0 },
  { designation: 'Achat caprins / chèvres - 5 têtes', categorie: 'cheptel_caprins', quantite: 5, unite: 'têtes', prix_unitaire: 0 },
  { designation: 'Aliment poulette démarrage - 480 sacs', categorie: 'alimentation_pondeuses', quantite: 480, unite: 'sacs 50kg', prix_unitaire: 16150 },
  { designation: 'Aliment pondeuse pré-production - 240 sacs', categorie: 'alimentation_pondeuses', quantite: 240, unite: 'sacs 50kg', prix_unitaire: 17500 },
  { designation: 'Abreuvoirs - capacité 4 000 pondeuses', categorie: 'equipement', quantite: 60, unite: 'unités', prix_unitaire: 14500 },
  { designation: 'Mangeoires - capacité 4 000 pondeuses', categorie: 'equipement', quantite: 60, unite: 'unités', prix_unitaire: 2700 },
  { designation: 'Réservoirs d’eau 500 L', categorie: 'infrastructure_eau', quantite: 2, unite: 'unités', prix_unitaire: 50000 },
  { designation: 'Main d’œuvre installation système', categorie: 'installation', quantite: 1, unite: 'forfait', prix_unitaire: 100000 },
  { designation: 'Lunettes pondeuses + réserve', categorie: 'equipement_pondeuses', quantite: 4200, unite: 'unités', prix_unitaire: 50 },
  { designation: 'Pose lunettes pondeuses', categorie: 'main_oeuvre', quantite: 4000, unite: 'sujets', prix_unitaire: 50 },
  { designation: 'Paille de riz pour poulailler', categorie: 'litiere', quantite: 40, unite: 'sacs', prix_unitaire: 2000 },
  { designation: 'Box poulailler / extension 4 000 pondeuses', categorie: 'infrastructure', quantite: 2, unite: 'box', prix_unitaire: 2000000 },
  { designation: 'Vaccin Corymune K7 pondeuses', categorie: 'sante', quantite: 4000, unite: 'doses', prix_unitaire: 70 },
  { designation: 'Pondoirs bois 15 cases', categorie: 'equipement_pondeuses', quantite: 70, unite: 'unités', prix_unitaire: 30000 },
  { designation: 'Kit démarrage poulets de chair - chauffage/litière/soins', categorie: 'chair_demarrage', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Aliment poulets de chair - cycle 35 à 45 jours', categorie: 'alimentation_chair', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Aliment bovins / ovins / caprins - démarrage', categorie: 'alimentation_ruminants', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Santé bovins / ovins / caprins - démarrage', categorie: 'sante_ruminants', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Transport et installation', categorie: 'logistique', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Fonds de roulement de démarrage', categorie: 'fonds_roulement', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Démarches administratives', categorie: 'administratif', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Imprévus de démarrage', categorie: 'imprevus', quantite: 1, unite: 'forfait', prix_unitaire: 400000 },
];

export const HORIZON_FARM_MONTHLY_COSTS = [
  { designation: 'Aliment pondeuses - 4 000 sujets', categorie: 'alimentation_pondeuses', montant_mensuel: 4200000 },
  { designation: 'Aliment poulets de chair', categorie: 'alimentation_chair', montant_mensuel: 0 },
  { designation: 'Aliment bovins / ovins / caprins', categorie: 'alimentation_ruminants', montant_mensuel: 0 },
  { designation: 'Salaires / main d’œuvre', categorie: 'salaires', montant_mensuel: 120000 },
  { designation: 'Énergie / eau / nettoyage', categorie: 'energie', montant_mensuel: 100000 },
  { designation: 'Santé / vaccins / vétérinaire', categorie: 'sante', montant_mensuel: 0 },
  { designation: 'Litière / biosécurité', categorie: 'biosecurite', montant_mensuel: 0 },
  { designation: 'Transport / commercialisation', categorie: 'logistique', montant_mensuel: 0 },
  { designation: 'Emballages / plateaux œufs / consommables', categorie: 'consommables', montant_mensuel: 0 },
  { designation: 'Maintenance', categorie: 'maintenance', montant_mensuel: 0 },
  { designation: 'Administration', categorie: 'administratif', montant_mensuel: 0 },
  { designation: 'Remboursement financement', categorie: 'financement', montant_mensuel: 0 },
  { designation: 'Imprévus exploitation', categorie: 'imprevus', montant_mensuel: 400000 },
];

export const HORIZON_FARM_REVENUE_PROJECTIONS = Array.from({ length: 31 }).map((_, index) => {
  const month = index + 1;
  let ca = 0;
  if (month >= 4 && month <= 22) ca = 5332000;
  if (month >= 23 && month <= 27) ca = 10664000;
  if (month >= 28) ca = 5332000;
  return {
    mois_index: month,
    ca_estime: ca,
    charges_estimees: month >= 4 ? 4820000 : 0,
    notes: month < 4
      ? 'Phase démarrage / soins avant ponte commerciale.'
      : month >= 23 && month <= 27
        ? 'Hypothèse pic de production avec capacité renforcée.'
        : 'Projection à ajuster selon ponte, ventes chair, animaux et cultures.',
  };
});

export function buildHorizonFarmBusinessPlan() {
  return {
    id: HORIZON_FARM_BP_ID,
    nom: HORIZON_FARM_BP_NAME,
    title: HORIZON_FARM_BP_NAME,
    statut: 'brouillon_actif',
    source_module: 'investissements',
    source_document: 'Business Plan Pondeuse_table intégrée.docx',
    activite: 'ferme_mixte',
    description: 'Business plan Horizon Farm adapté : 4 000 pondeuses à 900 FCFA, 200 poulets de chair, 10 bovins, 5 ovins et 5 caprins. Les lignes sont modifiables, supprimables et confirmables dans Investissements.',
    duree_cycle_mois: 31,
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
