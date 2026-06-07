import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardHealthReport, resetDashboardHealthCacheForTests } from '../../src/modules/dashboard/dashboardHealthCache.js';

test('P-14: cache Santé ERP réutilise le rapport pour la même empreinte', () => {
  resetDashboardHealthCacheForTests();
  const buildData = () => ({
    sales_orders: [],
    payments: [],
    finances: [],
    stock: [],
    animaux: [],
    avicole: [],
    taches: [],
    alertes_center: [],
  });

  const first = getDashboardHealthReport('fp-cache-test', buildData);
  const second = getDashboardHealthReport('fp-cache-test', buildData);

  assert.equal(first.score, second.score);
  assert.strictEqual(first, second);

  const third = getDashboardHealthReport('fp-cache-other', buildData);
  assert.notStrictEqual(third, first);

  resetDashboardHealthCacheForTests();
});
