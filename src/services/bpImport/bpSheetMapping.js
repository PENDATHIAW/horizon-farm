/**
 * Mapping déclaratif des 4 onglets BP Excel → modules ERP.
 * Source : Plan-financier-previsionnel HORIZON FARM.xlsx
 */

export const BP_SHEET_KEYS = {
  HYPOTHESES: 'hypotheses',
  PERIODICITE: 'periodicite_revenus',
  DONNEES: 'donnees_a_saisir',
  PLAN_IMPRIMABLE: 'plan_financier_imprimable',
};

export const BP_SHEET_LABELS = {
  [BP_SHEET_KEYS.HYPOTHESES]: 'Hypothèses',
  [BP_SHEET_KEYS.PERIODICITE]: 'Périodicité des sources de revenu',
  [BP_SHEET_KEYS.DONNEES]: 'Données à saisir',
  [BP_SHEET_KEYS.PLAN_IMPRIMABLE]: 'Plan financier à imprimer',
};

/** Modules ERP cibles (répartition, pas affichage brut dans Investissements). */
export const BP_TARGET_MODULES = {
  INVESTISSEMENTS: 'investissements',
  FINANCE_PILOTAGE: 'finance_pilotage',
  OBJECTIFS_CROISSANCE: 'objectifs_croissance',
  COMMERCIAL: 'commercial',
  ELEVAGE: 'elevage',
  RH: 'rh',
  ACHATS_STOCK: 'achats_stock',
  EQUIPEMENTS: 'equipements',
  DOCUMENTS: 'documents_rapports',
  GESTION_SYSTEME: 'gestion_systeme',
};

/** Natures de lignes BP. */
export const BP_LINE_NATURE = {
  BESOIN_DEMARRAGE: 'besoin_demarrage',
  INVESTISSEMENT_AMORTISSABLE: 'investissement_amortissable',
  EQUIPEMENT: 'equipement',
  MATERIEL: 'materiel',
  STOCK_INITIAL: 'stock_initial',
  TRESORERIE_DEPART: 'tresorerie_depart',
  CHARGE_VARIABLE: 'charge_variable',
  CHARGE_FIXE: 'charge_fixe',
  SALAIRE: 'salaire',
  REVENU_PREVISIONNEL: 'revenu_previsionnel',
  FINANCEMENT: 'financement',
  BFR: 'bfr',
  RENTABILITE: 'rentabilite',
  SYNTHESE_RAPPORT: 'synthese_rapport',
  IDENTITE_PROJET: 'identite_projet',
};

/** Catégories startup → nature + module cible. */
export const STARTUP_CATEGORY_MAP = {
  petit_materiel_avicole: { nature: BP_LINE_NATURE.MATERIEL, module_cible: BP_TARGET_MODULES.ACHATS_STOCK, display_in_investissements: true },
  materiel_chair: { nature: BP_LINE_NATURE.EQUIPEMENT, module_cible: BP_TARGET_MODULES.ACHATS_STOCK, display_in_investissements: true },
  epi: { nature: BP_LINE_NATURE.MATERIEL, module_cible: BP_TARGET_MODULES.RH, display_in_investissements: true },
  materiel_bovins: { nature: BP_LINE_NATURE.MATERIEL, module_cible: BP_TARGET_MODULES.ACHATS_STOCK, display_in_investissements: true },
  administratif: { nature: BP_LINE_NATURE.BESOIN_DEMARRAGE, module_cible: BP_TARGET_MODULES.DOCUMENTS, display_in_investissements: true },
  cheptel_pondeuses: { nature: BP_LINE_NATURE.BESOIN_DEMARRAGE, module_cible: BP_TARGET_MODULES.ELEVAGE, display_in_investissements: true },
  stock_depart: { nature: BP_LINE_NATURE.STOCK_INITIAL, module_cible: BP_TARGET_MODULES.ACHATS_STOCK, display_in_investissements: true },
  tresorerie_depart: { nature: BP_LINE_NATURE.TRESORERIE_DEPART, module_cible: BP_TARGET_MODULES.FINANCE_PILOTAGE, display_in_investissements: true },
};

