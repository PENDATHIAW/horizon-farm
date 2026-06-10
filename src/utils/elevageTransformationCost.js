import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../services/unifiedCostService.js';
import { fmtCurrency } from './format.js';

const n = (v) => Number(v || 0);

/**
 * Coût de revient transformation : acquisition + alimentation + santé.
 */
export function buildTransformationCostBreakdown(entity = {}, marginContext = {}, type = 'animal') {
  const ctx = {
    alimentationLogs: marginContext.feedLogs || marginContext.alimentationLogs || [],
    productionLogs: marginContext.productionLogs || [],
    healthEvents: marginContext.healthEvents || marginContext.vaccins || [],
    vaccins: marginContext.healthEvents || [],
    businessEvents: marginContext.businessEvents || [],
  };

  const unified = type === 'lot'
    ? calculateUnifiedLotCost({ lot: entity, ...ctx })
    : calculateUnifiedAnimalCost({ animal: entity, ...ctx });

  const acquisition = n(unified.purchaseCost ?? entity.purchase_cost ?? entity.cout_achat ?? entity.prix_achat);
  const feeding = n(unified.feedingCost ?? unified.feedCostUsed);
  const health = n(unified.healthCost);
  const other = n(unified.otherCost);
  const total = n(unified.totalCost) || acquisition + feeding + health + other;

  return {
    acquisition,
    feeding,
    health,
    other,
    total,
    totalLabel: fmtCurrency(total),
    complete: Boolean(unified.costComplete),
    lines: [
      { label: 'Acquisition', value: acquisition },
      { label: 'Alimentation', value: feeding },
      { label: 'Santé', value: health },
      { label: 'Autres', value: other },
    ].filter((l) => l.value > 0),
  };
}
