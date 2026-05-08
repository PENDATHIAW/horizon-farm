const toNumber = (value) => Number(value || 0) || 0;

export const calculateAnimalSalePricing = ({ animal = {}, metrics = {} } = {}) => {
  const totalCost = toNumber(metrics.totalCost);
  const currentWeight = toNumber(animal.poids);
  const targetWeight = toNumber(animal.poids_objectif);
  const targetMarginRate = toNumber(animal.marge_cible_pct || animal.target_margin_rate || 25);
  const pricePerKg = toNumber(animal.prix_kg_estime || animal.market_price_per_kg);
  const manualEstimate = toNumber(animal.prix_vente_estime || animal.estimated_sale_price);
  const realSalePrice = toNumber(animal.prix_vente_reel || animal.sale_price);
  const isReformed = animal.status === 'reforme';

  const recommendedByCost = totalCost > 0 ? totalCost * (1 + targetMarginRate / 100) : 0;
  const recommendedByWeight = currentWeight > 0 && pricePerKg > 0 ? currentWeight * pricePerKg : 0;
  const normalRecommendedPrice = manualEstimate || Math.max(recommendedByCost, recommendedByWeight);
  const reformDiscountRate = toNumber(animal.decote_reforme_pct || 15);
  const reformRecommendedPrice = normalRecommendedPrice > 0 ? normalRecommendedPrice * (1 - reformDiscountRate / 100) : 0;
  const recommendedSalePrice = isReformed && reformRecommendedPrice > 0 ? Math.max(reformRecommendedPrice, totalCost) : normalRecommendedPrice;
  const minimumAcceptablePrice = totalCost > 0 ? (isReformed ? totalCost : totalCost * 1.1) : 0;
  const liquidationPrice = isReformed ? recommendedSalePrice : 0;
  const expectedMargin = recommendedSalePrice > 0 ? recommendedSalePrice - totalCost : 0;
  const expectedMarginRate = totalCost > 0 ? (expectedMargin / totalCost) * 100 : 0;
  const realMargin = realSalePrice > 0 ? realSalePrice - totalCost : null;
  const realMarginRate = realSalePrice > 0 && totalCost > 0 ? (realMargin / totalCost) * 100 : 0;
  const negotiationGap = realSalePrice > 0 && recommendedSalePrice > 0 ? realSalePrice - recommendedSalePrice : null;
  const targetReached = targetWeight > 0 && currentWeight >= targetWeight;
  const targetProgress = targetWeight > 0 ? Math.min(100, Math.round((currentWeight / targetWeight) * 100)) : 0;

  let pricingStatus = 'a_definir';
  if (recommendedSalePrice > 0) pricingStatus = isReformed ? 'prix_liquidation_reforme' : 'prix_recommande';
  if (realSalePrice > 0 && realSalePrice < minimumAcceptablePrice) pricingStatus = 'vendu_sous_plancher';
  if (realSalePrice > 0 && recommendedSalePrice > 0 && realSalePrice >= minimumAcceptablePrice) pricingStatus = realSalePrice >= recommendedSalePrice ? 'vendu_objectif_atteint' : 'vendu_negocie';

  return {
    totalCost,
    currentWeight,
    targetWeight,
    targetMarginRate,
    pricePerKg,
    manualEstimate,
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
          ? `Poids objectif atteint (${pricing.currentWeight} kg / ${pricing.targetWeight} kg). Recommande pour opportunite de vente.`
          : `Progression objectif: ${pricing.currentWeight} kg / ${pricing.targetWeight} kg (${pricing.targetProgress}%). ${healthOk ? 'Sante OK.' : 'Sante a verifier avant vente.'}`
        : 'Poids objectif non renseigne.',
  };
};
