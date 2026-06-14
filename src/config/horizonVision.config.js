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
  dashboard: ['Résumé', 'Graphiques'],
  assistant_erp: ['Hey Horizon'],
  objectifs_croissance: ['Suivi du Business Plan', 'Efficacité Technique & Zootechnique', 'Simulateur Sandbox', 'Sécurisation des Flux'],
  centre_ia: ['Urgences & risques', 'Croissance & opportunités', 'Saisons & marchés'],
  elevage: ['Lots & bandes', 'Cycles & Reproduction', 'Santé', 'Transformation'],
  commercial: ['Ventes', 'Opportunités', 'Clients & créances', 'Livraisons', 'Abonnements', 'Pilotage'],
  achats_stock: ['Inventaire', 'Réceptions & achats', 'Fournisseurs & dettes'],
  finance_pilotage: ['Résumé', 'Trésorerie', 'Créances & dettes', 'Pilotage', 'Graphiques'],
  activite_suivi: ['Cockpit & décisions', 'À traiter maintenant', 'Registre & traçabilité', 'Performance & analytique'],
  documents_rapports: ['Centre de contrôle', 'Gestionnaire & OCR', 'Rapprochement & preuves', 'Rapports & exports'],
  rh: ['Cockpit RH & Maintenance', 'Personnel & Paie', 'Parc Matériel & Maintenance', 'Registres & Analyses'],
  gestion_systeme: ['Vue admin', 'Utilisateurs', 'Fermes', 'Paramètres', 'Sécurité', 'Sauvegardes', 'Réinitialisation', 'Audit'],
  smartfarm: ['Résumé', 'Capteurs', 'Caméras', 'Annexe', 'Graphiques'],
  cultures: [
    'Parcelles & campagnes',
    'Récoltes',
    'Économie circulaire',
  ],
};

export const INTERCONNECTIONS = {
  vente: ['commercial', 'finance_pilotage', 'documents_rapports', 'activite_suivi', 'objectifs_croissance'],
  achat: ['achats_stock', 'finance_pilotage', 'documents_rapports', 'activite_suivi', 'objectifs_croissance'],
  mortalite: ['elevage', 'finance_pilotage', 'objectifs_croissance', 'activite_suivi'],
  ponte: ['elevage', 'achats_stock', 'commercial', 'objectifs_croissance'],
  recolte_culture: ['cultures', 'achats_stock', 'commercial', 'finance_pilotage', 'activite_suivi'],
  transformation_culture: ['cultures', 'achats_stock', 'finance_pilotage'],
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
  'dashboard', 'assistant_erp', 'objectifs_croissance', 'elevage', 'cultures', 'commercial',
  'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports', 'rh', 'gestion_systeme',
];
