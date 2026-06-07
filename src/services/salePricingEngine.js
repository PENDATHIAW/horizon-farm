import { getAnimalSalePricePerKg, getFarmCostSettings, resolveAnimalSpeciesKey } from './farmCostSettings.js';
import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from './unifiedCostService.js';
import { calculateAnimalSalePricing, getAnimalSaleReadiness } from '../utils/animalSalePricing.js';
import { toNumber } from '../utils/format';

const clean = (value) => String(value || '').trim().toLowerCase();

function latestMarketPrice(marketPrices = [], category) {
  const rows = Array.isArray(marketPrices) ? marketPrices : [];
  return rows
    .filter((row) => clean(row.product_category || row.category) === clean(category))
    .sort((a, b) => new Date(b.observed_at || b.created_at || 0) - new Date(a.observed_at || a.created_at || 0))[0] || null;
}

function broilerPriceByWeight(weightKg, settings) {
  const prices = settings.broilerPriceByWeight || {};
  if (weightKg >= 2) return toNumber(prices.at2_0) || 4000;
  if (weightKg >= 1.7) return toNumber(prices.at1_7) || 3500;
  if (weightKg >= 1.5) return toNumber(prices.at1_5) || 3000;
  return toNumber(prices.below1_5) || 2500;
}

export function recommendAnimalSalePrice({ animal, alimentationLogs = [], vaccins = [], healthEvents = [], marketPrices = [] } = {}) {
  const settings = getFarmCostSettings();
  const speciesKey = resolveAnimalSpeciesKey(animal);
  const configuredPricePerKg = getAnimalSalePricePerKg(speciesKey, settings);
  const enrichedAnimal = {
    ...animal,
    marge_cible_pct: animal.marge_cible_pct || animal.target_margin_rate || settings.defaultTargetMarginPct,
    prix_kg_estime: toNumber(animal.prix_kg_estime || animal.market_price_per_kg) || configuredPricePerKg,
  };
  const unified = calculateUnifiedAnimalCost({ animal: enrichedAnimal, alimentationLogs, vaccins, healthEvents });
  const effectiveWeight = toNumber(animal.poids ?? animal.poids_actuel ?? animal.current_weight ?? unified.raw?.kg);
  const pricing = calculateAnimalSalePricing({ animal: enrichedAnimal, metrics: { totalCost: unified.totalCost } });
  const readiness = getAnimalSaleReadiness({ animal: enrichedAnimal, metrics: { totalCost: unified.totalCost } });
  const market = latestMarketPrice(marketPrices, animal.type || animal.espece || speciesKey);
  const marketPerKg = toNumber(market?.price);
  const marketFloor = marketPerKg > 0 && effectiveWeight > 0 ? marketPerKg * effectiveWeight : marketPerKg;
  const recommended = Math.max(pricing.recommendedSalePrice, marketFloor || 0);
  const margin = recommended - unified.totalCost;
  const alerts = [];
  if (recommended <= 0) {
    alerts.push('Renseigner le poids et les coûts (achat/alimentation) ou les prix/kg dans l’onglet Annexe pour obtenir un prix proposé.');
  } else if (margin < 0) {
    alerts.push('Prix recommandé sous le coût total — ne pas vendre sans ajuster.');
  } else if (unified.totalCost > 0 && margin < unified.totalCost * (settings.defaultTargetMarginPct / 100)) {
    alerts.push('Marge sous objectif — revoir prix ou coûts.');
  }
  return {
    entityType: 'animal',
    speciesKey,
    configuredPricePerKg,
    totalCost: unified.totalCost,
    recommendedPrice: recommended,
    minimumPrice: pricing.minimumAcceptablePrice,
    margin,
    marginRate: unified.totalCost > 0 ? (margin / unified.totalCost) * 100 : 0,
    costSource: unified.costSource,
    marketPrice: market?.price || null,
    readiness,
    pricing,
    alerts,
  };
}

export function recommendAvicoleLotPrice({ lot, alimentationLogs = [], productionLogs = [], healthEvents = [], marketPrices = [] } = {}) {
  const settings = getFarmCostSettings();
  const unified = calculateUnifiedLotCost({ lot, alimentationLogs, productionLogs, healthEvents });
  const layer = clean(lot.type).includes('pondeuse') || clean(lot.type).includes('ponte');
  const active = toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count);
  const weight = toNumber(lot.weight_avg ?? lot.poids_moyen_actuel ?? lot.poids_moyen);
  const market = latestMarketPrice(marketPrices, layer ? 'oeufs' : 'poulet_chair');
  const unitFromCost = unified.totalCost > 0 && active > 0
    ? (unified.totalCost / active) * (1 + settings.defaultTargetMarginPct / 100)
    : 0;
  const configured = toNumber(lot.prix_vente_estime ?? lot.prix_unitaire_vente ?? lot.unit_sale_price);
  const fallbackWeight = !layer ? broilerPriceByWeight(weight, settings) : toNumber(market?.price) || 2500;
  const recommendedUnit = Math.max(configured, unitFromCost, fallbackWeight, toNumber(market?.price));
  const recommendedTotal = recommendedUnit * Math.max(1, active);
  const margin = recommendedTotal - unified.totalCost;
  return {
    entityType: 'avicole_lot',
    totalCost: unified.totalCost,
    recommendedUnitPrice: recommendedUnit,
    recommendedTotalPrice: recommendedTotal,
    minimumUnitPrice: active > 0 ? unified.totalCost / active : unified.totalCost,
    margin,
    marginRate: unified.totalCost > 0 ? (margin / unified.totalCost) * 100 : 0,
    costSource: unified.costSource,
    marketPrice: market?.price || null,
    alerts: margin < 0 ? ['Prix recommandé sous le coût total — ne pas vendre sans ajuster.'] : margin < unified.totalCost * (settings.defaultTargetMarginPct / 100) ? ['Marge sous objectif paramétré.'] : [],
  };
}

export function recommendSalePriceForEntity(params = {}) {
  if (params.animal) return recommendAnimalSalePrice(params);
  if (params.lot) return recommendAvicoleLotPrice(params);
  return null;
}
