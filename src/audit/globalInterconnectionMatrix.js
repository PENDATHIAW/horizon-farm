export const globalInterconnectionMatrix = [
  {
    source: 'Accueil',
    targets: ['Ventes', 'Finances', 'Comptabilité', 'Objectifs', 'Alertes', 'Tâches', 'Animaux', 'Avicole', 'Cultures', 'Stock'],
    mustShow: ['CA total aligné', 'charges réelles', 'marge', 'alertes liées', 'actions rapides vers modules sources'],
    anomalies: ['ca_dashboard_non_aligne', 'charges_dashboard_zero_suspect', 'alerte_sans_source', 'kpi_sans_lien_module'],
  },
  {
    source: 'Animaux',
    targets: ['Santé', 'Finances', 'Comptabilité', 'Ventes', 'Stock', 'Tâches', 'Alertes', 'Traçabilité', 'Documents', 'Objectifs', 'Centre décisionnel'],
    mustShow: ['prix achat', 'coût alimentation', 'coût santé', 'autres frais', 'coût total', 'marge estimée/réelle', 'pesée J+15', 'rappel J-1', 'vente liée si vendu'],
    anomalies: ['fiche_animal_sans_couts_lies', 'cout_sante_non_remonte', 'cout_alimentation_non_remonte', 'animal_vendu_sans_commande', 'animal_actif_sans_rappel_pesee'],
  },
  {
    source: 'Avicole',
    targets: ['Santé', 'Finances', 'Comptabilité', 'Ventes', 'Stock', 'Tâches', 'Alertes', 'Traçabilité', 'Documents', 'Objectifs', 'Centre décisionnel'],
    mustShow: ['coût poussins', 'coût aliment', 'coût santé', 'mortalité', 'production œufs', 'vente partielle', 'marge lot', 'stock/sorties liés'],
    anomalies: ['lot_sans_couts_lies', 'vente_partielle_non_tracee', 'production_oeufs_non_liee_objectifs', 'mortalite_sans_impact'],
  },
  {
    source: 'Cultures',
    targets: ['Stock', 'Ventes', 'Finances', 'Comptabilité', 'Tâches', 'Alertes', 'Traçabilité', 'Documents', 'Objectifs', 'Centre décisionnel'],
    mustShow: ['parcelle', 'surface', 'semences', 'engrais', 'eau', 'main-d’œuvre', 'traitements', 'récolte', 'pertes', 'stock disponible', 'opportunité vente'],
    anomalies: ['culture_sans_couts_lies', 'recolte_sans_stock', 'pertes_non_tracees', 'culture_vendue_sans_ca'],
  },
  {
    source: 'Santé',
    targets: ['Animaux', 'Avicole', 'Finances', 'Comptabilité', 'Stock', 'Documents', 'Traçabilité', 'Tâches', 'Alertes', 'Impact Business'],
    mustShow: ['cible animal/lot/culture', 'coût santé', 'URL photo preuve', 'impact structuré', 'charge finance', 'trace', 'rappel si nécessaire'],
    anomalies: ['sante_sans_cible', 'cout_sante_sans_finance', 'preuve_photo_url_absente', 'preuve_photo_url_invalide', 'sante_sans_trace'],
  },
  {
    source: 'Ventes',
    targets: ['Clients', 'Finances', 'Comptabilité', 'Stock', 'Documents', 'Traçabilité', 'Objectifs', 'Centre décisionnel', 'Animaux', 'Avicole', 'Cultures'],
    mustShow: ['client', 'commande', 'paiement', 'reste à payer', 'facture', 'sortie stock/actif vendu', 'objectif réalisé', 'trace'],
    anomalies: ['paiement_sans_finance', 'facture_sans_document', 'vente_sans_stock_ou_actif', 'vente_sans_objectif', 'commande_sans_trace'],
  },
  {
    source: 'Finances',
    targets: ['Ventes', 'Comptabilité', 'Animaux', 'Avicole', 'Cultures', 'Santé', 'Stock', 'RH', 'Fournisseurs', 'Investissements', 'Documents'],
    mustShow: ['recettes ventes', 'charges santé', 'charges alimentation', 'charges stock', 'charges RH', 'charges investissements', 'source de chaque transaction', 'justificatif'],
    anomalies: ['charges_zero_malgre_activite', 'transaction_sans_source', 'recette_vente_absente', 'charge_metier_absente', 'justificatif_absent'],
  },
  {
    source: 'Comptabilité',
    targets: ['Finances', 'Ventes', 'Documents', 'Investissements', 'Rapports'],
    mustShow: ['CA', 'charges', 'résultat', 'pièces liées', 'rapprochement paiements'],
    anomalies: ['resultat_incoherent', 'charges_compta_zero_suspect', 'ecart_finances_comptabilite', 'piece_comptable_absente'],
  },
  {
    source: 'Stock',
    targets: ['Ventes', 'Finances', 'Fournisseurs', 'Animaux', 'Avicole', 'Cultures', 'Alertes', 'Tâches', 'Traçabilité'],
    mustShow: ['entrée', 'sortie', 'consommation', 'seuil', 'valeur', 'source', 'destination'],
    anomalies: ['stock_sans_valeur', 'sortie_sans_trace', 'vente_sans_sortie_stock', 'seuil_depasse_sans_alerte', 'achat_sans_fournisseur'],
  },
  {
    source: 'Clients',
    targets: ['Ventes', 'Finances', 'Documents', 'Tâches', 'Alertes'],
    mustShow: ['commandes', 'paiements', 'reste à payer', 'créances', 'relances', 'coordonnées'],
    anomalies: ['client_sans_commandes_visibles', 'creance_incoherente', 'paiement_client_non_lie', 'relance_absente'],
  },
  {
    source: 'Fournisseurs',
    targets: ['Stock', 'Finances', 'Comptabilité', 'Documents', 'Tâches'],
    mustShow: ['achats', 'dettes', 'factures', 'réceptions stock', 'charges finance'],
    anomalies: ['dette_sans_finance', 'achat_sans_stock', 'facture_fournisseur_absente', 'fournisseur_sans_historique'],
  },
  {
    source: 'RH',
    targets: ['Tâches', 'Finances', 'Comptabilité', 'Alertes', 'Rapports'],
    mustShow: ['rôles', 'responsables', 'charges RH', 'tâches affectées', 'salaires/primes'],
    anomalies: ['tache_sans_responsable', 'charge_rh_absente', 'role_non_lie_module', 'cout_rh_absent_marge'],
  },
  {
    source: 'Tâches',
    targets: ['Alertes', 'Animaux', 'Avicole', 'Cultures', 'Santé', 'Stock', 'RH', 'Traçabilité', 'Centre décisionnel'],
    mustShow: ['responsable', 'échéance', 'module lié', 'source', 'statut', 'trace fin tâche'],
    anomalies: ['tache_sans_source', 'tache_sans_responsable', 'tache_terminee_sans_trace', 'risque_sans_tache'],
  },
  {
    source: 'Alertes',
    targets: ['Tâches', 'Stock', 'Santé', 'Animaux', 'Avicole', 'Cultures', 'Finances', 'Centre décisionnel', 'Traçabilité'],
    mustShow: ['source', 'gravité', 'module lié', 'action recommandée', 'tâche possible', 'traitement tracé'],
    anomalies: ['alerte_sans_source', 'alerte_sans_action', 'alerte_traitee_sans_trace', 'risque_metier_sans_alerte'],
  },
  {
    source: 'Documents',
    targets: ['Ventes', 'Finances', 'Comptabilité', 'Santé', 'Fournisseurs', 'Rapports', 'Traçabilité'],
    mustShow: ['type', 'module lié', 'URL/fichier', 'facture', 'preuve santé URL photo', 'rapport', 'recherche'],
    anomalies: ['document_sans_lien', 'facture_introuvable', 'preuve_sante_introuvable', 'rapport_audit_absent'],
  },
  {
    source: 'Traçabilité',
    targets: ['Tous modules'],
    mustShow: ['vente', 'paiement', 'santé', 'stock', 'récolte', 'tâche', 'alerte', 'correction audit'],
    anomalies: ['action_importante_sans_trace', 'trace_sans_module_source', 'timeline_incomplete', 'filtre_trace_defaillant'],
  },
  {
    source: 'Investissements',
    targets: ['Finances', 'Comptabilité', 'Objectifs', 'Rapports', 'Équipements', 'Centre décisionnel'],
    mustShow: ['BP', 'lignes dépenses', 'charges récurrentes', 'CA prévisionnel', 'financement', 'ROI'],
    anomalies: ['bp_sans_charges', 'bp_sans_ca_previsionnel', 'investissement_sans_finance', 'roi_inexpliqué'],
  },
  {
    source: 'Objectifs',
    targets: ['Accueil', 'Ventes', 'Finances', 'Animaux', 'Avicole', 'Cultures', 'Investissements', 'Centre décisionnel'],
    mustShow: ['objectif', 'réalisé', 'écart', 'CA par activité', 'marge', 'projection'],
    anomalies: ['realise_zero_malgre_vente', 'ca_non_ventile', 'marge_sans_cout', 'objectif_sans_source'],
  },
  {
    source: 'Centre décisionnel',
    targets: ['Tous modules métier'],
    mustShow: ['décision sourcée', 'priorité', 'action', 'module cible', 'absence de doublon'],
    anomalies: ['decision_sans_source', 'decision_doublon', 'action_mauvais_module', 'decision_deja_executee'],
  },
  {
    source: 'Rapports',
    targets: ['Finances', 'Comptabilité', 'Objectifs', 'Documents', 'Assistant ERP', 'Investissements'],
    mustShow: ['anomalies', 'corrections', 'avant/après', 'score justifié', 'export'],
    anomalies: ['rapport_vide', 'score_sans_justification', 'rapport_non_exportable', 'avant_apres_absent'],
  },
  {
    source: 'Équipements',
    targets: ['Tâches', 'Finances', 'Documents', 'Alertes', 'Investissements'],
    mustShow: ['statut', 'maintenance', 'panne', 'coût', 'document', 'tâche'],
    anomalies: ['panne_sans_tache', 'reparation_sans_cout', 'maintenance_sans_trace', 'equipement_sans_document'],
  },
  {
    source: 'Smart Farm',
    targets: ['Alertes', 'Tâches', 'Centre décisionnel', 'Traçabilité'],
    mustShow: ['capteur', 'dernière donnée', 'seuil', 'alerte automatique', 'action terrain'],
    anomalies: ['capteur_muet_sans_alerte', 'seuil_depasse_sans_action', 'donnee_capteur_non_datee'],
  },
  {
    source: 'Gestion système',
    targets: ['Assistant ERP', 'Audit logs', 'Tous modules sensibles'],
    mustShow: ['utilisateurs', 'rôles', 'droits', 'actions sensibles protégées', 'compte testeur'],
    anomalies: ['droit_trop_large', 'module_sensible_non_protege', 'testeur_sans_acces', 'action_agent_non_tracee'],
  },
  {
    source: 'Sync ERP',
    targets: ['Tous modules modifiés', 'Audit logs', 'Rapports'],
    mustShow: ['dernière sync', 'erreurs', 'actions en attente', 'reprise', 'journal'],
    anomalies: ['erreur_silencieuse', 'donnee_non_synchronisee', 'action_perdue', 'journal_absent'],
  },
];

export const getGlobalInterconnectionsForModule = (moduleName) => globalInterconnectionMatrix.filter((item) => item.source === moduleName || item.targets.includes(moduleName) || item.targets.includes('Tous modules') || item.targets.includes('Tous modules métier'));

export default globalInterconnectionMatrix;
