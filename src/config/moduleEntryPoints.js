/**
 * Source unique des entry points modules — App.jsx charge uniquement depuis ici.
 * Ne pas référencer les anciennes versions (Dashboard.jsx, ImpactBusinessStrategicV*, etc.).
 */
export const MODULE_ENTRY_POINTS = {
  dashboard: () => import('../modules/DashboardV2.jsx'),
  assistant_erp: () => import('../modules/AssistantERPV2.jsx'),
  centre_ia: () => import('../modules/CentreIA.jsx'),
  objectifs_croissance: () => import('../modules/ObjectifsCroissanceV2.jsx'),
  elevage: () => import('../modules/ElevageModule.jsx'),
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
  alertes: () => import('../modules/AlertesCenterV2.jsx'),
  cultures: () => import('../modules/CulturesV5.jsx'),
  smartfarm: () => import('../modules/SmartFarm.jsx'),
  ventes: () => import('../modules/VentesV3.jsx'),
  documents: () => import('../modules/DocumentsV2.jsx'),
  taches: () => import('../modules/TachesV3.jsx'),
  rh: () => import('../modules/RHV2.jsx'),
  rapports: () => import('../modules/RapportsV2.jsx'),
  equipements: () => import('../modules/EquipementsV2.jsx'),
  sync: () => import('../modules/SyncActivityCenterV2.jsx'),
  sync_activity: () => import('../modules/SyncActivityCenterV2.jsx'),
  audit_logs: () => import('../modules/SyncActivityCenterV2.jsx'),
  gestion_systeme: () => import('../modules/GestionSystemeV2.jsx'),
};

/** Routes historiques → module actif (navigation + chargement). */
export const DEPRECATED_MODULE_ALIASES = {
  impact_business: 'investisseurs_forums',
};

export function resolveActiveModuleId(moduleId = '') {
  return DEPRECATED_MODULE_ALIASES[moduleId] || moduleId;
}
