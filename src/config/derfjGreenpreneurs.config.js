/** Référence DER/FJ Greenpreneurs 2026 — ne remplace pas le BP officiel existant. */
export const DERFJ_GREENPRENEURS_PROFILE = {
  program: 'DER/FJ Greenpreneurs',
  projectName: 'HORIZON FARM',
  ownerName: 'Penda Thiaw',
  location: 'Thiès',
  projectStatus: 'phase_lancement',
  totalEstimatedCost: 40000000,
  personalContribution: 10000000,
  requestedFunding: 30000000,
  sectors: ['elevage', 'agroecologie', 'economie_circulaire', 'innovation_agricole'],
  targetProduction: {
    layers: 4000,
    broilersEvery15Days: 500,
    bovinsPerMonth: 5,
  },
  criteria: [
    { id: 'impact_environnemental', label: 'Impact environnemental mesurable', maxScore: 25 },
    { id: 'innovation', label: 'Innovation pertinente', maxScore: 25 },
    { id: 'viabilite', label: 'Viabilité économique et sociale', maxScore: 25 },
    { id: 'impact_social', label: 'Impact social', maxScore: 15 },
    { id: 'dossier', label: 'Préparation du dossier', maxScore: 10 },
  ],
};

/** Seuils score global DER/FJ */
export const GREENPRENEURS_STATUS_THRESHOLDS = {
  pret_dossier: 75,
  pret_renforcer: 55,
};

/** Seuils phases valorisation Tallow & Go / BOVINIA */
export const VALORISATION_READINESS_THRESHOLDS = {
  non_pret: 39,
  a_preparer: 59,
  pilote_possible: 74,
};

/** Canal vente fumier/fientes — plateforme Orgaloop (conjoint). */
export const ORGALOOP_EFFLUENT_CHANNEL = {
  platformName: 'Orgaloop',
  strategy: 'hybride_surplus_orgaloop',
  strategyLabel: 'Priorité fertilisation cultures Horizon Farm — surplus vendu sur Orgaloop',
  internalFertilizationPriority: true,
  saleChannelTags: ['orgaloop', 'plateforme conjoint', 'marketplace orgaloop'],
};

/** Types business_events recommandés pour l'économie circulaire */
export const CIRCULAR_BUSINESS_EVENT_TYPES = [
  'effluent_produit',
  'effluent_stocke',
  'effluent_utilise_culture',
  'effluent_vendu_orgaloop',
  'fumier_collecte',
  'compost_produit',
  'parcelle_fertilisee',
  'engrais_chimique_evite',
  'coproduit_bovin_collecte',
  'suif_collecte',
  'os_collectes',
  'coproduit_transformation_test',
];

/** Catégories stock recommandées */
export const CIRCULAR_STOCK_CATEGORIES = [
  'effluent',
  'fertilisant_naturel',
  'coproduit_bovin',
  'suif',
  'os',
  'transformation_test',
];

/** Estimations mensuelles (hypothèse BP DER/FJ) — kg */
export const CIRCULAR_SIMULATION_MONTHLY_KG = {
  fientes_pondeuses: 48000,
  litiere_chair: 2000,
  fumier_bovin: 750,
  suif_par_bovin: 12,
  os_par_bovin: 18,
};

/** Options stock UI — catégories circulaires / coproduits */
export const CIRCULAR_STOCK_CATEGORY_OPTIONS = [
  { value: 'effluent', label: 'Effluent (fientes / litière)' },
  { value: 'fertilisant_naturel', label: 'Fertilisant naturel / compost' },
  { value: 'fumier', label: 'Fumier' },
  { value: 'coproduit_bovin', label: 'Coproduit bovin (générique)' },
  { value: 'suif', label: 'Suif brut' },
  { value: 'os', label: 'Os bovins' },
  { value: 'transformation_test', label: 'Intrants transformation (test)' },
];

/** Si true, crée aussi des lignes stock suif/os (déconseillé avant phase 2 — risque péremption). */
export const COPRODUCT_AUTO_STOCK_ENABLED = false;

/** Jours conseillés avant transformation du suif brut (alerte métier). */
export const SUIF_RAW_MAX_STORAGE_DAYS = 14;
