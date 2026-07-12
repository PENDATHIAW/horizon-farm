/** Chantier 10 — registre anti-duplication (source de vérité par domaine). */

export const ANTI_DUPLICATION_DECISIONS = {
  keep: 'keep',
  merge: 'merge',
  redirect: 'redirect',
  hide_expert: 'hide_expert',
  readonly: 'readonly',
};

export const ANTI_DUPLICATION_PAIRS = [
  {
    id: 'charge_vs_stock',
    label: 'Ajouter charge vs Achat stock',
    sourceModule: 'achats_stock',
    sourceTab: 'Stock',
    duplicateModules: ['finance_pilotage', 'investissements', 'objectifs_croissance'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'Achats opérationnels → stock_purchase. Charges BP/prévision = lecture prévisionnelle.',
  },
  {
    id: 'document_vs_preuve',
    label: 'Ajouter document vs Joindre preuve',
    sourceModule: 'documents_rapports',
    sourceTab: 'Bibliothèque',
    duplicateModules: ['finance_pilotage', 'activite_suivi'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'Upload et rattachement dans Documents · Bibliothèque — pas de tâche seule.',
  },
  {
    id: 'vente_commercial_finance',
    label: 'Vente Commercial vs Finance',
    sourceModule: 'commercial',
    sourceTab: 'Ventes',
    duplicateModules: ['finance_pilotage', 'centre_decisionnel', 'objectifs_croissance'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'Création vente uniquement dans Commercial — Finance = encaissements liés.',
  },
  {
    id: 'stock_vs_mouvements',
    label: 'Stock vs Mouvements',
    sourceModule: 'achats_stock',
    sourceTab: 'Stock',
    duplicateModules: ['achats_stock'],
    duplicateTab: 'Mouvements',
    decision: ANTI_DUPLICATION_DECISIONS.readonly,
    detail: 'Saisie dans Stock — Mouvements = historique lecture seule.',
  },
  {
    id: 'alertes_centre_activite',
    label: 'Alertes Centre décisionnel vs Activité & Suivi',
    sourceModule: 'activite_suivi',
    sourceTab: 'Alertes',
    duplicateModules: ['centre_decisionnel'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'CRUD alertes dans Activité & Suivi — Centre = pilotage et redirection.',
  },
  {
    id: 'financeur_documents_objectifs',
    label: 'Rapport financeur Documents vs Objectifs',
    sourceModule: 'rapports',
    sourceTab: null,
    duplicateModules: ['documents_rapports', 'objectifs_croissance'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'Génération PDF dans Rapports — Documents/Objectifs = vitrine lecture.',
  },
  {
    id: 'maintenance_rh_equipements',
    label: 'Maintenance RH vs Équipements',
    sourceModule: 'equipements',
    sourceTab: null,
    duplicateModules: ['rh'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'Workflow maintenance complet dans Équipements — RH = file d’attente lecture.',
  },
  {
    id: 'capteurs_smartfarm_equipements',
    label: 'Capteurs Smart Farm vs Équipements',
    sourceModule: 'smartfarm',
    sourceTab: null,
    duplicateModules: ['equipements', 'rh'],
    decision: ANTI_DUPLICATION_DECISIONS.redirect,
    detail: 'CRUD capteurs/caméras dans Smart Farm — Équipements = matériel physique.',
  },
  {
    id: 'rentabilite_finance_elevage',
    label: 'Rentabilité Finance vs Élevage/Objectifs',
    sourceModule: 'finance_pilotage',
    sourceTab: 'Rentabilité',
    duplicateModules: ['elevage', 'objectifs_croissance'],
    decision: ANTI_DUPLICATION_DECISIONS.readonly,
    detail: 'Marge globale ERP dans Finance — Élevage/Objectifs = lecture métier + liens.',
  },
];

export function getAntiDuplicationPair(id = '') {
  return ANTI_DUPLICATION_PAIRS.find((pair) => pair.id === id) || null;
}

export function listAntiDuplicationPairs() {
  return ANTI_DUPLICATION_PAIRS.map((pair) => ({ ...pair }));
}
