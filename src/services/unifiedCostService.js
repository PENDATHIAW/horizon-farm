import { calculateAnimalCost, calculateAvicoleLotCost, calculateCultureHealthCost, directExtraChargeTotal, summarizeAnimalCosts, summarizeAvicoleCosts } from '../utils/costEngine.js';
import { getFarmCostSettings } from './farmCostSettings.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);

/**
 * Coût de revient UNIFIÉ d'une culture : coûts saisis sur la fiche (semences,
 * engrais, eau, main d'oeuvre, traitement) + soins/phyto enregistrés via le module
 * Santé sur cette culture + charges directes rattachées. Sans ce moteur, un
 * traitement phyto saisi côté Santé n'était compté nulle part dans le coût culture.
 */
export function calculateUnifiedCultureCost({ culture = {}, healthEvents = [], directCharges = [] } = {}) {
  const fieldCost = ['cout_semences', 'cout_engrais', 'cout_eau', 'cout_main_oeuvre', 'cout_traitement']
    .reduce((sum, key) => sum + num(culture[key]), 0);
  const baseCost = num(culture.cout_total) || fieldCost;
  const health = calculateCultureHealthCost({ culture, healthEvents, directCharges }).total;
  const otherDirect = directExtraChargeTotal({ charges: directCharges, targetId: culture.id, targetType: 'cultures' });
  const totalCost = baseCost + health + otherDirect;
  const qty = Math.max(0, num(culture.quantite_recoltee) || num(culture.quantite_prevue));
  return {
    entityType: 'culture',
    entityId: culture.id || null,
    fieldCost: baseCost,
    healthCost: health,
    otherCost: otherDirect,
    totalCost,
    costPerKg: qty > 0 ? totalCost / qty : 0,
    costComplete: totalCost > 0,
  };
}

export const UNIFIED_COST_FORMULA = 'Coût total = achat + alimentation (réelle ou estimée) + santé + charges directes (+ emballage/transport ponte)';

export function buildCostContext(settings = getFarmCostSettings()) {
  return {
    defaultPricePerKg: settings.defaultFeedPricePerKg,
    settings,
  };
}

export function normalizeUnifiedCost(result = {}, entityType = 'entity') {
  const totalCost = Number(result.totalCost || 0);
  const purchase = Number(result.baseCost ?? result.purchaseCost ?? result.purchaseCostForPeriod ?? 0);
  const feed = Number(result.feedCostUsed ?? result.realFeedCost ?? 0);
  const health = Number(result.healthCost ?? 0);
  const other = Number(result.otherDirectCost ?? 0) + Number(result.packagingPeriodCost ?? 0) + Number(result.transportPeriodCost ?? 0);
  const salePrice = Number(result.salePrice ?? 0);
  const margin = salePrice > 0 ? salePrice - totalCost : Number(result.margin ?? result.estimatedMargin ?? 0);
  return {
    entityType,
    entityId: result.animalId || result.lotId || result.id || null,
    purchaseCost: purchase,
    feedingCost: feed,
    healthCost: health,
    otherCost: other,
    totalCost,
    margin,
    marginRate: totalCost > 0 && margin !== null ? (margin / totalCost) * 100 : 0,
    costSource: result.feedCostSource || (result.costComplete ? 'reel' : 'estime'),
    costComplete: Boolean(result.costComplete),
    costMissing: Boolean(result.costMissing),
    warnings: result.warnings || [],
    raw: result,
  };
}

export function calculateUnifiedAnimalCost({ animal, alimentationLogs = [], vaccins = [], healthEvents = [], directCharges = [], slaughterEvents = [], settings } = {}) {
  const ctx = buildCostContext(settings);
  const result = calculateAnimalCost({
    animal,
    alimentationLogs,
    vaccins,
    healthEvents,
    directCharges,
    slaughterEvents,
    defaultPricePerKg: ctx.defaultPricePerKg,
  });
  return normalizeUnifiedCost(result, 'animal');
}

export function calculateUnifiedLotCost({ lot, alimentationLogs = [], productionLogs = [], healthEvents = [], directCharges = [], slaughterEvents = [], settings } = {}) {
  const ctx = buildCostContext(settings);
  const result = calculateAvicoleLotCost({
    lot,
    alimentationLogs,
    productionLogs,
    healthEvents,
    directCharges,
    slaughterEvents,
    defaultPricePerKg: ctx.defaultPricePerKg,
  });
  return normalizeUnifiedCost(result, 'avicole_lot');
}

export function summarizeUnifiedFarmCosts({
  animaux = [],
  lots = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  healthEvents = [],
  directCharges = [],
  settings,
} = {}) {
  const ctx = buildCostContext(settings);
  const animals = summarizeAnimalCosts({
    rows: animaux,
    alimentationLogs,
    vaccins,
    healthEvents,
    directCharges,
    defaultPricePerKg: ctx.defaultPricePerKg,
  });
  const avicole = summarizeAvicoleCosts({
    rows: lots,
    alimentationLogs,
    productionLogs,
    healthEvents,
    directCharges,
    defaultPricePerKg: ctx.defaultPricePerKg,
  });
  return {
    animaux: animals,
    avicole,
    totalCost: animals.totalCost + avicole.totalCost,
    realFeedCost: animals.realFeedCost + avicole.realFeedCost,
    estimatedFeedCost: animals.estimatedFeedCost + avicole.estimatedFeedCost,
    healthCost: animals.healthCost + avicole.healthCost,
    otherDirectCost: animals.otherDirectCost + avicole.otherDirectCost,
  };
}

export function mergeFieldAndUnifiedTotals(fieldTotal = 0, unifiedTotal = 0) {
  const field = Number(fieldTotal || 0);
  const unified = Number(unifiedTotal || 0);
  if (unified <= 0) return field;
  if (field <= 0) return unified;
  return Math.max(field, unified);
}

export function mapUnifiedToLotMetricsFields(unified = {}) {
  const raw = unified.raw || unified;
  return {
    feedingCost: Number(raw.realFeedCost || raw.feedCostUsed || 0),
    healthCost: Number(raw.healthCost || 0),
    otherCosts: Number(raw.otherDirectCost || 0) + Number(raw.packagingPeriodCost || 0) + Number(raw.transportPeriodCost || 0),
    chickCost: Number(raw.purchaseCostForPeriod || raw.purchaseCost || 0),
    totalCosts: Number(raw.totalCost || 0),
    totalCost: Number(raw.totalCost || 0),
    costSource: raw.feedCostSource || 'unified',
    costComplete: Boolean(raw.costComplete),
  };
}

export function mapUnifiedToAnimalMetricsFields(unified = {}) {
  const raw = unified.raw || unified;
  return {
    feedingCost: Number(raw.feedCostUsed || raw.realFeedCost || 0),
    healthCost: Number(raw.healthCost || 0),
    otherCosts: Number(raw.otherDirectCost || 0),
    purchaseCost: Number(raw.baseCost || 0),
    totalCost: Number(raw.totalCost || 0),
    costSource: raw.feedCostSource || 'unified',
    costComplete: Boolean(raw.costComplete),
  };
}

export function listUnifiedCostWarnings(items = []) {
  return arr(items).flatMap((item) => item.warnings || []);
}
