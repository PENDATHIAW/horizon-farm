import {
  BUSINESS_EVENT_INTERCONNECTIONS,
  BUSINESS_EVENT_WORKFLOWS,
  MODULE_INTERCONNECTIONS_LIST,
} from './businessInterconnections.config.js';

/** Vision ERP Horizon Farm — source de vérité métier, chiffres, interconnexions et règles de cohérence. */
export const HORIZON_MISSION = [
  'piloter une ferme intégrée à partir des opérations réelles du terrain',
  'réduire les doubles saisies grâce aux événements métier',
  'relier production, stock, commercial, finance, traçabilité et reporting',
  'calculer des chiffres cohérents depuis une source officielle',
  'expliquer les écarts entre prévisionnel et réel',
  'documenter les décisions, les actions et les preuves financeur',
  'préparer la croissance uniquement quand les données le justifient',
];

export const MODULE_TARGET_TABS = {
  dashboard: ['Carnet Horizon', 'Priorités du jour', 'Indicateurs ferme', 'Vue financeur rapide'],
  assistant_erp: ['Hey Horizon', 'Questions métier', 'Aide à la décision', 'Recherche dans les données'],
  centre_ia: ['Urgences & risques', 'Écarts & cohérence', 'Actions prioritaires', 'Croissance & opportunités'],
  agri_feeds: ['Tableau de bord', 'Référence Phase 1', 'Matières & fournisseurs', 'Formulations', 'Production', 'Tests & comparaison', 'Commercial', 'Qualité & reporting'],
  objectifs_croissance: ['Suivi du Business Plan', 'Prévisionnel vs réel', 'Simulations', 'Capacité de remboursement'],
  elevage: ['Lots & bandes', 'Pondeuses', 'Embouche bovine', 'Santé & biosécurité', 'Alimentation', 'Performances'],
  cultures: ['Parcelles & campagnes', 'Irrigation', 'Récoltes', 'Économie circulaire', 'Marge parcelle'],
  commercial: ['Ventes', 'Clients & créances', 'Livraisons', 'Factures', 'Marge commerciale'],
  achats_stock: ['Inventaire', 'Réceptions & achats', 'Fournisseurs & dettes', 'Mouvements stock', 'Matières organiques'],
  finance_pilotage: ['Résumé', 'Trésorerie', 'Créances & dettes', 'Coûts par filière', 'Financement', 'Écarts budget'],
  activite_suivi: ['Tâches du jour', 'Alertes', 'Décisions', 'Registre d’actions', 'Traçabilité opérationnelle'],
  documents_rapports: ['Documents', 'Justificatifs', 'Rapports financeur', 'Exports', 'Audit documentaire'],
  financements: ['Tableau de bord', 'Opportunités', 'Contacts', 'Dossiers & pièces', 'Fonds & justificatifs', 'Espace Financeurs'],
  rh: ['Équipe', 'Responsabilités', 'Planning', 'Temps de travail', 'Incidents'],
  equipements: ['Équipements', 'Maintenance', 'Pannes', 'Coûts', 'Disponibilité'],
  smartfarm: ['Capteurs', 'Eau', 'Énergie', 'Alertes techniques', 'Automatisation terrain'],
  sync_activity: ['Vérifications', 'Connexion & envoi', 'Journal d’activité', 'Données hors ligne'],
  gestion_systeme: ['Utilisateurs', 'Rôles', 'Fermes', 'Sécurité', 'Audit', 'Paramètres'],
};

