import { fmtCurrency, fmtNumber, toNumber } from './format.js';
import { PRODUCTION_FINANCE_LABELS } from './productionFinancialTruth.js';

const MARGIN_ON_PROPOSED_LABEL = 'Marge sur prix proposé';
const MARGIN_ON_PROPOSED_FORMULA = 'prix proposé − coût unifié';

/** Libellé court pour la colonne marge alignée au prix proposé (liste / bandeau). */
export const PROPOSED_PRICE_MARGIN_LABEL = MARGIN_ON_PROPOSED_LABEL;

export function describeAnimalProposedPriceBasis(salePricing = {}) {
  const recommended = toNumber(salePricing.recommendedPrice);
  if (recommended <= 0) return '';

  const pricing = salePricing.pricing || {};
  const weight = toNumber(pricing.currentWeight);
  const perKg = toNumber(salePricing.configuredPricePerKg);
  const marketPerKg = toNumber(salePricing.marketPrice);
  const marketTotal = marketPerKg > 0 && weight > 0 ? marketPerKg * weight : marketPerKg;

  const candidates = [
    { value: marketTotal, text: marketPerKg > 0 ? `prix marché (${fmtCurrency(marketPerKg)}/kg)` : 'prix marché' },
    { value: toNumber(pricing.recommendedByWeight), text: weight > 0 && perKg > 0 ? `${fmtNumber(weight)} kg × ${fmtCurrency(perKg)}/kg` : 'poids × prix/kg Annexe' },
    { value: toNumber(pricing.recommendedByCost), text: `coût + marge cible ${fmtNumber(pricing.targetMarginRate || 0)}% (sur coût)` },
    { value: toNumber(pricing.manualEstimate), text: 'estimation saisie fiche' },
  ];

  const winner = candidates.filter((item) => item.value > 0).sort((a, b) => b.value - a.value)[0];
  return winner?.text || 'moteur commercial unifié';
}

export function describeAvicoleProposedPriceBasis(salePricing = {}, lot = {}) {
  const recommendedUnit = toNumber(salePricing.recommendedUnitPrice);
  if (recommendedUnit <= 0) return '';

  const layer = String(lot.type || '').toLowerCase().includes('pondeuse') || String(lot.type || '').toLowerCase().includes('ponte');
  const active = Math.max(1, toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count));
  const weight = toNumber(lot.weight_avg ?? lot.poids_moyen_actuel ?? lot.poids_moyen);
  const configured = toNumber(lot.prix_vente_estime ?? lot.prix_unitaire_vente ?? lot.unit_sale_price);
  const costPerBird = salePricing.totalCost > 0 ? salePricing.totalCost / active : 0;
  const market = toNumber(salePricing.marketPrice);

  const candidates = [
    { value: configured, text: 'prix estimé fiche' },
    { value: costPerBird > 0 && recommendedUnit > costPerBird ? recommendedUnit : 0, text: 'coût/sujet + marge cible (sur coût)' },
    { value: !layer && weight > 0 ? recommendedUnit : 0, text: `barème chair (${fmtNumber(weight)} kg)` },
    { value: market, text: layer ? 'prix marché œufs' : 'prix marché chair' },
  ];

  const winner = candidates.filter((item) => item.value > 0).sort((a, b) => b.value - a.value)[0];
  return winner?.text || (layer ? 'moteur lot pondeuses' : 'moteur poulets chair');
}

/**
 * Affichage liste / bandeau : prix proposé commercial et marge sur ce même prix.
 * Le revenu fiche ERP (commande ou estimation saisie) reste distinct dans l’onglet Finances.
 */
export function buildAnimalProposedSaleDisplay(salePricing = {}, erpCosts = {}) {
  const proposedPrice = toNumber(salePricing.recommendedPrice);
  const totalCost = toNumber(salePricing.totalCost ?? erpCosts.total);
  const marginOnProposed = proposedPrice > 0 && totalCost > 0 ? proposedPrice - totalCost : (proposedPrice > 0 ? proposedPrice - totalCost : null);
  const basis = describeAnimalProposedPriceBasis(salePricing);
  const erpRevenue = toNumber(erpCosts.sale);
  const erpMargin = erpCosts.marge;
  const erpSource = erpCosts.saleSource || '';
  const ficheDiverges = erpRevenue > 0 && proposedPrice > 0 && Math.abs(erpRevenue - proposedPrice) > 1;

  return {
    proposedPrice,
    minimumPrice: toNumber(salePricing.minimumPrice),
    totalCost,
    marginOnProposed,
    marginSource: proposedPrice > 0 ? MARGIN_ON_PROPOSED_FORMULA : '',
    pricingBasis: basis,
    erpRevenue,
    erpMargin,
    erpSource,
    ficheDiverges,
    ficheDivergeNote: ficheDiverges
      ? `Revenu fiche ${fmtCurrency(erpRevenue)} (${erpSource}) : mettre à jour la fiche ou utiliser le prix proposé ci-dessus.`
      : '',
  };
}

export function buildAvicoleProposedSaleDisplay(salePricing = {}, lot = {}) {
  const proposedTotal = toNumber(salePricing.recommendedTotalPrice);
  const proposedUnit = toNumber(salePricing.recommendedUnitPrice);
  const totalCost = toNumber(salePricing.totalCost);
  const marginOnProposed = proposedTotal > 0 ? proposedTotal - totalCost : null;

  return {
    proposedTotal,
    proposedUnit,
    minimumUnit: toNumber(salePricing.minimumUnitPrice),
    totalCost,
    marginOnProposed,
    marginSource: proposedTotal > 0 ? MARGIN_ON_PROPOSED_FORMULA : '',
    pricingBasis: describeAvicoleProposedPriceBasis(salePricing, lot),
  };
}

export const SALE_PRICE_HELP_ANIMAL = `Prix proposé = max(estimation fiche, coût unifié + marge cible % sur coût, poids × prix/kg Annexe, prix marché). ${MARGIN_ON_PROPOSED_LABEL} = prix proposé − coût unifié ERP. La marge cible est un taux sur le coût de revient (distinct du taux de marge sur chiffre d'affaires du module Finance).`;

export const SALE_PRICE_HELP_AVICOLE = `Prix proposé = max(prix fiche, coût/sujet + marge cible sur coût, barème chair ou marché). ${MARGIN_ON_PROPOSED_LABEL} = prix total proposé − coût unifié du lot. La marge cible est un taux sur le coût de revient (distinct du taux de marge sur chiffre d'affaires du module Finance).`;

export const ERP_REVENUE_LABEL = PRODUCTION_FINANCE_LABELS.revenue;
