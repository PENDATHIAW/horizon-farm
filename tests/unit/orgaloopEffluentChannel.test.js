import test from 'node:test';
import assert from 'node:assert/strict';
import { ORGALOOP_EFFLUENT_CHANNEL } from '../../src/config/derfjGreenpreneurs.config.js';
import {
  isOrgaloopTagged,
  isEffluentProduct,
  isOrgaloopEffluentSale,
  isOrgaloopHybridStrategy,
  computeOrgaloopEffluentMetrics,
  computeEffluentSurplusKg,
  isEventLinkedToCountedSale,
  buildOrgaloopEffluentOpportunity,
  ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE,
} from '../../src/services/greenpreneurs/orgaloopEffluentChannel.js';
import {
  ensureOrgaloopEffluentOpportunity,
  enhanceManureWorkflowForOrgaloop,
  emitOrgaloopEffluentSaleSideEffects,
} from '../../src/services/greenpreneurs/orgaloopEffluentWorkflow.js';
import { computeCircularEconomyMetrics } from '../../src/services/greenpreneurs/circularEconomyMetrics.js';
import { buildGreenpreneursCentreAlerts } from '../../src/services/greenpreneurs/greenpreneursMetrics.js';

test('ORGALOOP_EFFLUENT_CHANNEL — stratégie hybride DER/FJ', () => {
  assert.equal(ORGALOOP_EFFLUENT_CHANNEL.strategy, 'hybride_surplus_orgaloop');
  assert.equal(ORGALOOP_EFFLUENT_CHANNEL.platformName, 'Orgaloop');
  assert.equal(ORGALOOP_EFFLUENT_CHANNEL.internalFertilizationPriority, true);
  assert.equal(isOrgaloopHybridStrategy(), true);
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

test('isOrgaloopEffluentSale — uniquement si canal Orgaloop explicite', () => {
  assert.equal(isOrgaloopEffluentSale({ product_name: 'Fumier', canal: 'orgaloop' }), true);
  assert.equal(isOrgaloopEffluentSale({ product_name: 'Fumier bovin' }), false);
  assert.equal(isOrgaloopEffluentSale({ product_name: 'Poulet', canal: 'orgaloop' }), false);
});

test('computeOrgaloopEffluentMetrics — déduplique vente + event lié', () => {
  const metrics = computeOrgaloopEffluentMetrics({
    sales_orders: [
      { id: 's1', product_name: 'Fumier bovin', canal: 'orgaloop', fumier_sacs: 10, montant_total: 50000 },
    ],
    business_events: [
      { event_type: 'effluent_vendu_orgaloop', source_record_id: 's1', entity_id: 's1', quantity: 250, montant: 50000 },
    ],
    payments: [{ sale_id: 's1', montant_paye: 50000 }],
  });
  assert.equal(metrics.soldKg, 250);
  assert.equal(metrics.revenueFcfa, 50000);
  assert.equal(metrics.encaisseFcfa, 50000);
  assert.equal(metrics.salesCount, 1);
  assert.equal(metrics.deduplicatedEventsCount, 1);
  assert.equal(metrics.orphanEventsCount, 0);
  assert.equal(metrics.isHybridStrategy, true);
});

test('computeOrgaloopEffluentMetrics — compte event orphelin sans sales_order', () => {
  const metrics = computeOrgaloopEffluentMetrics({
    sales_orders: [],
    business_events: [
      { event_type: 'effluent_vendu_orgaloop', quantity: 50, montant: 10000 },
    ],
  });
  assert.equal(metrics.soldKg, 50);
  assert.equal(metrics.revenueFcfa, 10000);
  assert.equal(metrics.salesCount, 0);
  assert.equal(metrics.orphanEventsCount, 1);
});

test('isEventLinkedToCountedSale — détecte liaison order', () => {
  const ids = new Set(['ord1']);
  assert.equal(isEventLinkedToCountedSale({ source_record_id: 'ord1' }, ids), true);
  assert.equal(isEventLinkedToCountedSale({ entity_id: 'ord1' }, ids), true);
  assert.equal(isEventLinkedToCountedSale({ quantity: 10 }, ids), false);
});

test('computeEffluentSurplusKg — après cultures et ventes', () => {
  const surplus = computeEffluentSurplusKg({
    fumierBovin: { availableKg: 500 },
    fientesPondeuses: { availableKg: 200 },
    compost: { availableKg: 0 },
    usedOnCulturesKg: 300,
    orgaloop: { soldKg: 100 },
  });
  assert.equal(surplus, 300);
});

test('buildOrgaloopEffluentOpportunity — canal marketplace surplus', () => {
  const opp = buildOrgaloopEffluentOpportunity({ profile: 'bovins', sacs: 5, stockId: 'st1' });
  assert.match(opp.title, /Orgaloop/);
  assert.match(opp.title, /surplus/i);
  assert.equal(opp.canal, 'orgaloop');
});

test('ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE — pipeline commercial', () => {
  assert.equal(ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE.canal, 'orgaloop');
  assert.match(ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE.notes, /surplus/i);
});

test('circular economy — hybride cultures + orgaloop', () => {
  const circular = computeCircularEconomyMetrics({
    business_events: [
      { event_type: 'effluent_produit', quantity: 200 },
      { event_type: 'effluent_utilise_culture', quantity: 80, entity_id: 'p1' },
      { event_type: 'effluent_vendu_orgaloop', source_record_id: 's1', quantity: 100, montant: 20000 },
    ],
    sales_orders: [
      { id: 's1', product_name: 'Fientes', canal: 'orgaloop', quantite: 4, unite: 'sac', montant_total: 20000 },
    ],
  });
  assert.equal(circular.orgaloopHybrid, true);
  assert.equal(circular.orgaloopPrimary, false);
  assert.equal(circular.orgaloop.soldKg, 100);
  assert.equal(circular.orgaloop.revenueFcfa, 20000);
  assert.ok(circular.usedOnCulturesKg > 0);
});

test('enhanceManureWorkflowForOrgaloop — opportunité hybride', () => {
  const base = {
    stockId: 'st1',
    profile: { profile: 'bovins', label: 'Fumier bœufs' },
    stock: { quantite: 10, prix_unitaire: 5000 },
    event: { fumier_sacs: 3, date: '2026-06-09', source_id: 'int1' },
    opportunity: { id: 'opp1' },
  };
  const enhanced = enhanceManureWorkflowForOrgaloop(base, { profileMeta: { profile: 'bovins' } });
  assert.equal(enhanced.orgaloopEnhanced, true);
  assert.equal(enhanced.opportunity.canal, 'orgaloop');
  assert.match(enhanced.opportunity.notes, /cultures/i);
});

test('emitOrgaloopEffluentSaleSideEffects — event vente', async () => {
  const created = [];
  const result = await emitOrgaloopEffluentSaleSideEffects({
    order: { id: 'ord1', product_name: 'Fumier bovin', quantity: 4, unit: 'sac', montant_total: 20000, date: '2026-06-09' },
    items: [],
    form: { canal: 'orgaloop' },
    handlers: {
      onCreateBusinessEvent: async (evt) => { created.push(evt); },
    },
    context: { business_events: [] },
  });
  assert.equal(result.emitted, true);
  assert.equal(created[0].event_type, 'effluent_vendu_orgaloop');
});

test('ensureOrgaloopEffluentOpportunity — idempotent', async () => {
  const existing = [{ id: 'o1', canal: 'orgaloop', created_from: 'orgaloop_effluent_channel' }];
  const created = await ensureOrgaloopEffluentOpportunity({
    opportunities: existing,
    handlers: { onCreateOpportunity: async () => { throw new Error('should not create'); } },
  });
  assert.equal(created.id, 'o1');
});

test('centre alerts — hybride priorité cultures + surplus Orgaloop', () => {
  const hybridAlerts = buildGreenpreneursCentreAlerts({
    circular: {
      orgaloopHybrid: true,
      orgaloopPrimary: false,
      effluentSurplusKg: 250,
      orgaloop: { platformName: 'Orgaloop', soldKg: 0, revenueFcfa: 0, salesCount: 0 },
      fumierBovin: { availableKg: 500 },
      fientesPondeuses: { availableKg: 200 },
      compost: { availableKg: 0 },
      usedOnCulturesKg: 50,
      parcellesFertilisees: 0,
      fertilisantStockKg: 600,
      engraisSavingsFcfa: 10000,
      hasRealData: true,
    },
  });
  assert.ok(hybridAlerts.some((a) => a.id === 'gp-fumier-priorite-cultures'));
  assert.ok(hybridAlerts.some((a) => a.id === 'gp-surplus-orgaloop'));
  assert.ok(!hybridAlerts.some((a) => a.id === 'gp-effluent-a-publier-orgaloop'));

  const soldAlerts = buildGreenpreneursCentreAlerts({
    circular: {
      orgaloopHybrid: true,
      orgaloop: { platformName: 'Orgaloop', soldKg: 400, revenueFcfa: 80000, salesCount: 2 },
      fumierBovin: { availableKg: 500 },
      usedOnCulturesKg: 200,
      effluentSurplusKg: 0,
      parcellesFertilisees: 1,
      fertilisantStockKg: 0,
      engraisSavingsFcfa: 50000,
      hasRealData: true,
    },
  });
  assert.ok(soldAlerts.some((a) => a.id === 'gp-orgaloop-ventes-trackees'));
});
