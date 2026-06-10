import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnimalProposedSaleDisplay,
  buildAvicoleProposedSaleDisplay,
  describeAnimalProposedPriceBasis,
  PROPOSED_PRICE_MARGIN_LABEL,
} from '../../src/utils/salePricePresentation.js';

test('buildAnimalProposedSaleDisplay — marge alignée au prix proposé', () => {
  const salePricing = {
    recommendedPrice: 868000,
    minimumPrice: 384100,
    totalCost: 334000,
    configuredPricePerKg: 2800,
    marketPrice: null,
    pricing: {
      currentWeight: 310,
      targetMarginRate: 30,
      recommendedByWeight: 868000,
      recommendedByCost: 434200,
      manualEstimate: 365000,
    },
  };
  const erpCosts = { total: 334000, sale: 365000, marge: 31000, saleSource: 'revenu fiche (estimé)' };
  const display = buildAnimalProposedSaleDisplay(salePricing, erpCosts);

  assert.equal(display.proposedPrice, 868000);
  assert.equal(display.marginOnProposed, 534000);
  assert.equal(display.erpMargin, 31000);
  assert.equal(display.ficheDiverges, true);
  assert.match(display.pricingBasis, /kg/);
});

test('describeAnimalProposedPriceBasis — indique la composante dominante', () => {
  const basis = describeAnimalProposedPriceBasis({
    recommendedPrice: 500000,
    configuredPricePerKg: 2500,
    marketPrice: null,
    pricing: {
      currentWeight: 200,
      targetMarginRate: 25,
      recommendedByWeight: 500000,
      recommendedByCost: 400000,
      manualEstimate: 0,
    },
  });
  assert.match(basis, /kg/);
});

test('buildAvicoleProposedSaleDisplay — marge sur prix total proposé', () => {
  const lot = { type: 'Chair', current_count: 100, weight_avg: 1.8 };
  const salePricing = {
    recommendedTotalPrice: 350000,
    recommendedUnitPrice: 3500,
    minimumUnitPrice: 2800,
    totalCost: 280000,
    marketPrice: 3500,
  };
  const display = buildAvicoleProposedSaleDisplay(salePricing, lot);
  assert.equal(display.marginOnProposed, 70000);
  assert.equal(display.proposedTotal, 350000);
});

test('PROPOSED_PRICE_MARGIN_LABEL est défini pour colonnes UI', () => {
  assert.equal(PROPOSED_PRICE_MARGIN_LABEL, 'Marge sur prix proposé');
});
