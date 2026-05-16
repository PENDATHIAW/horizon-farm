import { calculateAnimalMetrics, calculateCultureMetrics, calculateLotMetrics } from './businessCalculations';
import { toNumber } from './format';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const lossValueOf = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.perte_estimee ?? row.montant_sinistre ?? row.pertes_mortalite_estimees ?? 0);
export const isDeadAnimal = (animal = {}) => norm(animal.status || animal.statut) === 'mort';
export const isLossCulture = (culture = {}) => ['sinistre', 'perdu'].includes(norm(culture.statut || culture.status));

export function calculateAnimalMetricsWithLoss(args = {}) {
  const animal = args.animal || {};
  const base = calculateAnimalMetrics(args);
  const lossValue = isDeadAnimal(animal) ? lossValueOf(animal) || base.totalCost : lossValueOf(animal);
  const economicLoss = isDeadAnimal(animal) ? Math.max(lossValue, base.totalCost) : lossValue;
  const totalCostWithLoss = base.totalCost + lossValue;
  return {
    ...base,
    lossValue,
    economicLoss,
    totalCostWithLoss,
    margin: isDeadAnimal(animal) ? -economicLoss : base.salePrice > 0 ? base.salePrice - totalCostWithLoss : base.margin,
    marginRate: totalCostWithLoss > 0 && base.salePrice > 0 ? ((base.salePrice - totalCostWithLoss) / totalCostWithLoss) * 100 : base.marginRate,
    healthScore: isDeadAnimal(animal) ? 0 : base.healthScore,
  };
}

export function calculateLotMetricsWithLoss(args = {}) {
  const lot = args.lot || {};
  const base = calculateLotMetrics(args);
  const initial = toNumber(lot.initial_count ?? lot.effectif_initial);
  const mortality = toNumber(lot.mortality);
  const explicitLoss = lossValueOf(lot);
  const inferredMortalityLoss = initial > 0 && mortality > 0 ? (base.totalCosts / initial) * mortality : 0;
  const lossValue = explicitLoss || inferredMortalityLoss;
  const totalCostsWithLoss = base.totalCosts + lossValue;
  const activeBase = base.currentCount > 0 ? base.currentCount : Math.max(1, initial - toNumber(lot.vendus) - toNumber(lot.reformes) - toNumber(lot.sorties));
  return {
    ...base,
    lossValue,
    totalCostsWithLoss,
    estimatedMargin: base.grossRevenue - totalCostsWithLoss,
    totalCostPerHead: activeBase > 0 ? totalCostsWithLoss / activeBase : base.totalCostPerHead,
    marginPerHead: activeBase > 0 ? (base.grossRevenue - totalCostsWithLoss) / activeBase : base.marginPerHead,
  };
}

export function calculateCultureMetricsWithLoss(culture = {}) {
  const base = calculateCultureMetrics(culture);
  const losses = toNumber(culture.pertes ?? culture.quantite_perdue ?? culture.quantite_sinistree);
  const unitPrice = toNumber(culture.prix_vente_unitaire);
  const lossValue = lossValueOf(culture) || (losses > 0 && unitPrice > 0 ? losses * unitPrice : 0);
  const totalCostWithLoss = base.costTotal + lossValue;
  const revenueEstimated = toNumber(culture.revenu_estime);
  const revenueReal = toNumber(culture.revenu_reel);
  const expected = toNumber(culture.quantite_prevue);
  const harvested = toNumber(culture.quantite_recoltee);
  const availableQty = Math.max(0, toNumber(culture.quantite_disponible) || harvested - losses || expected - losses);
  return {
    ...base,
    lossValue,
    totalCostWithLoss,
    availableQty,
    marginEstimated: revenueEstimated - totalCostWithLoss,
    marginReal: revenueReal > 0 ? revenueReal - totalCostWithLoss : isLossCulture(culture) ? -totalCostWithLoss : base.marginReal,
    healthScore: isLossCulture(culture) && availableQty <= 0 ? 0 : base.healthScore,
  };
}
