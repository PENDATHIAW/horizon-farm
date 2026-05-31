/** Quelles formules Annexe afficher par module ERP (sans dupliquer le contenu). */

export const MODULE_ANNEXE_LABELS = {
  dashboard: 'Accueil',
  centre_ia: 'Centre décisionnel',
  objectifs_croissance: 'Objectifs & Croissance',
  elevage: 'Élevage',
  commercial: 'Commercial',
  achats_stock: 'Achats & Stock',
  finance_pilotage: 'Finance & Pilotage',
  activite_suivi: 'Activité & Suivi',
  documents_rapports: 'Documents & Rapports',
};

/** Catégories de formules + blocs explicites par module. */
export const MODULE_ANNEXE_PRESETS = {
  dashboard: {
    categories: ['calendrier', 'commerce', 'analytique', 'graphiques'],
    blockIds: ['break_even', 'demand_coverage'],
  },
  elevage: {
    categories: ['zootechnie', 'couts', 'calendrier', 'flux', 'pilotage'],
    blockIds: ['date_pivot', 'sell_now', 'ith_heat', 'sanitary', 'sanitary_extended', 'zootechnical', 'laying_rate', 'gmq_real', 'ic_chair', 'cost_animal', 'cost_avicole', 'mca_rentabilite', 'stock_audit', 'flux_silo'],
  },
  commercial: {
    categories: ['commerce', 'demande', 'prix'],
    blockIds: ['commercial_gap', 'demand_coverage', 'demand_forecast', 'supply_coverage', 'client_quality', 'pricing_floor', 'pricing_recommended'],
  },
  achats_stock: {
    categories: ['flux', 'analytique', 'couts'],
    blockIds: ['stock_audit', 'flux_silo', 'feed_inflation', 'feed_supplier_ranking', 'shrinkage'],
  },
  finance_pilotage: {
    categories: ['flux', 'couts', 'commerce'],
    blockIds: ['bfr', 'break_even', 'financial_gap', 'flux_occupation'],
  },
  activite_suivi: {
    categories: ['pilotage', 'analytique'],
    blockIds: ['vet_comparison', 'technical_farming'],
  },
  documents_rapports: {
    categories: ['analytique', 'pilotage'],
    blockIds: [],
  },
};

export function annexeLabelForModule(moduleId = '') {
  return MODULE_ANNEXE_LABELS[moduleId] || 'Module ERP';
}

export function annexePresetForModule(moduleId = '') {
  return MODULE_ANNEXE_PRESETS[moduleId] || null;
}

export default MODULE_ANNEXE_PRESETS;
