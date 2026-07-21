import test from 'node:test';
import assert from 'node:assert/strict';
import { buildElevageActivityPnl, computeElevageRealizedMargin } from '../../src/utils/elevageActivityPnl.js';
import { buildElevageCockpitKpis } from '../../src/utils/elevageCockpitKpis.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

const context = {
  alimentationLogs: seed.alimentation_logs,
  feedLogs: seed.alimentation_logs,
  productionLogs: seed.production_oeufs_logs,
  healthEvents: seed.sante,
  vaccins: seed.sante,
  directCharges: seed.business_events,
  businessEvents: seed.business_events,
};

test('marge réalisée : ventes effectives, positive et plausible sur le seed', () => {
  const realized = computeElevageRealizedMargin({ animaux: seed.animaux, lots: seed.avicole, context });
  assert.ok(realized.count > 0, 'au moins une vente réalisée');
  assert.ok(realized.margin > 0, `marge réalisée positive (${realized.margin})`);
  const rate = realized.revenue > 0 ? (realized.margin / realized.revenue) * 100 : 0;
  assert.ok(rate > 0 && rate < 100, `taux de marge réaliste (${rate.toFixed(1)}%)`);
});

test('marge réalisée : exclut le cheptel vivant non vendu (pas de perte fantôme)', () => {
  // Un bovin vivant non vendu (revenue 0) coûte cher mais ne doit PAS peser sur la marge réalisée.
  const vivantSeul = computeElevageRealizedMargin({
    animaux: [{ id: 'A', type: 'Bovin', poids: 300, prix_achat: 250000 }],
    lots: [],
    context: {},
  });
  assert.equal(vivantSeul.count, 0);
  assert.equal(vivantSeul.margin, 0);
});

test('marge réalisée : un animal vendu est rapproché de son propre coût', () => {
  const r = computeElevageRealizedMargin({
    animaux: [{ id: 'A', type: 'Bovin', poids: 300, prix_achat: 200000, prix_vente_reel: 300000 }],
    lots: [],
    context: {},
  });
  assert.equal(r.count, 1);
  assert.equal(r.revenue, 300000);
  assert.equal(r.margin, 300000 - r.cost);
  assert.ok(r.cost >= 200000, 'le coût inclut au moins le prix d\'achat');
});

test('KPI cockpit : la marge réalisée remplace la rentabilité globale trompeuse', () => {
  const pnl = buildElevageActivityPnl({
    lots: seed.avicole,
    animaux: seed.animaux,
    feedLogs: seed.alimentation_logs,
    productionLogs: seed.production_oeufs_logs,
    healthEvents: seed.sante,
    businessEvents: seed.business_events,
    salesOrders: seed.sales_orders,
  });
  assert.ok(pnl.totals.realizedMargin > 0, 'marge réalisée positive dans les totaux');
  const kpis = buildElevageCockpitKpis({ productionSnapshot: {}, activityPnl: pnl, animals: seed.animaux, lots: seed.avicole });
  const profit = kpis.find((k) => k.id === 'profitability');
  assert.equal(profit.label, 'Marge réalisée (ventes)');
  assert.doesNotMatch(profit.value, /-\d/, `pas de marge négative trompeuse (${profit.value})`);
});
