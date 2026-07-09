export const HORIZON_MISSION = [];

export const MODULE_TARGET_TABS = {
  dashboard: ['Carnet Horizon'],
  assistant_erp: ['Hey Horizon'],
  centre_ia: ['Urgences et risques', 'Croissance et opportunites', 'Saisons et marches'],
  agri_feeds: ['Tableau de bord', 'Reference Phase 1', 'Matieres et fournisseurs', 'Formulations', 'Production', 'Tests et comparaison', 'Commercial', 'Qualite et reporting'],
  objectifs_croissance: ['Suivi du Business Plan'],
  elevage: ['Lots et bandes'],
  commercial: ['Ventes'],
  achats_stock: ['Inventaire'],
  finance_pilotage: ['Resume'],
  activite_suivi: ['Cockpit et decisions'],
  documents_rapports: ['Centre de controle'],
  rh: ['Cockpit RH et Maintenance'],
  gestion_systeme: ['Vue admin'],
  smartfarm: ['Objets connectes'],
  sync_activity: ['Verifications'],
  cultures: ['Parcelles et campagnes'],
};

export const INTERCONNECTIONS = {
  agri_feeds_reference: ['agri_feeds', 'elevage', 'achats_stock', 'finance_pilotage', 'centre_ia'],
  agri_feeds_production: ['agri_feeds', 'achats_stock', 'elevage', 'finance_pilotage', 'activite_suivi', 'centre_ia'],
  agri_feeds_trial: ['agri_feeds', 'elevage', 'objectifs_croissance', 'centre_ia', 'activite_suivi'],
  agri_feeds_sale: ['agri_feeds', 'commercial', 'finance_pilotage', 'achats_stock', 'centre_ia'],
  future_extension_decision: ['centre_ia', 'agri_feeds', 'elevage', 'achats_stock', 'finance_pilotage', 'documents_rapports'],
};

export const IA_ENGINES = [];

export const DEV_RULES = {
  forbidden: [],
  required: [],
};

export const MODULE_AUDIT_ORDER = [
  'dashboard', 'assistant_erp', 'centre_ia', 'agri_feeds', 'objectifs_croissance', 'elevage', 'cultures', 'commercial',
  'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports', 'rh', 'smartfarm', 'gestion_systeme',
];
