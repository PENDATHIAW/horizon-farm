/** Limite de KPI visibles au premier écran de l'Accueil. */
export const ESSENTIAL_KPI_LIMIT = 6;

/**
 * Sélectionne les clés KPI essentiels pour la première vue Accueil.
 * Ordre : trésorerie, CA, créances, stock, production/activité, alertes.
 */
export function selectEssentialKpiKeys(summary = {}) {
  const keys = ['cashNet', 'ca', 'receivable', 'stock'];
  if (summary.eggProduction?.eggsPeriod > 0 || summary.eggProduction?.eggsAllTime > 0 || summary.headcount?.effectifPondeuses > 0) {
    keys.push('production');
  } else if (summary.cultureSummary?.hasData) {
    keys.push('cultures');
  } else {
    keys.push('production');
  }
  keys.push('alertes');
  return keys.slice(0, ESSENTIAL_KPI_LIMIT);
}

/** Clés KPI secondaires (hors essentiels). */
export const SECONDARY_KPI_KEYS = [
  'openSales', 'encaisse', 'resultat', 'cultures', 'production', 'effectifs',
];
