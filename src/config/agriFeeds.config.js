/**
 * AGRI FEEDS — configuration métier centrale (Phase 2 Horizon Farm).
 * Ne remplace pas les modules Achats / Stock / Élevage / Commercial.
 */

export const AGRI_FEEDS_MODULE = {
  id: 'agri_feeds',
  label: 'AGRI FEEDS',
  description: 'Production d’aliments animaux pilotée par la donnée.',
};

/** Modes de déploiement — progression data-driven, pas une date fixe. */
export const AGRI_FEEDS_DEPLOYMENT_MODES = Object.freeze({
  REFERENCE: {
    id: 'REFERENCE',
    label: 'Référence Phase 1',
    shortLabel: 'Référence',
    allowsProduction: false,
    allowsSales: false,
    allowsFormulas: false,
    allowsRawMaterials: false,
  },
  PILOT_INTERNAL: {
    id: 'PILOT_INTERNAL',
    label: 'Production pilote interne',
    shortLabel: 'Pilote interne',
    allowsProduction: true,
    allowsSales: false,
    allowsFormulas: true,
    allowsRawMaterials: true,
  },
  PROGRESSIVE_SALES: {
    id: 'PROGRESSIVE_SALES',
    label: 'Vente progressive',
    shortLabel: 'Vente progressive',
    allowsProduction: true,
    allowsSales: true,
    allowsFormulas: true,
    allowsRawMaterials: true,
  },
});

export const FORMULA_STATUSES = Object.freeze([
  { value: 'draft', label: 'Brouillon' },
  { value: 'internal_testing', label: 'En test interne' },
  { value: 'to_improve', label: 'À améliorer' },
  { value: 'internally_validated', label: 'Validée en interne' },
  { value: 'client_testing', label: 'Test client limité' },
  { value: 'commercializable', label: 'Commercialisable' },
  { value: 'suspended', label: 'Suspendue' },
  { value: 'abandoned', label: 'Abandonnée' },
]);

export const TARGET_SPECIES = Object.freeze([
  { value: 'broiler', label: 'Poulet de chair' },
  { value: 'layer', label: 'Pondeuse' },
  { value: 'cattle', label: 'Bovin embouche' },
  { value: 'fish_future', label: 'Poisson (futur)' },
  { value: 'other', label: 'Autre' },
]);

export const TARGET_STAGES = Object.freeze([
  { value: 'starter', label: 'Démarrage' },
  { value: 'grower', label: 'Croissance' },
  { value: 'finisher', label: 'Finition' },
  { value: 'pre_layer', label: 'Pré-ponte' },
  { value: 'layer', label: 'Ponte' },
  { value: 'fattening_start', label: 'Embouche début' },
  { value: 'fattening_finish', label: 'Embouche finition' },
]);

export const RAW_MATERIAL_CATEGORIES = Object.freeze([
  { value: 'cereal', label: 'Céréale' },
  { value: 'bran', label: 'Son / issues' },
  { value: 'oilcake', label: 'Tourteau' },
  { value: 'mineral', label: 'Minéral' },
  { value: 'vitamin', label: 'Vitamine / prémix' },
  { value: 'plant', label: 'Végétal' },
  { value: 'experimental', label: 'Expérimental' },
  { value: 'packaging', label: 'Emballage' },
  { value: 'other', label: 'Autre' },
]);

export const FEED_STOCK_CATEGORIES = Object.freeze([
  { value: 'matiere_premiere_aliment', label: 'Matière première AGRI FEEDS' },
  { value: 'aliment_agri_feeds', label: 'Aliment AGRI FEEDS (produit fini)' },
  { value: 'emballage_aliment', label: 'Emballage aliment' },
  { value: 'echantillon_temoin', label: 'Échantillon témoin' },
]);

export const FACILITY_ZONE_TYPES = Object.freeze([
  { value: 'raw_material_storage', label: 'Stockage matières premières' },
  { value: 'production_area', label: 'Zone machines / production' },
  { value: 'finished_goods_storage', label: 'Stock produits finis' },
  { value: 'quality_control', label: 'Contrôle qualité' },
  { value: 'loading_area', label: 'Aire de chargement' },
  { value: 'office_erp', label: 'Bureau ERP' },
  { value: 'future_extension', label: 'Extension future' },
]);

export const FACILITY_ZONE_STATUSES = Object.freeze([
  { value: 'planned', label: 'Prévu (Phase 1)' },
  { value: 'available', label: 'Disponible' },
  { value: 'in_use', label: 'En service' },
]);