/** Mapping des 4 onglets - rôle et cibles ERP. */
export const BP_SHEET_MAPPING = [
  {
    key: BP_SHEET_KEYS.HYPOTHESES,
    label: BP_SHEET_LABELS[BP_SHEET_KEYS.HYPOTHESES],
    role: 'Base de calcul du BP - coûts, prix, quantités, salaires.',
    targets: [
      { module: BP_TARGET_MODULES.OBJECTIFS_CROISSANCE, tab: 'Hypothèses', sections: ['charges_variables', 'charges_fixes', 'salaires', 'revenus_annuels'] },
      { module: BP_TARGET_MODULES.COMMERCIAL, tab: 'Prévisions', sections: ['prix_vente', 'revenus_previsionnels'] },
      { module: BP_TARGET_MODULES.FINANCE_PILOTAGE, tab: 'Rentabilité', sections: ['charges_previsionnelles'] },
      { module: BP_TARGET_MODULES.RH, tab: 'Coûts', sections: ['salaires'] },
      { module: BP_TARGET_MODULES.ACHATS_STOCK, tab: 'Achats', sections: ['intrants', 'materiel'] },
    ],
    display_in_investissements: false,
  },
  {
    key: BP_SHEET_KEYS.PERIODICITE,
    label: BP_SHEET_LABELS[BP_SHEET_KEYS.PERIODICITE],
    role: 'Calendrier mensuel des revenus par activité et cycle.',
    targets: [
      { module: BP_TARGET_MODULES.OBJECTIFS_CROISSANCE, tab: 'Prévisions', sections: ['ca_mensuel_par_activite'] },
      { module: BP_TARGET_MODULES.COMMERCIAL, tab: 'Opportunités', sections: ['previsions_ventes'] },
      { module: BP_TARGET_MODULES.ELEVAGE, tab: 'Production', sections: ['oeufs', 'chair', 'bovins'] },
      { module: BP_TARGET_MODULES.FINANCE_PILOTAGE, tab: 'Trésorerie', sections: ['tresorerie_previsionnelle'] },
      { module: BP_TARGET_MODULES.COMMERCIAL, tab: 'Ventes', sections: ['fumier_produit'] },
    ],
    display_in_investissements: false,
  },
  {
    key: BP_SHEET_KEYS.DONNEES,
    label: BP_SHEET_LABELS[BP_SHEET_KEYS.DONNEES],
    role: 'Données structurantes - à découper par section.',
    sections: [
      { key: 'identite', label: 'Infos projet / statut juridique', module: BP_TARGET_MODULES.GESTION_SYSTEME, nature: BP_LINE_NATURE.IDENTITE_PROJET, display_in_investissements: false },
      { key: 'besoins_demarrage', label: 'Besoins de démarrage', module: BP_TARGET_MODULES.INVESTISSEMENTS, nature: BP_LINE_NATURE.BESOIN_DEMARRAGE, display_in_investissements: true },
      { key: 'equipements', label: 'Équipements et matériel', module: BP_TARGET_MODULES.ACHATS_STOCK, nature: BP_LINE_NATURE.EQUIPEMENT, display_in_investissements: true },
      { key: 'stock_initial', label: 'Stock initial / effectif poules', module: BP_TARGET_MODULES.ACHATS_STOCK, nature: BP_LINE_NATURE.STOCK_INITIAL, display_in_investissements: true },
      { key: 'tresorerie_depart', label: 'Trésorerie de départ', module: BP_TARGET_MODULES.FINANCE_PILOTAGE, nature: BP_LINE_NATURE.TRESORERIE_DEPART, display_in_investissements: true },
      { key: 'financements', label: 'Apports, prêts, subventions', module: BP_TARGET_MODULES.OBJECTIFS_CROISSANCE, nature: BP_LINE_NATURE.FINANCEMENT, display_in_investissements: false },
      { key: 'charges_fixes', label: 'Charges fixes', module: BP_TARGET_MODULES.FINANCE_PILOTAGE, nature: BP_LINE_NATURE.CHARGE_FIXE, display_in_investissements: false },
      { key: 'charges_variables', label: 'Charges variables', module: BP_TARGET_MODULES.FINANCE_PILOTAGE, nature: BP_LINE_NATURE.CHARGE_VARIABLE, display_in_investissements: false },
      { key: 'salaires', label: 'Salaires', module: BP_TARGET_MODULES.RH, nature: BP_LINE_NATURE.SALAIRE, display_in_investissements: false },
      { key: 'amortissements', label: 'Amortissements', module: BP_TARGET_MODULES.INVESTISSEMENTS, nature: BP_LINE_NATURE.INVESTISSEMENT_AMORTISSABLE, display_in_investissements: true },
      { key: 'bfr', label: 'BFR', module: BP_TARGET_MODULES.FINANCE_PILOTAGE, nature: BP_LINE_NATURE.BFR, display_in_investissements: false },
      { key: 'rentabilite', label: 'Rentabilité', module: BP_TARGET_MODULES.FINANCE_PILOTAGE, nature: BP_LINE_NATURE.RENTABILITE, display_in_investissements: false },
    ],
  },
  {
    key: BP_SHEET_KEYS.PLAN_IMPRIMABLE,
    label: BP_SHEET_LABELS[BP_SHEET_KEYS.PLAN_IMPRIMABLE],
    role: 'Rapport de synthèse financeur - lecture, pas source de création.',
    targets: [
      { module: BP_TARGET_MODULES.DOCUMENTS, tab: 'Rapports', sections: ['synthese_bp'] },
      { module: BP_TARGET_MODULES.OBJECTIFS_CROISSANCE, tab: 'Financeurs', sections: ['dossier_financeur'] },
      { module: BP_TARGET_MODULES.FINANCE_PILOTAGE, tab: 'Synthèse BP', sections: ['etats_financiers'] },
    ],
    display_in_investissements: false,
    read_only_summary: true,
  },
];

