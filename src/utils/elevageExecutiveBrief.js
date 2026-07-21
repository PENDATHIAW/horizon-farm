const n = (v) => Number(v || 0);

/**
 * Brief dirigeant - règles métier, données réelles, pas de LLM externe.
 */
export function buildElevageExecutiveBrief({
  healthScore = 0,
  healthLate = 0,
  recentMortality = 0,
  layingRateCalculable = false,
  layingRate = 0,
  lots = [],
  feedLogs = [],
  productionSnapshot = {},
  activityPnl = {},
  healthFindings = [],
  reproduction = {},
} = {}) {
  const lines = [];
  const warnings = [];

  const stable = healthScore >= 70 && healthLate === 0 && recentMortality <= 3;
  lines.push(stable ? 'La ferme est stable sur la période.' : 'La ferme nécessite une attention opérationnelle.');

  if (!layingRateCalculable) {
    warnings.push('Taux de ponte non calculable - enregistrez des ramassages sur les lots pondeuses.');
  } else if (layingRate < 70) {
    warnings.push(`Taux de ponte faible (${layingRate.toFixed(0)} %) - vérifier alimentation et santé pondeuses.`);
  }

  const chairLots = productionSnapshot.chair?.readyList || [];
  chairLots.forEach((lot) => {
    const full = lots.find((l) => String(l.id) === String(lot.id));
    const weight = n(lot.weight ?? full?.weight_avg ?? full?.poids_moyen);
    const feedRecent = feedLogs.filter((f) => String(f.lot_id || f.related_id) === String(lot.id)).slice(-3);
    const feedTrend = feedRecent.length >= 2 && n(feedRecent[feedRecent.length - 1].quantite) > n(feedRecent[0].quantite) * 1.15;
    if (feedTrend && weight > 0 && weight < 1.6) {
      warnings.push(`Attention au lot ${lot.name || lot.id} : consommation en hausse alors que le poids stagne (${weight.toFixed(2)} kg).`);
    }
  });

  if (recentMortality > 5) {
    warnings.push(`Mortalité élevée sur la période (${recentMortality} cas) - consulter Santé et Transformation.`);
  }

  if (healthLate > 0) {
    warnings.push(`${healthLate} soin(s) en retard - risque blocage vente / transformation.`);
  }

  if (reproduction?.gestantesProches > 0) {
    warnings.push(`${reproduction.gestantesProches} mise(s) bas proche(s) - préparer Reproduction.`);
  }

  const realizedMargin = activityPnl?.totals?.realizedMargin;
  if (realizedMargin != null && realizedMargin < 0) {
    warnings.push('Marge réalisée négative sur les ventes - revoir coûts alimentation et prix de vente.');
  }

  healthFindings.slice(0, 2).forEach((f) => {
    if (f.title) warnings.push(f.title);
  });

  const attention = warnings.length
    ? warnings.slice(0, 4).join(' ')
    : 'Aucun signal critique - poursuivre le suivi quotidien.';

  return {
    headline: lines[0],
    attention,
    warnings,
    stable,
  };
}