/** Zones site à réserver dès la Phase 1 — séparées animaux / fientes / fumiers / vétérinaire. */
export const DEFAULT_PLANNED_FACILITY_ZONES = Object.freeze([
  {
    id: 'zone-mp-prevue',
    name: 'Stockage matières premières',
    zone_type: 'raw_material_storage',
    status: 'planned',
    capacity: null,
    notes: 'Séparé des animaux, fientes, fumiers et produits vétérinaires. Activation Phase 2A.',
  },
  {
    id: 'zone-prod-prevue',
    name: 'Zone machines / production',
    zone_type: 'production_area',
    status: 'planned',
    capacity: null,
    notes: 'Broyeur, mélangeur, ensachage — à activer en Phase 2A.',
  },
  {
    id: 'zone-pf-prevue',
    name: 'Stock produits finis',
    zone_type: 'finished_goods_storage',
    status: 'planned',
    capacity: null,
    notes: 'Lots AGRI FEEDS et échantillons témoins.',
  },
  {
    id: 'zone-qc-prevue',
    name: 'Contrôle qualité',
    zone_type: 'quality_control',
    status: 'planned',
    capacity: null,
    notes: 'Réception MP, contrôles avant/après production.',
  },
  {
    id: 'zone-load-prevue',
    name: 'Aire de chargement',
    zone_type: 'loading_area',
    status: 'planned',
    capacity: null,
    notes: 'Chargement clients éleveurs — Phase 2B.',
  },
  {
    id: 'zone-office-prevue',
    name: 'Bureau ERP',
    zone_type: 'office_erp',
    status: 'planned',
    capacity: null,
    notes: 'Saisie formulations, OF, traçabilité.',
  },
  {
    id: 'zone-ext-prevue',
    name: 'Extension future',
    zone_type: 'future_extension',
    status: 'planned',
    capacity: null,
    notes: 'Réserve foncière / agrandissement usine.',
  },
]);

/** Seuils readiness (score /100). */
export const AGRI_FEEDS_READINESS_THRESHOLDS = Object.freeze({
  reference_min: 0,
  pilot_internal_min: 45,
  progressive_sales_min: 75,
});

/** Seuils d’alerte par défaut (étapes suivantes). */
export const AGRI_FEEDS_ALERT_THRESHOLDS = Object.freeze({
  raw_material_stock_critical_kg: 100,
  finished_stock_critical_kg: 50,
  cost_variance_pct: 15,
  moisture_reject_above: 14,
  repurchase_delay_days: 45,
});

export const PACKAGE_SIZES = Object.freeze([
  { value: 'bulk', label: 'Vrac' },
  { value: '5kg', label: '5 kg' },
  { value: '10kg', label: '10 kg' },
  { value: '25kg', label: '25 kg' },
  { value: '50kg', label: '50 kg' },
]);

export const TRIAL_DECISIONS = Object.freeze([
  { value: 'validate', label: 'Valider' },
  { value: 'improve', label: 'Améliorer' },
  { value: 'abandon', label: 'Abandonner' },
  { value: 'retest', label: 'Retester' },
]);

export const QUALITY_STATUSES = Object.freeze([
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'under_review', label: 'En revue' },
]);

export const AGRI_FEEDS_TABS = Object.freeze([
  'Vue d’ensemble',
  'Matières & fournisseurs',
  'Formulations',
  'Production',
  'Essais & performance',
  'Qualité',
  'Commercial',
  'Coûts & décisions',
]);

export const AGRI_FEEDS_TAB_ALIASES = Object.freeze({
  dashboard: 'Vue d’ensemble',
  tableau: 'Vue d’ensemble',
  reference: 'Vue d’ensemble',
  phase1: 'Vue d’ensemble',
  benchmark: 'Vue d’ensemble',
  matieres: 'Matières & fournisseurs',
  matières: 'Matières & fournisseurs',
  fournisseurs: 'Matières & fournisseurs',
  formulations: 'Formulations',
  formules: 'Formulations',
  production: 'Production',
  of: 'Production',
  tests: 'Essais & performance',
  essais: 'Essais & performance',
  comparaison: 'Essais & performance',
  commercial: 'Commercial',
  ventes: 'Commercial',
  qualite: 'Qualité',
  qualité: 'Qualité',
  reporting: 'Qualité',
  zones: 'Qualité',
  couts: 'Coûts & décisions',
  coûts: 'Coûts & décisions',
  decisions: 'Coûts & décisions',
});
