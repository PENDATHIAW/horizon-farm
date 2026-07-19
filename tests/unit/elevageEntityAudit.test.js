import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';
import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../../src/services/unifiedCostService.js';
import { recommendAnimalSalePrice, recommendAvicoleLotPrice } from '../../src/services/salePricingEngine.js';
import { isDirectExtraCharge, isRevenueMovement } from '../../src/utils/costEngine.js';
import { revenueOfLot } from '../../src/utils/elevageActivityPnl.js';

const ctx = {
  alimentationLogs: seed.alimentation_logs,
  feedLogs: seed.alimentation_logs,
  productionLogs: seed.production_oeufs_logs,
  healthEvents: seed.sante,
  vaccins: seed.sante,
  directCharges: seed.business_events,
  businessEvents: seed.business_events,
};
const isPonte = (l) => /pondeuse|ponte/.test(String(l.type || '').toLowerCase());

test('un mouvement de vente/revenu n\'est jamais compté comme une charge', () => {
  const sale = { event_type: 'sortie_vente_elevage', title: 'Vente enregistrée : Œufs plateaux', montant: 1919000, target_id: 'HF-PO-001' };
  assert.equal(isRevenueMovement(sale), true);
  assert.equal(isDirectExtraCharge(sale), false);
  // Une vraie charge directe reste bien détectée.
  assert.equal(isDirectExtraCharge({ event_type: 'charge_directe', title: 'Emballages et transport œufs', montant: 42500 }), true);
});

test('tous les ANIMAUX : coût > 0, coût/kg plausible, marge proposée saine', () => {
  for (const a of seed.animaux) {
    const u = calculateUnifiedAnimalCost({ animal: a, ...ctx });
    assert.ok(Number.isFinite(u.totalCost) && u.totalCost > 0, `${a.id} coût non nul`);
    if (a.poids > 0) {
      const perKg = u.totalCost / a.poids;
      assert.ok(perKg > 0 && perKg < 3500, `${a.id} coût/kg plausible (${Math.round(perKg)})`);
    }
    const rec = recommendAnimalSalePrice({ animal: a, alimentationLogs: seed.alimentation_logs, healthEvents: seed.sante });
    assert.ok(Number.isFinite(rec.recommendedPrice), `${a.id} prix fini`);
    // Le prix/kg de référence est un prix POIDS VIF (<= 2 000), jamais un prix
    // carcasse (ex. ancien 2 800/kg qui gonflait le bovin à 868 000).
    assert.ok(rec.configuredPricePerKg <= 2000, `${a.id} prix/kg de référence en poids vif (${rec.configuredPricePerKg})`);
    if (rec.recommendedPrice > 0) {
      // Le prix proposé reste borné par le max(coût + marge, poids x prix vif) :
      // il ne peut pas exploser via un prix carcasse appliqué au poids vif.
      const cap = Math.max(rec.totalCost * 1.6, a.poids * 2000) + 1;
      assert.ok(rec.recommendedPrice <= cap, `${a.id} prix proposé borné (${rec.recommendedPrice} <= ${Math.round(cap)})`);
    }
  }
});

test('tous les LOTS : coût fini et sans revenu compté en charge', () => {
  for (const l of seed.avicole) {
    const u = calculateUnifiedLotCost({ lot: l, ...ctx });
    assert.ok(Number.isFinite(u.totalCost) && u.totalCost > 0, `${l.id} coût non nul`);
    // Le coût pondeuse ne doit PAS avaler le CA œufs (bug ventes-en-charges : 3,95 M).
    if (isPonte(l)) {
      assert.ok(u.totalCost < 1500000, `${l.id} coût pondeuse assaini (${Math.round(u.totalCost)})`);
    }
  }
});

test('CHAIR : le CA du lot = sujets vendus x prix/tête (pas le prix unitaire seul)', () => {
  const ch1 = seed.avicole.find((l) => l.id === 'HF-CH-001');
  assert.ok(ch1 && ch1.vendus > 0);
  assert.equal(revenueOfLot(ch1), ch1.vendus * ch1.prix_vente_reel);
  assert.ok(revenueOfLot(ch1) > 100000, 'CA chair réaliste (pas 3 800)');
  // Lot non vendu : aucun CA réalisé.
  const ch3 = seed.avicole.find((l) => l.id === 'HF-CH-003');
  assert.equal(revenueOfLot(ch3), 0);
});

test('PONDEUSE : prix proposé = valeur de réforme (pas prix viande x effectif)', () => {
  const po = seed.avicole.find((l) => l.id === 'HF-PO-001');
  const rec = recommendAvicoleLotPrice({ lot: po, alimentationLogs: seed.alimentation_logs, productionLogs: seed.production_oeufs_logs, healthEvents: seed.sante });
  assert.equal(rec.saleBasis, 'reforme_pondeuses');
  const active = po.current_count;
  assert.ok(rec.recommendedUnitPrice <= 3000, `réforme/poule réaliste (${rec.recommendedUnitPrice})`);
  assert.equal(rec.recommendedTotalPrice, rec.recommendedUnitPrice * active);
});
