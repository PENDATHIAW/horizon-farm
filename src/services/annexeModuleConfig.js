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
  smartfarm: 'Smart Farm',
};

const ALL_FORMULA_IDS = [
  'hijri_calendar', 'launch_timing', 'date_pivot', 'lead_times', 'commercial_calendar',
  'sell_now', 'commercial_gap', 'production_capacity', 'financial_gap', 'workshop_targets',
  'break_even', 'demand_coverage', 'demand_forecast', 'supply_coverage', 'zootechnical',
  'laying_rate', 'gmq_real', 'ic_chair', 'ith_heat', 'theoretical_standard', 'cost_animal',
  'cost_avicole', 'cost_layer_tablet', 'mca_rentabilite', 'rentabilite_ranking', 'bfr',
  'stock_audit', 'flux_silo', 'flux_occupation', 'sanitary', 'sanitary_extended', 'shrinkage',
  'pricing_floor', 'pricing_seasonality', 'pricing_recommended', 'pricing_matrix',
  'scissors_effect', 'transformation_arbitrage', 'vet_comparison', 'feed_inflation',
  'feed_supplier_ranking', 'seasonality_weather', 'client_quality', 'maraichage_biomass',
  'maraichage_sandbox', 'charts_g1_g7', 'charts_centre', 'technical_farming',
];

