import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCommercialKpis } from '../../src/services/kpiEngine/commercialKpis.js';

test('CA commercial ne mélange pas payments', () => {
  const kpis = computeCommercialKpis(
    [{ id: 'O1', montant_total: 10000 }],
    [{ id: 'P1', order_id: 'O1', montant: 5000 }],
  );
  assert.equal(kpis.ca, 10000);
  assert.equal(kpis.collected, 5000);
  assert.equal(kpis.sources.ca, 'sales_orders');
});

test('computeCommercialKpis retourne orderCount', () => {
  const kpis = computeCommercialKpis([{ id: 'O1', montant_total: 1000 }], []);
  assert.equal(kpis.orderCount, 1);
  assert.equal(kpis.receivable, 1000);
});
