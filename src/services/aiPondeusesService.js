import { avicoleActiveCount } from '../utils/avicoleMetrics';
import { toNumber } from '../utils/format';

const TABLET_SIZE = 30;
const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const isLayerLot = (lot = {}) => {
  const type = normalizeText(`${lot.type || ''} ${lot.category || ''} ${lot.categorie || ''} ${lot.name || ''}`);
  return type.includes('pondeuse') || type.includes('layer') || type.includes('ponte');
};

const dateOf = (row = {}, keys = ['date', 'created_at', 'event_date']) => {
  const raw = keys.map((key) => row?.[key]).find(Boolean);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const daysBetween = (start, end = new Date()) => {
  if (!start) return null;
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? Math.max(diff, 1) : null;
};

const valueByKeys = (row = {}, keys = []) => {
  for (const key of keys) {
    const value = toNumber(row[key], null);
    if (value !== null && Number.isFinite(value) && value !== 0) return value;
  }
  return 0;
};

const productionQty = (row = {}) => valueByKeys(row, ['oeufs_produits', 'oeufs', 'quantite', 'quantity', 'total_oeufs', 'production']);
const brokenEggsQty = (row = {}) => valueByKeys(row, ['oeufs_casses', 'casses', 'broken_eggs', 'pertes']);
const feedCost = (row = {}) => valueByKeys(row, ['montant_total', 'cout_total', 'total', 'amount', 'montant', 'prix_total', 'cost']);
const feedQty = (row = {}) => valueByKeys(row, ['quantite', 'quantity', 'qty']);
const rowsForLot = (rows, lotId) => asRows(rows).filter((row) => row.lot_id === lotId || row.cible_id === lotId || row.entity_id === lotId);
const latestMarketPrice = (marketPrices = [], category) => asRows(marketPrices).filter((row) => normalizeText(row.product_category) === normalizeText(category)).sort((a, b) => (dateOf(b, ['observed_at', 'created_at'])?.getTime() || 0) - (dateOf(a, ['observed_at', 'created_at'])?.getTime() || 0))[0] || null;

export const buildPondeusesIntelligence = ({ lots = [], productionLogs = [], alimentationLogs = [], stocks = [], marketPrices = [], meteo = null } = {}) => {
  const layerLots = asRows(lots).filter(isLayerLot);
  const eggMarketPrice = latestMarketPrice(marketPrices, 'oeufs');
  const feedMarketPrice = latestMarketPrice(marketPrices, 'aliment_pondeuse');

  const analyses = layerLots.map((lot) => {
    const lotId = lot.id;
    const productions = rowsForLot(productionLogs, lotId);
    const feeding = rowsForLot(alimentationLogs, lotId).filter((row) => {
      const cible = normalizeText(`${row.type_cible || ''} ${row.categorie || ''} ${row.category || ''}`);
      return !cible || cible.includes('lot') || cible.includes('avicole') || cible.includes('pondeuse');
    });

    const producedEggs = productions.reduce((sum, row) => sum + productionQty(row), 0);
    const brokenEggs = productions.reduce((sum, row) => sum + brokenEggsQty(row), 0);
    const sellableEggs = Math.max(producedEggs - brokenEggs, 0);
    const tablets = sellableEggs / TABLET_SIZE;
    const totalFeedCost = feeding.reduce((sum, row) => sum + feedCost(row), 0);
    const totalFeedQty = feeding.reduce((sum, row) => sum + feedQty(row), 0);
    const currentCount = avicoleActiveCount(lot);
    const firstProductionDate = productions.map((row) => dateOf(row)).filter(Boolean).sort((a, b) => a - b)[0];
    const days = daysBetween(firstProductionDate) || Math.max(productions.length, 1);
    const layingRate = currentCount > 0 && days > 0 && producedEggs > 0 ? (producedEggs / (currentCount * days)) * 100 : 0;
    const costPerEgg = sellableEggs > 0 ? totalFeedCost / sellableEggs : 0;
    const costPerTablet = costPerEgg * TABLET_SIZE;
    const suggestedTabletPrice = eggMarketPrice?.price ? Math.max(toNumber(eggMarketPrice.price), costPerTablet * 1.25) : costPerTablet * 1.3;
    const estimatedMarginPerTablet = suggestedTabletPrice - costPerTablet;

    const alerts = [];
    if (layingRate > 0 && layingRate < 65) alerts.push('Taux de ponte faible: verifier alimentation, chaleur, eau et sante.');
    if (brokenEggs > producedEggs * 0.08) alerts.push('Taux de casse eleve: verifier manipulation, pondoirs et collecte.');
    if (Number(meteo?.temp || 0) >= 35) alerts.push('Chaleur elevee: risque de stress thermique et baisse de ponte.');
    if (totalFeedCost > 0 && sellableEggs === 0) alerts.push('Cout alimentation enregistre sans production vendable associee.');

    return {
      lot_id: lotId,
      lot_name: lot.name || lot.nom || lotId,
      current_count: currentCount,
      produced_eggs: producedEggs,
      broken_eggs: brokenEggs,
      sellable_eggs: sellableEggs,
      tablets,
      total_feed_cost: totalFeedCost,
      total_feed_qty: totalFeedQty,
      laying_rate: layingRate,
      cost_per_egg: costPerEgg,
      cost_per_tablet: costPerTablet,
      suggested_tablet_price: suggestedTabletPrice,
      estimated_margin_per_tablet: estimatedMarginPerTablet,
      market_tablet_price: eggMarketPrice?.price || null,
      market_feed_price: feedMarketPrice?.price || null,
      alerts,
    };
  });

  const totals = analyses.reduce((acc, row) => ({ lots: acc.lots + 1, current_count: acc.current_count + row.current_count, produced_eggs: acc.produced_eggs + row.produced_eggs, sellable_eggs: acc.sellable_eggs + row.sellable_eggs, total_feed_cost: acc.total_feed_cost + row.total_feed_cost, tablets: acc.tablets + row.tablets }), { lots: 0, current_count: 0, produced_eggs: 0, sellable_eggs: 0, total_feed_cost: 0, tablets: 0 });
  const globalCostPerEgg = totals.sellable_eggs > 0 ? totals.total_feed_cost / totals.sellable_eggs : 0;
  const globalCostPerTablet = globalCostPerEgg * TABLET_SIZE;
  const recommendations = [];

  analyses.forEach((analysis) => {
    if (analysis.alerts.length) recommendations.push({ type: 'production', module_target: 'avicole', entity_type: 'lot_avicole', entity_id: analysis.lot_id, priority: analysis.alerts.some((alert) => alert.includes('Chaleur') || alert.includes('faible')) ? 'haute' : 'moyenne', title: `Surveiller ${analysis.lot_name}`, summary: analysis.alerts.join(' '), action_recommandee: 'Verifier eau, temperature, alimentation, sante et conditions de ponte.', confidence_score: 70 });
  });

  if (feedMarketPrice?.price) recommendations.push({ type: 'achat', module_target: 'stock', priority: 'moyenne', title: 'Prix aliment pondeuse observe', summary: `Dernier prix observe: ${feedMarketPrice.price} FCFA par ${feedMarketPrice.unit || 'unite'}.`, action_recommandee: 'Comparer avec les derniers achats internes avant commande.', confidence_score: feedMarketPrice.confidence_level === 'confirme' ? 85 : 55 });
  if (eggMarketPrice?.price && globalCostPerTablet > 0) {
    const margin = toNumber(eggMarketPrice.price) - globalCostPerTablet;
    recommendations.push({ type: 'prix', module_target: 'ventes', priority: margin < 0 ? 'critique' : 'moyenne', title: 'Prix tablette a verifier', summary: `Prix marche observe ${eggMarketPrice.price} FCFA, cout calcule ${Math.round(globalCostPerTablet)} FCFA/tablette.`, action_recommandee: margin < 0 ? 'Ne pas vendre sous le cout calcule. Revoir prix ou cout aliment.' : 'Utiliser ce prix comme base de negociation.', confidence_score: eggMarketPrice.confidence_level === 'confirme' ? 80 : 50 });
  }

  return { generated_at: new Date().toISOString(), scope: 'pondeuses', tablet_size: TABLET_SIZE, lots: analyses, totals: { ...totals, cost_per_egg: globalCostPerEgg, cost_per_tablet: globalCostPerTablet }, recommendations };
};

export default buildPondeusesIntelligence;