/** Interconnexions obligatoires. Les clés événementielles viennent de businessInterconnections.config.js. */
export const INTERCONNECTIONS = {
  ...BUSINESS_EVENT_INTERCONNECTIONS,
  vente: ['commercial', 'achats_stock', 'finance_pilotage', 'clients', 'documents_rapports', 'centre_ia'],
  creance_client: ['commercial', 'finance_pilotage', 'activite_suivi', 'documents_rapports', 'centre_ia'],
  achat: ['achats_stock', 'finance_pilotage', 'fournisseurs', 'documents_rapports', 'centre_ia'],
  stock_rupture: ['achats_stock', 'elevage', 'cultures', 'commercial', 'finance_pilotage', 'centre_ia'],
  mortalite: ['elevage', 'finance_pilotage', 'activite_suivi', 'centre_ia', 'documents_rapports'],
  ponte: ['elevage', 'achats_stock', 'commercial', 'finance_pilotage', 'centre_ia'],
  recolte_culture: ['cultures', 'achats_stock', 'commercial', 'finance_pilotage', 'documents_rapports'],
  effluents: ['elevage', 'achats_stock', 'cultures', 'finance_pilotage', 'documents_rapports', 'centre_ia'],
  biosécurité: ['elevage', 'achats_stock', 'cultures', 'activite_suivi', 'finance_pilotage', 'centre_ia'],
  tresorerie: ['finance_pilotage', 'commercial', 'achats_stock', 'objectifs_croissance', 'financements', 'centre_ia'],
  dossier_financeur: ['finance_pilotage', 'documents_rapports', 'objectifs_croissance', 'financements', 'centre_ia'],
  donnees_iot: ['smartfarm', 'cultures', 'elevage', 'equipements', 'activite_suivi', 'centre_ia'],
  agri_feeds_reference: ['agri_feeds', 'elevage', 'achats_stock', 'finance_pilotage', 'centre_ia'],
  agri_feeds_production: ['agri_feeds', 'achats_stock', 'elevage', 'finance_pilotage', 'activite_suivi', 'centre_ia'],
  agri_feeds_trial: ['agri_feeds', 'elevage', 'objectifs_croissance', 'centre_ia', 'activite_suivi'],
  agri_feeds_sale: ['agri_feeds', 'commercial', 'finance_pilotage', 'achats_stock', 'centre_ia'],
  future_extension_decision: ['centre_ia', 'agri_feeds', 'elevage', 'achats_stock', 'finance_pilotage', 'documents_rapports'],
};

export const MODULE_INTERCONNECTIONS = MODULE_INTERCONNECTIONS_LIST;

export const BUSINESS_EVENT_COVERAGE = BUSINESS_EVENT_WORKFLOWS.map((event) => ({
  id: event.id,
  label: event.label,
  sourceModule: event.sourceModule,
  impactedModules: event.impactedModules,
  requiredFields: event.requiredFields,
  coherenceRules: event.coherenceRules,
}));

export const IA_ENGINES = [
  'audit_erp',
  'coherence_inter_modules',
  'risques_operationnels',
  'rentabilite_par_filiere',
  'previsionnel_vs_reel',
  'reporting_financeur',
  'controle_double_saisie',
];

export const DEV_RULES = {
  forbidden: [
    'double_saisie_sans_raison_metier',
    'double_comptage_ca_cash_finance',
    'chiffre_affiche_sans_source_officielle',
    'vente_sans_stock_ou_production_liee',
    'depense_sans_activite_ou_justificatif_si_importante',
    'alerte_sans_action_ou_statut',
    'rapport_financeur_manuel_non_relie_aux_operations',
    'bovin_vendu_encore_actif',
    'matiere_organique_suspecte_envoyee_en_culture',
  ],
  required: [
    'un_evenement_metier_declenche_plusieurs_impacts',
    'source_unique_par_chiffre',
    'marge_calculee_depuis_couts_et_ventes_sources',
    'tracabilite_de_la_vente_vers_origine_et_intrants',
    'biosécurité_collecte_sacs_fientes_fumier_litiere_et_next_step',
    'rafraichissement_cluster_apres_action_metier',
    'audit_coherence_apres_generation_rapport',
    'validation_humaine_pour_decisions_sensibles',
  ],
};

/** Ordre d’audit global : ne pas se limiter à AGRI FEEDS. */
export const MODULE_AUDIT_ORDER = [
  'dashboard',
  'assistant_erp',
  'centre_ia',
  'objectifs_croissance',
  'elevage',
  'cultures',
  'commercial',
  'achats_stock',
  'finance_pilotage',
  'activite_suivi',
  'documents_rapports',
  'financements',
  'agri_feeds',
  'rh',
  'equipements',
  'smartfarm',
  'sync_activity',
  'gestion_systeme',
];
