/**
 * Source unique des entry points modules — App.jsx charge uniquement depuis ici.
 * Ne pas référencer les anciennes versions (Dashboard.jsx, ImpactBusinessStrategicV*, etc.).
 *
 * CANONICAL_MODULE_FILES — fichier réellement chargé (dernière version connue par famille).
 */
export const CANONICAL_MODULE_FILES = {
  dashboard: 'dashboard/AccueilRefinedEntry.jsx',
  assistant_erp: 'AssistantERPV2.jsx',
  centre_ia: 'CentreIA.jsx',
  objectifs_croissance: 'ObjectifsCroissanceV2.jsx',
  elevage: 'ElevageModule.jsx',
  agri_feeds: 'AgriFeedsModule.jsx',
  commercial: 'CommercialModule.jsx',
  achats_stock: 'AchatsStockModule.jsx',
  finance_pilotage: 'FinancePilotageModule.jsx',
  activite_suivi: 'ActiviteSuiviModule.jsx',
  documents_rapports: 'DocumentsRapportsModule.jsx',
  animaux: 'AnimauxV2.jsx',
  avicole: 'AvicoleV10.jsx',
  sante: 'SanteV8.jsx',
  finances: 'FinancesV12.jsx',
  comptabilite: 'ComptabiliteV7.jsx',
  investissements: 'InvestissementsV9.jsx',
  impact_business: 'InvestisseursForumsModule.jsx',
  investisseurs_forums: 'InvestisseursForumsModule.jsx',
  stock: 'StocksV5.jsx',
  clients: 'ClientsReadable.jsx',
  fournisseurs: 'FournisseursReadable.jsx',
  tracabilite: 'TracabiliteV2.jsx',
  alertes: 'AlertesCenterV3.jsx',
  cultures: 'CulturesRecoveredModule.jsx',
  smartfarm: 'SmartFarm.jsx',
  ventes: 'VentesV5.jsx',
  documents: 'DocumentsV2.jsx',
  taches: 'TachesV3.jsx',
  rh: 'RHV2.jsx',
  rapports: 'RapportsV2.jsx',
  equipements: 'EquipementsV3.jsx',
  sync: 'SyncActivityCenter.jsx',
  sync_activity: 'SyncActivityCenter.jsx',
  audit_logs: 'SyncActivityCenter.jsx',
  gestion_systeme: 'GestionSystemeV2.jsx',
};

/** Fichiers legacy — ne doivent jamais apparaître comme entry point App. */
export const FORBIDDEN_ENTRY_FILES = [
  'Dashboard.jsx',
  'ImpactBusiness.jsx',
  'ImpactBusinessShell.jsx',
  'GestionSysteme.jsx',
  'SyncActivityCenterV2.jsx',
  'VentesV2.jsx',
  'VentesV3.jsx',
  'AlertesCenterV2.jsx',
  'AlertesCenter.jsx',
  'EquipementsV2.jsx',
  'CulturesV5.jsx',
];

export const MODULE_ENTRY_POINTS = {
  dashboard: () => import('../modules/dashboard/AccueilRefinedEntry.jsx'),
  assistant_erp: () => import('../modules/AssistantERPV2.jsx'),
  centre_ia: () => import('../modules/CentreIA.jsx'),
  objectifs_croissance: () => import('../modules/ObjectifsCroissanceV2.jsx'),
  elevage: () => import('../modules/ElevageModule.jsx'),
  agri_feeds: () => import('../modules/AgriFeedsModule.jsx'),
  commercial: () => import('../modules/CommercialModule.jsx'),
  achats_stock: () => import('../modules/AchatsStockModule.jsx'),
  finance_pilotage: () => import('../modules/FinancePilotageModule.jsx'),
  activite_suivi: () => import('../modules/ActiviteSuiviModule.jsx'),
  documents_rapports: () => import('../modules/DocumentsRapportsModule.jsx'),
  animaux: () => import('../modules/AnimauxV2.jsx'),
  avicole: () => import('../modules/AvicoleV10.jsx'),
  sante: () => import('../modules/SanteV8.jsx'),
  finances: () => import('../modules/FinancesV12.jsx'),
  comptabilite: () => import('../modules/ComptabiliteV7.jsx'),
  investissements: () => import('../modules/InvestissementsV9.jsx'),
  /** @deprecated alias — redirigé vers investisseurs_forums */
  impact_business: () => import('../modules/InvestisseursForumsModule.jsx'),
  investisseurs_forums: () => import('../modules/InvestisseursForumsModule.jsx'),
  stock: () => import('../modules/StocksV5.jsx'),
  clients: () => import('../modules/ClientsReadable.jsx'),
  fournisseurs: () => import('../modules/FournisseursReadable.jsx'),
  tracabilite: () => import('../modules/TracabiliteV2.jsx'),
  alertes: () => import('../modules/AlertesCenterV3.jsx'),
  cultures: () => import('../modules/CulturesRecoveredModule.jsx'),
  smartfarm: () => import('../modules/SmartFarm.jsx'),
  ventes: () => import('../modules/VentesV5.jsx'),
  documents: () => import('../modules/DocumentsV2.jsx'),
  taches: () => import('../modules/TachesV3.jsx'),
  rh: () => import('../modules/RHV2.jsx'),
  rapports: () => import('../modules/RapportsV2.jsx'),
  equipements: () => import('../modules/EquipementsV3.jsx'),
  sync: () => import('../modules/SyncActivityCenter.jsx'),
  sync_activity: () => import('../modules/SyncActivityCenter.jsx'),
  audit_logs: () => import('../modules/SyncActivityCenter.jsx'),
  gestion_systeme: () => import('../modules/GestionSystemeV2.jsx'),
};

/** Routes historiques → module actif (navigation + chargement). */
export const DEPRECATED_MODULE_ALIASES = {
  impact_business: 'investisseurs_forums',
};

export function resolveActiveModuleId(moduleId = '') {
  return DEPRECATED_MODULE_ALIASES[moduleId] || moduleId;
}

export function entryPointSource(moduleId = '') {
  const loader = MODULE_ENTRY_POINTS[moduleId];
  if (!loader) return '';
  const fromLoader = String(loader).match(/import\(['"](.+?)['"]\)/)?.[1];
  if (fromLoader) return fromLoader;
  const canonical = CANONICAL_MODULE_FILES[moduleId];
  return canonical ? `../modules/${canonical}` : '';
}
