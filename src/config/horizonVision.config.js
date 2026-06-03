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
  dashboard: ['Résumé', 'Graphiques', 'Annexe'],
  assistant_erp: ['Hey Horizon'],
  objectifs_croissance: ['Performance', 'Prévisions', 'Plans', 'Financeurs', 'Annexe', 'Graphiques'],
  centre_ia: ['À traiter', 'Risques', 'Opportunités', 'Cycles', 'Annexe', 'Graphiques'],
  elevage: ['Résumé', 'Cycles', 'Animaux', 'Avicole', 'Alimentation', 'Santé', 'Reproduction', 'Production', 'Transformation', 'Annexe', 'Graphiques'],
  commercial: ['Résumé', 'Ventes', 'Clients', 'Opportunités', 'Annexe', 'Graphiques'],
  achats_stock: ['Résumé', 'Stock', 'Achats', 'Fournisseurs', 'Mouvements', 'Annexe', 'Graphiques'],
  finance_pilotage: ['Résumé', 'Trésorerie', 'Rapprochement', 'Créances', 'Dettes', 'Investissements', 'Rentabilité', 'Annexe', 'Graphiques'],
  activite_suivi: ['Résumé', 'Alertes', 'Tâches', 'Traçabilité', 'Annexe', 'Graphiques'],
  documents_rapports: ['Résumé', 'Scanner IA', 'Bibliothèque', 'Preuves', 'Rapports', 'Exports', 'Modèles', 'Annexe', 'Graphiques'],
  rh: ['Résumé', 'Équipements', 'Maintenance', 'Affectations', 'Coûts', 'Documents', 'Graphiques'],
  smartfarm: ['Résumé', 'Capteurs', 'Caméras', 'Annexe', 'Graphiques'],
  gestion_systeme: ['Vue admin', 'Utilisateurs', 'Paramètres', 'Sécurité', 'Sauvegardes', 'Réinitialisation', 'Audit'],
};

export const INTERCONNECTIONS = {
  vente: ['commercial', 'finance_pilotage', 'documents_rapports', 'activite_suivi', 'objectifs_croissance'],
  achat: ['achats_stock', 'finance_pilotage', 'documents_rapports', 'activite_suivi', 'objectifs_croissance'],
  mortalite: ['elevage', 'finance_pilotage', 'objectifs_croissance', 'activite_suivi'],
  ponte: ['elevage', 'achats_stock', 'commercial', 'objectifs_croissance'],
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
  'dashboard', 'assistant_erp', 'objectifs_croissance', 'elevage', 'commercial',
  'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports', 'rh', 'gestion_systeme',
];
