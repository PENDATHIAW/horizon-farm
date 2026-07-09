/** Vision ERP 2026–2027 — structure cible et interconnexions. Source de vérité pour audits module par module. */

export const HORIZON_MISSION = [
  'assistant de gestion intelligent',
  'contrôleur interne',
  'analyste métier',
  'auditeur permanent',
  'conseiller stratégique',
  'préparateur de dossiers financeurs',
  'copilote d\'exploitation',
];

export const MODULE_TARGET_TABS = {
  dashboard: ['Carnet Horizon'],
  assistant_erp: ['Hey Horizon'],
  centre_ia: ['Urgences & risques', 'Croissance & opportunités', 'Saisons & marchés'],
  agri_feeds: [
    'Tableau de bord',
    'Référence Phase 1',
    'Matières & fournisseurs',
    'Formulations',
    'Production',
    'Tests & comparaison',
    'Commercial',
    'Qualité & reporting',
  ],
  agri_feeds_bovinia: ['Pilotage BOVINIA', 'Gamme', 'Traçabilité', 'Roadmap', 'Conformité'],
  objectifs_croissance: ['Suivi du Business Plan', 'Efficacité Technique & Zootechnique', 'Simulateur Sandbox', 'Sécurisation des Flux'],
  elevage: ['Lots & bandes', 'Cycles & Reproduction', 'Santé', 'Transformation'],
  commercial: ['Ventes', 'Opportunités', 'Clients & créances', 'Livraisons', 'Abonnements', 'Pilotage'],
  achats_stock: ['Inventaire', 'Réceptions & achats', 'Fournisseurs & dettes'],
  finance_pilotage: ['Résumé', 'Trésorerie', 'Créances & dettes', 'Pilotage', 'Graphiques'],
  activite_suivi: ['Cockpit & décisions', 'À traiter maintenant', 'Registre & traçabilité', 'Performance & analytique'],
  documents_rapports: ['Centre de contrôle', 'Gestionnaire & OCR', 'Rapprochement & preuves', 'Rapports & exports'],
  rh: ['Cockpit RH & Maintenance', 'Personnel & Paie', 'Parc Matériel & Maintenance', 'Registres & Analyses'],
  gestion_systeme: ['Vue admin', 'Utilisateurs', 'Fermes', 'Paramètres', 'Sécurité', 'Sauvegardes', 'Réinitialisation', 'Audit'],
  smartfarm: ['Objets connectés', 'Flux temps réel', 'Automatisation'],
  sync_activity: ['Vérifications', 'Connexion & envoi', 'Journal d\'activité'],
  cultures: [
    'Parcelles & campagnes',
    'Récoltes',
    'Économie circulaire',
  ],
};

export const INTERCONNECTIONS = {
  vente: ['commercial', 'finance_pilotage', 'documents_rapports', 'activite_suivi', 'objectifs_croissance', 'centre_ia'],
  creance_client: ['commercial', 'finance_pilotage', 'activite_suivi', 'documents_rapports', 'centre_ia'],
  opportunite_commerciale: ['commercial', 'objectifs_croissance', 'centre_ia', 'activite_suivi'],
  achat: ['achats_stock', 'finance_pilotage', 'documents_rapports', 'activite_suivi', 'objectifs_croissance', 'centre_ia'],
  stock_rupture: ['achats_stock', 'elevage', 'commercial', 'finance_pilotage', 'activite_suivi', 'centre_ia'],
  mortalite: ['elevage', 'finance_pilotage', 'objectifs_croissance', 'activite_suivi', 'centre_ia'],
  sante_animale: ['elevage', 'achats_stock', 'finance_pilotage', 'activite_suivi', 'centre_ia'],
  cycle_elevage: ['elevage', 'achats_stock', 'commercial', 'finance_pilotage', 'objectifs_croissance', 'centre_ia'],
  ponte: ['elevage', 'achats_stock', 'commercial', 'objectifs_croissance', 'centre_ia'],
  recolte_culture: ['cultures', 'achats_stock', 'commercial', 'finance_pilotage', 'activite_suivi', 'centre_ia'],
  transformation_culture: ['cultures', 'achats_stock', 'finance_pilotage', 'commercial', 'centre_ia'],
  tresorerie: ['finance_pilotage', 'commercial', 'achats_stock', 'objectifs_croissance', 'centre_ia'],
  dossier_financeur: ['objectifs_croissance', 'finance_pilotage', 'documents_rapports', 'investisseurs_forums', 'centre_ia'],
  tache_alerte: ['activite_suivi', 'centre_ia', 'assistant_erp'],
  donnees_iot: ['smartfarm', 'elevage', 'achats_stock', 'centre_ia', 'activite_suivi'],
  agri_feeds_reference: ['agri_feeds', 'elevage', 'achats_stock', 'finance_pilotage', 'centre_ia'],
  agri_feeds_production: ['agri_feeds', 'achats_stock', 'elevage', 'finance_pilotage', 'activite_suivi', 'centre_ia'],
  agri_feeds_trial: ['agri_feeds', 'elevage', 'objectifs_croissance', 'centre_ia', 'activite_suivi'],
  agri_feeds_sale: ['agri_feeds', 'commercial', 'finance_pilotage', 'achats_stock', 'centre_ia'],
  bovinia_traceability: ['agri_feeds_bovinia', 'elevage', 'achats_stock', 'documents_rapports', 'centre_ia'],
  bovinia_sales: ['agri_feeds_bovinia', 'commercial', 'finance_pilotage', 'documents_rapports', 'centre_ia'],
};

export const IA_ENGINES = [
  'audit_erp', 'coherence', 'risques', 'rentabilite', 'predictive', 'recommandations', 'financeur', 'taches_auto', 'surveillance_ux',
];

export const DEV_RULES = {
  forbidden: ['boutons_decoratifs', 'textes_techniques_visibles', 'corrections_dom', 'mutation_observer_ui', 'composants_recursifs', 'duplication_fonctionnelle'],
  required: ['actions_metier_reelles', 'graphiques_utiles', 'fiches_detaillees', 'audit_automatique', 'code_modulaire', 'ia_explicable'],
};

/** Ordre d'audit / correction module par module. */
export const MODULE_AUDIT_ORDER = [
  'dashboard', 'assistant_erp', 'centre_ia', 'agri_feeds', 'agri_feeds_bovinia', 'objectifs_croissance', 'elevage', 'cultures', 'commercial',
  'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports', 'rh', 'smartfarm', 'gestion_systeme',
];