export function resolveStartupLineMeta(category = '') {
  return STARTUP_CATEGORY_MAP[category] || {
    nature: BP_LINE_NATURE.BESOIN_DEMARRAGE,
    module_cible: BP_TARGET_MODULES.INVESTISSEMENTS,
    display_in_investissements: true,
  };
}

export function isInvestissementsActionableLine(line = {}) {
  if (line.display_in_investissements === false) return false;
  if (line.module_cible && line.module_cible !== BP_TARGET_MODULES.INVESTISSEMENTS && line.display_in_investissements !== true) {
    const nature = line.nature || '';
    const allowed = [
      BP_LINE_NATURE.BESOIN_DEMARRAGE,
      BP_LINE_NATURE.INVESTISSEMENT_AMORTISSABLE,
      BP_LINE_NATURE.EQUIPEMENT,
      BP_LINE_NATURE.MATERIEL,
      BP_LINE_NATURE.STOCK_INITIAL,
      BP_LINE_NATURE.TRESORERIE_DEPART,
    ];
    if (!allowed.includes(nature)) return false;
  }
  const nature = line.nature || '';
  const blocked = [BP_LINE_NATURE.CHARGE_VARIABLE, BP_LINE_NATURE.CHARGE_FIXE, BP_LINE_NATURE.SALAIRE, BP_LINE_NATURE.REVENU_PREVISIONNEL, BP_LINE_NATURE.FINANCEMENT, BP_LINE_NATURE.BFR, BP_LINE_NATURE.RENTABILITE, BP_LINE_NATURE.SYNTHESE_RAPPORT, BP_LINE_NATURE.IDENTITE_PROJET];
  if (blocked.includes(nature)) return false;
  if (line.display_in_investissements === true) return true;
  return true;
}
