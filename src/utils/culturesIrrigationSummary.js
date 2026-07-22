/**
 * Synthèse d'irrigation par culture, à partir de l'historique enregistré
 * (irrigation_history) et des cumuls (eau_consommee_litres, cout_eau).
 *
 * Sert l'onglet Irrigation : donne à cet onglet son identité propre (suivi de
 * l'eau consommée et des dernières irrigations) au lieu de redupliquer le hub
 * « Intrants & météo » qui vit dans l'onglet Intrants & fertilisation.
 */

const num = (value) => Number(value || 0) || 0;
const arr = (value) => (Array.isArray(value) ? value : []);
const dateKey = (value = '') => String(value || '').slice(0, 10);

function cultureLabel(culture = {}) {
  return culture.nom || culture.culture || culture.parcelle || culture.type || culture.id || 'Culture';
}

/**
 * @param {Array} cultures lignes cultures (réelles, déjà filtrées si besoin)
 * @param {number} recentLimit nombre d'irrigations récentes à retourner
 */
export function buildIrrigationSummary(cultures = [], recentLimit = 6) {
  const rows = arr(cultures);
  let totalVolume = 0;
  let totalCost = 0;
  let irrigationCount = 0;
  const perCulture = [];
  const recentAll = [];

  rows.forEach((culture) => {
    const history = arr(culture.irrigation_history);
    const volume = num(culture.eau_consommee_litres) || history.reduce((sum, entry) => sum + num(entry.volume_litres ?? entry.volume_l), 0);
    const cost = num(culture.cout_eau) || history.reduce((sum, entry) => sum + num(entry.cout ?? entry.cost), 0);
    if (volume <= 0 && history.length === 0) return;
    totalVolume += volume;
    totalCost += cost;
    irrigationCount += history.length;
    const lastDate = history.reduce((latest, entry) => {
      const d = dateKey(entry.date);
      return d > latest ? d : latest;
    }, '');
    perCulture.push({
      id: culture.id,
      label: cultureLabel(culture),
      volume,
      cost,
      count: history.length,
      lastDate,
    });
    history.forEach((entry) => {
      recentAll.push({
        cultureId: culture.id,
        label: cultureLabel(culture),
        date: dateKey(entry.date),
        volume: num(entry.volume_litres ?? entry.volume_l),
        cost: num(entry.cout ?? entry.cost),
        source: entry.source_eau || '',
      });
    });
  });

  perCulture.sort((a, b) => b.volume - a.volume);
  recentAll.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    totalVolume,
    totalCost,
    irrigationCount,
    culturesIrrigated: perCulture.length,
    perCulture,
    recent: recentAll.slice(0, Math.max(0, recentLimit)),
  };
}

export default buildIrrigationSummary;
