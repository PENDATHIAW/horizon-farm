import test from 'node:test';
import assert from 'node:assert/strict';
import { ORGALOOP_EFFLUENT_CHANNEL } from '../../src/config/derfjGreenpreneurs.config.js';
import {
  isOrgaloopTagged,
  isEffluentProduct,
  isOrgaloopEffluentSale,
  computeOrgaloopEffluentMetrics,
  buildOrgaloopEffluentOpportunity,
  ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE,
} from '../../src/services/greenpreneurs/orgaloopEffluentChannel.js';
import { computeCircularEconomyMetrics } from '../../src/services/greenpreneurs/circularEconomyMetrics.js';
import { buildGreenpreneursCentreAlerts } from '../../src/services/greenpreneurs/greenpreneursMetrics.js';

test('ORGALOOP_EFFLUENT_CHANNEL — stratégie vente directe', () => {
  assert.equal(ORGALOOP_EFFLUENT_CHANNEL.strategy, 'vente_directe_orgaloop');
  assert.equal(ORGALOOP_EFFLUENT_CHANNEL.platformName, 'Orgaloop');
});

test('isOrgaloopTagged — détecte canal Orgaloop', () => {
  assert.equal(isOrgaloopTagged({ canal: 'orgaloop' }), true);
  assert.equal(isOrgaloopTagged({ marketplace: 'Orgaloop' }), true);
  assert.equal(isOrgaloopTagged({ canal: 'marché local' }), false);
});

test('isEffluentProduct — fumier et fientes', () => {
  assert.equal(isEffluentProduct({ product_name: 'Fumier bovin' }), true);
  assert.equal(isEffluentProduct({ libelle: 'Fientes pondeuses' }), true);
  assert.equal(isEffluentProduct({ product_name: 'Poulet chair' }), false);
});

test('isOrgaloopEffluentSale — effluent + stratégie Orgaloop', () => {
  assert.equal(isOrgaloopEffluentSale({ product_name: 'Fumier', canal: 'orgaloop' }), true);
  assert.equal(isOrgaloopEffluentSale({ product_name: 'Fumier bovin' }), true);
  assert.equal(isOrgaloopEffluentSale({ product_name: 'Poulet', canal: 'orgaloop' }), false);
});

test('computeOrgaloopEffluentMetrics — ventes et events', () => {
  const metrics = computeOrgaloopEffluentMetrics({
    sales_orders: [
      { id: 's1', product_name: 'Fumier bovin', canal: 'orgaloop', fumier_sacs: 10, montant_total: 50000 },
    ],
    business_events: [
      { event_type: 'effluent_vendu_orgaloop', quantity: 50, montant: 10000 },
    ],
    payments: [{ sale_id: 's1', montant_paye: 50000 }],
  });
  assert.ok(metrics.soldKg >= 300);
  assert.equal(metrics.revenueFcfa, 60000);
  assert.equal(metrics.encaisseFcfa, 50000);
  assert.equal(metrics.salesCount, 1);
  assert.equal(metrics.isPrimaryChannel, true);
});

test('buildOrgaloopEffluentOpportunity — canal marketplace', () => {
  const opp = buildOrgaloopEffluentOpportunity({ profile: 'bovins', sacs: 5, stockId: 'st1' });
  assert.match(opp.title, /Orgaloop/);
  assert.equal(opp.canal, 'orgaloop');
  assert.equal(opp.marketplace, 'orgaloop');
  assert.equal(opp.statut_activite, 'vente_orgaloop');
});

test('ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE — pipeline commercial', () => {
  assert.equal(ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE.canal, 'orgaloop');
  assert.match(ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE.notes, /Orgaloop/);
});

test('circular economy — inclut orgaloop et score vente plateforme', () => {
  const circular = computeCircularEconomyMetrics({
    business_events: [
      { event_type: 'effluent_produit', quantity: 200 },
      { event_type: 'effluent_vendu_orgaloop', quantity: 150, montant: 30000 },
    ],
    sales_orders: [
      { product_name: 'Fientes', canal: 'orgaloop', quantite: 4, unite: 'sac', montant_total: 20000 },
    ],
  });
  assert.equal(circular.orgaloopPrimary, true);
  assert.ok(circular.orgaloop.soldKg > 0);
  assert.ok(circular.circularityScore >= 60);
});

test('centre alerts — Orgaloop remplace alerte fertilisation', () => {
  const fertilisationAlerts = buildGreenpreneursCentreAlerts({
    circular: {
      orgaloopPrimary: true,
      orgaloop: { platformName: 'Orgaloop', soldKg: 0, revenueFcfa: 0, salesCount: 0 },
      fumierBovin: { availableKg: 500 },
      fientesPondeuses: { availableKg: 200 },
      compost: { availableKg: 0 },
      usedOnCulturesKg: 0,
      parcellesFertilisees: 0,
      fertilisantStockKg: 600,
      engraisSavingsFcfa: 10000,
      hasRealData: true,
    },
    valorisation: { phase2_tallow_go: { status: 'non_pret', nextActions: [] } },
  });
  assert.ok(!fertilisationAlerts.some((a) => a.id === 'gp-fumier-non-valorise'));
  assert.ok(fertilisationAlerts.some((a) => a.id === 'gp-effluent-a-publier-orgaloop'));

  const soldAlerts = buildGreenpreneursCentreAlerts({
    circular: {
      orgaloopPrimary: true,
      orgaloop: { platformName: 'Orgaloop', soldKg: 400, revenueFcfa: 80000, salesCount: 2 },
      fumierBovin: { availableKg: 500 },
      fientesPondeuses: { availableKg: 0 },
      compost: { availableKg: 0 },
      usedOnCulturesKg: 0,
      parcellesFertilisees: 0,
      fertilisantStockKg: 0,
      engraisSavingsFcfa: 0,
      hasRealData: true,
    },
    valorisation: { phase2_tallow_go: { status: 'non_pret', nextActions: [] } },
  });
  assert.ok(soldAlerts.some((a) => a.id === 'gp-orgaloop-ventes-trackees'));
});
