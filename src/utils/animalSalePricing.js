const toNumber = (value) => Number(value || 0) || 0;
const clean = (value) => String(value || '').trim().toLowerCase();

export const calculateAnimalSalePricing = ({ animal = {}, metrics = {} } = {}) => {
  const totalCost = toNumber(metrics.totalCost);
  const currentWeight = toNumber(animal.poids ?? animal.poids_actuel ?? animal.current_weight);
  const targetWeight = toNumber(animal.poids_objectif ?? animal.poids_cible ?? animal.target_weight);
  const rawTargetMarginRate = toNumber(animal.marge_cible_pct || animal.target_margin_rate || 25);
  const status = clean(animal.status || animal.statut || 'actif');
  const isReadyOrClose = ['pret_a_la_vente', 'pret_vente', 'prêt vente', 'presque_pret', 'presque prêt'].includes(status) || Boolean(animal.ready_to_sell || animal.sale_ready || animal.pret_vente_recommande || animal.pret_vente_confirme);
  const targetMarginRate = isReadyOrClose ? Math.max(rawTargetMarginRate, 30) : rawTargetMarginRate;
  const pricePerKg = toNumber(animal.prix_kg_estime || animal.market_price_per_kg);
  const manualEstimate = toNumber(animal.prix_vente_estime || animal.estimated_sale_price);
  const realSalePrice = toNumber(animal.prix_vente_reel || animal.sale_price);
  const isReformed = status === 'reforme';

  const recommendedByCost = totalCost > 0 ? totalCost * (1 + targetMarginRate / 100) : 0;
  const recommendedByWeight = currentWeight > 0 && pricePerKg > 0 ? currentWeight * pricePerKg : 0;
  const manualIsTooLow = totalCost > 0 && manualEstimate > 0 && manualEstimate < recommendedByCost;
  const normalRecommendedPrice = Math.max(manualEstimate, recommendedByCost, recommendedByWeight);
  const reformDiscountRate = toNumber(animal.decote_reforme_pct || 15);
  const reformRecommendedPrice = normalRecommendedPrice > 0 ? normalRecommendedPrice * (1 - reformDiscountRate / 100) : 0;
  const recommendedSalePrice = isReformed && reformRecommendedPrice > 0 ? Math.max(reformRecommendedPrice, totalCost) : normalRecommendedPrice;
  const minimumAcceptablePrice = totalCost > 0 ? (isReformed ? totalCost : totalCost * 1.15) : 0;
  const liquidationPrice = isReformed ? recommendedSalePrice : 0;
  const expectedMargin = recommendedSalePrice > 0 ? recommendedSalePrice - totalCost : 0;
  const expectedMarginRate = totalCost > 0 ? (expectedMargin / totalCost) * 100 : 0;
  const realMargin = realSalePrice > 0 ? realSalePrice - totalCost : null;
  const realMarginRate = realSalePrice > 0 && totalCost > 0 ? (realMargin / totalCost) * 100 : 0;
  const negotiationGap = realSalePrice > 0 && recommendedSalePrice > 0 ? realSalePrice - recommendedSalePrice : null;
  const targetReached = targetWeight > 0 && currentWeight >= targetWeight;
  const targetProgress = targetWeight > 0 ? Math.min(100, Math.round((currentWeight / targetWeight) * 100)) : 0;

  let pricingStatus = 'a_definir';
  if (recommendedSalePrice > 0) pricingStatus = manualIsTooLow ? 'estimation_remontee_marge' : isReformed ? 'prix_liquidation_reforme' : 'prix_recommande';
  if (realSalePrice > 0 && realSalePrice < minimumAcceptablePrice) pricingStatus = 'vendu_sous_plancher';
  if (realSalePrice > 0 && recommendedSalePrice > 0 && realSalePrice >= minimumAcceptablePrice) pricingStatus = realSalePrice >= recommendedSalePrice ? 'vendu_objectif_atteint' : 'vendu_negocie';

  return {
    totalCost,
    currentWeight,
    targetWeight,
    targetMarginRate,
    pricePerKg,
    manualEstimate,
    manualIsTooLow,
    recommendedByCost,
    recommendedByWeight,
    normalRecommendedPrice,
    reformDiscountRate,
    reformRecommendedPrice,
    liquidationPrice,
    recommendedSalePrice,
    minimumAcceptablePrice,
    expectedMargin,
    expectedMarginRate,
    realSalePrice,
    realMargin,
    realMarginRate,
    negotiationGap,
    targetReached,
    targetProgress,
    pricingStatus,
    isReformed,
  };
};

export const getAnimalSaleReadiness = ({ animal = {}, metrics = {} } = {}) => {
  const pricing = calculateAnimalSalePricing({ animal, metrics });
  const healthOk = ['sain', 'a_surveiller'].includes(animal.health_status || 'sain');
  const statusOk = !['vendu', 'mort', 'vole'].includes(animal.status || 'actif');
  const reformSaleRecommended = animal.status === 'reforme' && pricing.recommendedSalePrice >= pricing.minimumAcceptablePrice && pricing.minimumAcceptablePrice > 0;
  const recommended = (pricing.targetReached && healthOk && statusOk) || reformSaleRecommended;

  return {
    ...pricing,
    healthOk,
    statusOk,
    recommended,
    status: reformSaleRecommended ? 'reforme_a_liquider' : recommended ? 'recommande_pret' : pricing.targetProgress >= 90 ? 'presque_pret' : 'non_pret',
    reason: reformSaleRecommended
      ? `Animal reforme: proposer un prix de liquidation sans descendre sous le cout total (${pricing.minimumAcceptablePrice.toFixed(0)} FCFA).`
      : pricing.targetWeight > 0
        ? recommended
          ? `Poids objectif atteint (${pricing.currentWeight} kg / ${pricing.targetWeight} kg). Prix recommande avec marge cible ${pricing.targetMarginRate.toFixed(0)}%.`
          : `Progression objectif: ${pricing.currentWeight} kg / ${pricing.targetWeight} kg (${pricing.targetProgress}%). ${healthOk ? 'Sante OK.' : 'Sante a verifier avant vente.'}`
        : 'Poids objectif non renseigne.',
  };
};
