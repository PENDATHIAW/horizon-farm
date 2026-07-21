import { getCommercialMonth, demandLevelToFactor } from '../horizonCommercialCalendar.js';
import { classifySaleActivity } from '../growthDecisionEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const DEFAULT_MIN_MARGIN_PCT = 15;
const DEFAULT_UNIT_COST = {
  oeufs: 550,
  poulets_chair: 1900,
  bovins: 300000,
  cultures: 400,
};

const DEFAULT_MARKET = {
  oeufs: 2600,
  poulets_chair: 3700,
  bovins: 365000,
  cultures: 800,
};

function monthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function orderAmount(row = {}) {
  return num(row.montant_total ?? row.total ?? row.amount ?? row.prix_unitaire * row.quantity);
}

function orderQty(row = {}) {
  return Math.max(1, num(row.quantity ?? row.quantite ?? 1));
}

/** Historique mensuel des ventes par activité pour saisonnalité. */
export function buildMonthlySalesHistory(salesOrders = [], dataMap = {}) {
  const map = new Map();
  arr(salesOrders).forEach((order) => {
    const mk = String(order.date || order.date_commande || order.created_at || '').slice(0, 7);
    if (!mk || mk.length < 7) return;
    const activity = classifySaleActivity(order, dataMap);
    const key = `${mk}:${activity}`;
    const prev = map.get(key) || { month: mk, activity, revenue: 0, qty: 0 };
    prev.revenue += orderAmount(order);
    prev.qty += orderQty(order);
    map.set(key, prev);
  });
  return [...map.values()];
}

/** Coefficient saisonnalité = ratio ventes du mois / moyenne annuelle (min 0.85, max 1.25). */
export function computeSeasonalityCoefficient(activity, referenceDate = new Date(), salesOrders = [], dataMap = {}) {
  const mk = monthKey(referenceDate);
  const history = buildMonthlySalesHistory(salesOrders, dataMap).filter((r) => r.activity === activity);
  const monthRows = history.filter((r) => r.month === mk);
  const monthRevenue = monthRows.reduce((s, r) => s + r.revenue, 0);
  const totalRevenue = history.reduce((s, r) => s + r.revenue, 0);
  const monthsWithData = new Set(history.map((r) => r.month)).size;

  if (totalRevenue > 0 && monthsWithData >= 2) {
    const avgMonthly = totalRevenue / monthsWithData;
    const raw = avgMonthly > 0 ? monthRevenue / avgMonthly : 1;
    return Math.max(0.85, Math.min(1.25, raw || 1));
  }

  const commercial = getCommercialMonth(referenceDate.getMonth() + 1);
  const demand = commercial?.demand?.[activity] || commercial?.demand?.oeufs || 'normale';
  return demandLevelToFactor(demand);
}

export function resolveLocalMarketPrice(activity, { marketPrices = [], location = '', priceCatalog = [] } = {}) {
  const loc = norm(location);
  const fromMarket = arr(marketPrices)
    .filter((row) => {
      const text = norm(`${row.produit || ''} ${row.product || ''} ${row.activity || ''} ${row.categorie || ''}`);
      const rowLoc = norm(row.localite || row.location || row.ville || row.region || '');
      const actMatch = !row.activity || norm(row.activity) === norm(activity) || text.includes(norm(activity));
      const locMatch = !loc || !rowLoc || rowLoc.includes(loc) || loc.includes(rowLoc);
      return actMatch && locMatch;
    })
    .map((row) => num(row.prix ?? row.prix_unitaire ?? row.price ?? row.prix_marche))
    .filter((v) => v > 0);

  if (fromMarket.length) {
    return fromMarket.reduce((s, v) => s + v, 0) / fromMarket.length;
  }

  const fromCatalog = arr(priceCatalog)
    .filter((row) => norm(`${row.categorie || ''} ${row.item_name || ''} ${row.produit || ''}`).includes(norm(activity)))
    .map((row) => num(row.prix_unitaire ?? row.prix_vente))
    .filter((v) => v > 0);

  if (fromCatalog.length) {
    return fromCatalog.reduce((s, v) => s + v, 0) / fromCatalog.length;
  }

  return DEFAULT_MARKET[activity] || DEFAULT_MARKET.oeufs;
}

export function computeFloorPrice({
  unitCost = 0,
  minMarginPct = DEFAULT_MIN_MARGIN_PCT,
  activity = 'oeufs',
} = {}) {
  const cost = unitCost > 0 ? unitCost : DEFAULT_UNIT_COST[activity] || 0;
  const margin = num(minMarginPct) / 100;
  return Math.round(cost * (1 + margin));
}

/**
 * Prix Recommandé ERP = MAX(Prix Plancher ; Prix Marché Local × Coefficient Saisonnalité)
 */
export function computeRecommendedPrice({
  activity = 'oeufs',
  unitCost = 0,
  minMarginPct = DEFAULT_MIN_MARGIN_PCT,
  referenceDate = new Date(),
  salesOrders = [],
  dataMap = {},
  marketPrices = [],
  priceCatalog = [],
  location = '',
} = {}) {
  const floor = computeFloorPrice({ unitCost, minMarginPct, activity });
  const seasonality = computeSeasonalityCoefficient(activity, referenceDate, salesOrders, dataMap);
  const market = resolveLocalMarketPrice(activity, { marketPrices, location, priceCatalog });
  const adjustedMarket = Math.round(market * seasonality);
  const recommended = Math.max(floor, adjustedMarket);
  const mispricingRisk = floor > adjustedMarket;

  return {
    activity,
    unitCost: unitCost || DEFAULT_UNIT_COST[activity] || 0,
    minMarginPct,
    floorPrice: floor,
    marketPrice: market,
    seasonalityCoefficient: seasonality,
    adjustedMarketPrice: adjustedMarket,
    recommendedPrice: recommended,
    mispricingRisk,
    mispricingMessage: mispricingRisk
      ? 'Risque de mévente : Coût de production trop élevé par rapport au marché local.'
      : null,
  };
}

export function buildPricingMatrix({
  activities = ['oeufs', 'poulets_chair', 'bovins'],
  unitCosts = {},
  dataMap = {},
  referenceDate = new Date(),
} = {}) {
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const marketPrices = arr(dataMap.market_prices);
  const priceCatalog = arr(dataMap.price_catalog);
  const location = dataMap.farm?.ville || dataMap.farm?.location || dataMap.meteo?.ville || '';

  return activities.map((activity) => {
    const salesForActivity = salesOrders.filter((o) => classifySaleActivity(o, dataMap) === activity);
    const avgSalePrice = salesForActivity.length
      ? salesForActivity.reduce((s, o) => s + orderAmount(o) / orderQty(o), 0) / salesForActivity.length
      : 0;

    return {
      ...computeRecommendedPrice({
        activity,
        unitCost: num(unitCosts[activity]),
        minMarginPct: num(dataMap.growth_settings?.min_margin_pct ?? DEFAULT_MIN_MARGIN_PCT),
        referenceDate,
        salesOrders,
        dataMap,
        marketPrices,
        priceCatalog,
        location,
      }),
      practicedPrice: Math.round(avgSalePrice),
    };
  });
}