/** Blocs explicites par module — seule source utilisée pour filtrer les formules. */
export const MODULE_ANNEXE_PRESETS = {
  centre_ia: {
    blockIds: ALL_FORMULA_IDS,
    intro: 'Toutes les règles de calcul du Centre décisionnel : calendrier, ventes, élevage, trésorerie et alertes.',
    showPilotage: true,
    showFestivals: true,
    methodologyIds: null,
    glossaryTerms: null,
  },
  objectifs_croissance: {
    blockIds: [
      'hijri_calendar', 'date_pivot', 'lead_times', 'commercial_calendar', 'commercial_gap',
      'production_capacity', 'financial_gap', 'workshop_targets', 'break_even', 'demand_coverage',
      'demand_forecast', 'supply_coverage', 'pricing_floor', 'pricing_seasonality',
      'pricing_recommended', 'pricing_matrix', 'mca_rentabilite', 'rentabilite_ranking',
      'seasonality_weather', 'client_quality', 'maraichage_biomass', 'maraichage_sandbox',
      'charts_g1_g7', 'charts_centre',
    ],
    intro: 'Objectifs mensuels, écarts CA, prix conseillés et courbes de croissance — ce qui alimente votre business plan.',
    showPilotage: true,
    showFestivals: true,
    methodologyIds: ['calendrier', 'demande', 'break_even', 'bfr', 'prix', 'couts'],
    glossaryTerms: ['BFR', 'Point mort', 'Couverture %', 'Effet ciseau', 'Client VIP (BFR)', 'Date pivot / date limite'],
  },
  dashboard: {
    blockIds: ['hijri_calendar', 'break_even', 'demand_coverage', 'commercial_gap', 'charts_g1_g7'],
    intro: 'Vue synthèse : objectifs du mois, demande clients et seuil de rentabilité en un coup d\'œil.',
    showPilotage: false,
    showFestivals: false,
    methodologyIds: ['calendrier', 'demande', 'break_even'],
    glossaryTerms: ['Point mort', 'Couverture %', 'Date pivot / date limite'],
  },
  elevage: {
    blockIds: [
      'date_pivot', 'lead_times', 'sell_now', 'ith_heat', 'sanitary', 'sanitary_extended',
      'zootechnical', 'laying_rate', 'gmq_real', 'ic_chair', 'theoretical_standard',
      'cost_animal', 'cost_avicole', 'cost_layer_tablet', 'mca_rentabilite',
      'stock_audit', 'flux_silo', 'vet_comparison',
    ],
    intro: 'Cycle biologique : ponte, chair, animaux, alimentation et transformation — les quantités physiques et DLC sont dans Achats & Stock.',
    showPilotage: false,
    showFestivals: true,
    methodologyIds: ['quand-vendre', 'quand-lancer', 'zootechnical', 'stock_audit', 'couts'],
    glossaryTerms: [
      'J+40, J+90…', 'ITH', 'IC (indice consommation)', 'GMQ / prise de poids', 'MCA / marge aliment',
      'Vide sanitaire', 'Taux de ponte', 'Souche / race', 'Catalogue race / objectif catalogue',
    ],
  },
  commercial: {
    blockIds: [
      'commercial_calendar', 'commercial_gap', 'production_capacity', 'demand_coverage',
      'demand_forecast', 'supply_coverage', 'client_quality', 'sell_now',
      'pricing_floor', 'pricing_seasonality', 'pricing_recommended', 'pricing_matrix',
    ],
    intro: 'Ventes, demande clients, stocks disponibles et prix minimum conseillé par produit.',
    showPilotage: false,
    showFestivals: true,
    methodologyIds: ['demande', 'prix', 'break_even', 'quand-vendre'],
    glossaryTerms: ['Point mort', 'Couverture %', 'Effet ciseau', 'Client VIP (BFR)'],
  },
  achats_stock: {
    blockIds: [
      'stock_audit', 'flux_silo', 'flux_occupation', 'feed_inflation', 'feed_supplier_ranking',
      'shrinkage', 'cost_animal', 'cost_avicole', 'cost_layer_tablet',
      'transformation_arbitrage', 'maraichage_biomass', 'maraichage_sandbox',
    ],
    intro: 'Stock physique : silos, pertes, DLC, ponts production (œufs, viande chair, viande animaux, récoltes) et coûts d’approvisionnement.',
    showPilotage: false,
    showFestivals: false,
    methodologyIds: ['stock_audit', 'couts', 'zootechnical'],
    glossaryTerms: [
      'IC (indice consommation)', 'Effet ciseau', 'Couverture %', 'Taux de ponte',
      '1 tablette = 30 œufs', 'DLC / lot stock',
    ],
  },
  finance_pilotage: {
    blockIds: [
      'bfr', 'break_even', 'financial_gap', 'flux_occupation', 'mca_rentabilite',
      'rentabilite_ranking', 'scissors_effect', 'cost_animal', 'cost_avicole', 'cost_layer_tablet',
    ],
    intro: 'Trésorerie, BFR, point mort, marges et comparaison des activités les plus rentables.',
    showPilotage: false,
    showFestivals: false,
    methodologyIds: ['bfr', 'break_even', 'couts', 'prix'],
    glossaryTerms: ['BFR', 'Point mort', 'MCA / marge aliment', 'Effet ciseau', 'Client VIP (BFR)', 'Couverture %'],
  },
  activite_suivi: {
    blockIds: ['vet_comparison', 'technical_farming', 'ith_heat', 'seasonality_weather', 'sanitary_extended'],
    intro: 'Suivi terrain : interventions véto, météo, chaleur et bonnes pratiques par activité.',
    showPilotage: false,
    showFestivals: false,
    methodologyIds: ['zootechnical'],
    glossaryTerms: ['ITH', 'Vide sanitaire', 'J+40, J+90…'],
  },
  documents_rapports: {
    blockIds: ['charts_g1_g7', 'charts_centre', 'client_quality', 'commercial_gap', 'rentabilite_ranking'],
    intro: 'Indicateurs exportables : courbes, classements rentabilité et qualité clients pour vos rapports.',
    showPilotage: false,
    showFestivals: false,
    methodologyIds: ['break_even', 'couts'],
    glossaryTerms: ['Point mort', 'Couverture %'],
  },
  smartfarm: {
    blockIds: ['ith_heat', 'seasonality_weather', 'technical_farming', 'stock_audit', 'flux_silo', 'flux_occupation'],
    intro: 'Capteurs et caméras : chaleur, météo, occupation des bâtiments et consommation silo.',
    showPilotage: false,
    showFestivals: false,
    methodologyIds: ['zootechnical', 'stock_audit'],
    glossaryTerms: ['ITH', 'Couverture %'],
  },
};

export function annexeLabelForModule(moduleId = '') {
  return MODULE_ANNEXE_LABELS[moduleId] || 'Module ERP';
}

export function annexePresetForModule(moduleId = '') {
  return MODULE_ANNEXE_PRESETS[moduleId] || null;
}

export function annexeIntroForModule(moduleId = '') {
  return annexePresetForModule(moduleId)?.intro || 'Formules et règles de calcul propres à ce module.';
}

export function annexeShowPilotage(moduleId = '') {
  return Boolean(annexePresetForModule(moduleId)?.showPilotage);
}

export function annexeShowFestivals(moduleId = '') {
  return Boolean(annexePresetForModule(moduleId)?.showFestivals);
}

export function annexeMethodologyIdsForModule(moduleId = '') {
  const preset = annexePresetForModule(moduleId);
  if (!preset) return null;
  return preset.methodologyIds;
}

export function annexeGlossaryTermsForModule(moduleId = '') {
  const preset = annexePresetForModule(moduleId);
  if (!preset) return null;
  return preset.glossaryTerms;
}

export default MODULE_ANNEXE_PRESETS;
