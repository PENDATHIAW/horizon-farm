export const MODULE_OVERVIEW_KPIS = Object.freeze({
  assistant_erp: ['taches_ouvertes', 'alertes_urgentes', 'evenements_jour'],
  centre_decisionnel: ['alertes_urgentes', 'taches_ouvertes', 'tresorerie', 'produits_sous_seuil'],
  objectifs_croissance: ['ca', 'marge_globale', 'tresorerie', 'opportunites_financement'],
  elevage: ['effectif_animaux', 'ponte', 'alertes_urgentes', 'depenses'],
  cultures: ['cultures_actives', 'valeur_stock', 'ca', 'depenses'],
  commercial: ['ca', 'encaissements', 'creances', 'commandes_ouvertes'],
  achats_stock: ['valeur_stock', 'produits_sous_seuil', 'stocks_total', 'fournisseurs_actifs'],
  // Bandeau = flux du mois (CA, encaissements, dépenses, marge). La trésorerie
  // est un solde « à date » : elle vit dans le panneau « Situation financière »
  // ci-dessous, pas dans une carte mensuelle (évite deux trésoreries qui diffèrent).
  finance_pilotage: ['ca', 'encaissements', 'depenses', 'marge_globale'],
  activite_suivi: ['taches_ouvertes', 'alertes_urgentes', 'evenements_jour'],
  documents_rapports: ['documents_total', 'evenements_jour', 'taches_ouvertes'],
  equipe: ['membres_equipe', 'taches_ouvertes', 'alertes_urgentes'],
  equipements: ['equipements_disponibles', 'taches_ouvertes', 'depenses'],
  gestion_systeme: ['membres_equipe', 'capteurs_actifs', 'documents_total', 'alertes_urgentes'],
  agri_feeds: ['stocks_total', 'produits_sous_seuil', 'depenses', 'valeur_stock'],
  smartfarm: ['capteurs_actifs', 'alertes_urgentes', 'evenements_jour'],
  financements: ['opportunites_financement', 'documents_total', 'taches_ouvertes', 'evenements_jour'],
  financements_externe: ['documents_total', 'evenements_jour'],
});
