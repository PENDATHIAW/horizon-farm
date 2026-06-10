const n = (v) => Number(v || 0);
const arr = (v) => (Array.isArray(v) ? v : []);

/**
 * Phrases explicatives pour onglet Graphiques Élevage.
 */
export function buildElevageChartNarratives({
  lots = [],
  animaux = [],
  productionLogs = [],
  alimentationLogs = [],
} = {}) {
  const narratives = [];

  const mortalityTotal = lots.reduce((s, l) => s + n(l.mortality ?? l.morts), 0);
  const initialTotal = lots.reduce((s, l) => s + n(l.initial_count ?? l.effectif_initial), 0);
  const mortalityRate = initialTotal > 0 ? (mortalityTotal / initialTotal) * 100 : 0;

  if (mortalityRate <= 3) {
    narratives.push('La mortalité reste dans la plage normale.');
  } else if (mortalityRate <= 6) {
    narratives.push('La mortalité est modérée — surveiller les lots les plus touchés.');
  } else {
    narratives.push('La mortalité est élevée — action Santé et biosécurité recommandée.');
  }

  const eggsByWeek = arr(productionLogs).slice(-14);
  if (eggsByWeek.length >= 4) {
    const first = eggsByWeek.slice(0, Math.floor(eggsByWeek.length / 2)).reduce((s, r) => s + n(r.oeufs_produits ?? r.eggs_count), 0);
    const second = eggsByWeek.slice(Math.floor(eggsByWeek.length / 2)).reduce((s, r) => s + n(r.oeufs_produits ?? r.eggs_count), 0);
    if (second < first * 0.85) {
      narratives.push('La production d’œufs ralentit sur les deux dernières semaines.');
    } else if (second > first * 1.1) {
      narratives.push('La production d’œufs progresse sur la période récente.');
    } else {
      narratives.push('La production d’œufs est stable sur la période.');
    }
  }

  const feedCost = arr(alimentationLogs).reduce((s, r) => s + n(r.montant_total ?? r.cout_total), 0);
  if (feedCost > 0 && animaux.length + lots.length > 0) {
    narratives.push(`Coût alimentation période : ${Math.round(feedCost).toLocaleString('fr-FR')} F — croiser avec Production pour l’IC.`);
  }

  const bovinsWithWeight = arr(animaux).filter((a) => n(a.poids ?? a.weight) > 0);
  if (bovinsWithWeight.length >= 2) {
    narratives.push(`${bovinsWithWeight.length} bovin(s) avec pesée — suivre GMQ dans Production.`);
  }

  return narratives;
}
