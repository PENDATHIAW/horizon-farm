/** Constantes agronomiques Horizon Farm - fumier / engrais. */

export const FERTILIZER_BAG_KG = 50;

/** 1 sac de fumier collecté ≈ 1 sac d'engrais chimique NPK économisé sur le maraîchage. */
export const MANURE_TO_FERTILIZER_SAC_RATIO = 1;

/** Prix de vente BP par sac (unité terrain = sac). */
export const FUMIER_SALE_PRICE_BY_PROFILE = {
  pondeuses: 1500,
  chair: 1000,
  bovins: 500,
  mixte: 1000,
};

/** Fallback si aucun stock engrais avec prix unitaire. */
export const DEFAULT_ENGRAIS_SAC_PRICE_FCFA = 12000;

export const FUMIER_STOCK_CATEGORY = 'fumier';
