import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSaleReadyOpportunity, isSaleReadyConfirmed } from '../../src/services/workflows/poultryWorkflowService.js';

test('isSaleReadyConfirmed reconnaît pret_vente_confirme', () => {
  assert.equal(isSaleReadyConfirmed({ pret_vente_confirme: true }), true);
  assert.equal(isSaleReadyConfirmed({ status: 'actif' }), false);
});

test('syncSaleReadyOpportunity crée payload si prêt confirmé', () => {
  const result = syncSaleReadyOpportunity({
    record: { id: 'L1', name: 'Lot chair', type: 'Chair', pret_vente_confirme: true, current_count: 100 },
    previous: { id: 'L1', status: 'actif' },
    opportunities: [],
    metrics: { count: 100, unitPrice: 2500, grossRevenue: 250000 },
    decision: { score: 90, reason: 'Poids atteint' },
  });
  assert.equal(result.created, true);
  assert.equal(result.payload.source_id, 'L1');
});

test('syncSaleReadyOpportunity ignore doublon opportunité', () => {
  const result = syncSaleReadyOpportunity({
    record: { id: 'L1', pret_vente_confirme: true },
    previous: {},
    opportunities: [{ id: 'OPP1', source_id: 'L1', source_type: 'lot_avicole', status: 'proposee' }],
  });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'exists');
});
