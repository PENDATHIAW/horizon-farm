import { toNumber } from '../utils/format';

const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const dateOf = (row = {}, keys = ['observed_at', 'created_at', 'date']) => {
  const raw = keys.map((key) => row?.[key]).find(Boolean);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const isRecent = (row, maxAgeDays = 30) => {
  const date = dateOf(row);
  if (!date) return false;
  const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return age <= maxAgeDays;
};

const confidenceWeight = (level = '') => {
  const value = normalizeText(level);
  if (value.includes('confirme')) return 1;
  if (value.includes('observe')) return 0.8;
  if (value.includes('estime')) return 0.55;
  return 0.35;
};

const effectivePrice = (row = {}) =>
  toNumber(row.price, 0) + toNumber(row.transport_cost, 0);

const productMatches = (row = {}, query = '') => {
  const haystack = normalizeText(`${row.product_name || ''} ${row.product_category || ''} ${row.unit || ''} ${row.notes || ''}`);
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  return words.every((word) => haystack.includes(word));
};

export const analyzeMarketPrices = ({
  marketPrices = [],
  productQuery = '',
  category = '',
  maxAgeDays = 45,
} = {}) => {
  const rows = asRows(marketPrices)
    .filter((row) => !category || normalizeText(row.product_category) === normalizeText(category))
    .filter((row) => productMatches(row, productQuery))
    .map((row) => ({
      ...row,
      effective_price: effectivePrice(row),
      confidence_weight: confidenceWeight(row.confidence_level),
      recent: isRecent(row, maxAgeDays),
      observed_date: dateOf(row),
    }))
    .sort((a, b) => a.effective_price - b.effective_price);

  const recentRows = rows.filter((row) => row.recent);
  const candidates = recentRows.length ? recentRows : rows;
  const best = candidates[0] || null;
  const highest = candidates[candidates.length - 1] || null;
  const average = candidates.length
    ? candidates.reduce((sum, row) => sum + row.effective_price, 0) / candidates.length
    : 0;

  const spread = best && highest ? highest.effective_price - best.effective_price : 0;
  const spreadRate = average > 0 ? (spread / average) * 100 : 0;

  const recommendations = [];
  if (!candidates.length) {
    recommendations.push({
      type: 'veille',
      priority: 'moyenne',
      title: 'Prix marche manquant',
      summary: 'Aucun prix exploitable trouve pour ce produit. Renseigner au moins deux prix recents pour comparer.',
      action_recommandee: 'Ajouter un releve prix, un devis, une facture ou une information fournisseur datee.',
      confidence_score: 30,
    });
  } else if (best) {
    recommendations.push({
      type: 'achat',
      priority: best.confidence_weight >= 0.8 ? 'moyenne' : 'basse',
      title: 'Meilleur prix observe',
      summary: `${best.product_name || best.product_category} : ${best.effective_price} ${best.currency || 'FCFA'} / ${best.unit || 'unite'}${best.source_name ? ` via ${best.source_name}` : ''}.`,
      action_recommandee: best.confidence_weight < 0.8 ? 'Verifier le prix avant commande car la confiance est limitee.' : 'Comparer qualite, delai et disponibilite avant achat.',
      confidence_score: Math.round(best.confidence_weight * 100),
      source_data: best,
    });
  }

  if (spreadRate >= 10 && best && highest) {
    recommendations.push({
      type: 'economie',
      priority: 'haute',
      title: 'Ecart prix significatif',
      summary: `Ecart estime de ${Math.round(spreadRate)}% entre le prix le plus bas et le plus haut.`,
      action_recommandee: 'Verifier rapidement le meilleur prix et negocier avec les autres sources.',
      confidence_score: 70,
    });
  }

  return {
    generated_at: new Date().toISOString(),
    product_query: productQuery,
    category,
    max_age_days: maxAgeDays,
    count: candidates.length,
    all_count: rows.length,
    best,
    highest,
    average_price: average,
    spread,
    spread_rate: spreadRate,
    candidates,
    recommendations,
  };
};

export const analyzeSupplierScore = ({ marketPrices = [], supplierName = '' } = {}) => {
  const normalizedSupplier = normalizeText(supplierName);
  const rows = asRows(marketPrices).filter((row) => normalizeText(`${row.source_name || ''} ${row.related_supplier_id || ''}`).includes(normalizedSupplier));
  if (!rows.length) {
    return {
      supplier_name: supplierName,
      score: 0,
      label: 'donnees_insuffisantes',
      explanation: 'Aucun historique prix trouve pour cette source.',
      factors: {},
    };
  }

  const recentRows = rows.filter((row) => isRecent(row, 60));
  const usableRows = recentRows.length ? recentRows : rows;
  const avgConfidence = usableRows.reduce((sum, row) => sum + confidenceWeight(row.confidence_level), 0) / usableRows.length;
  const avgQuality = usableRows.reduce((sum, row) => sum + toNumber(row.quality_rating, 0), 0) / usableRows.length;
  const avgDelay = usableRows.reduce((sum, row) => sum + toNumber(row.delivery_delay_days, 0), 0) / usableRows.length;

  const score = Math.round(
    Math.min(100,
      avgConfidence * 45 +
      Math.min(avgQuality || 0, 5) * 8 +
      Math.max(0, 20 - avgDelay * 3) +
      Math.min(usableRows.length * 3, 15)
    )
  );

  return {
    supplier_name: supplierName,
    score,
    label: score >= 75 ? 'fiable' : score >= 50 ? 'a_surveiller' : 'donnees_limitees',
    explanation: `${usableRows.length} releve(s) exploite(s), confiance moyenne ${Math.round(avgConfidence * 100)}%.`,
    factors: {
      rows: usableRows.length,
      avg_confidence: avgConfidence,
      avg_quality: avgQuality,
      avg_delay_days: avgDelay,
    },
  };
};

export default analyzeMarketPrices;
