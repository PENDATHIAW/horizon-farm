import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESSENTIAL_KPI_LIMIT,
  selectEssentialKpiKeys,
} from '../../src/modules/dashboard/dashboardAccueilLayout.js';

test('ESSENTIAL_KPI_LIMIT — au plus 6 KPI au premier écran', () => {
  assert.equal(ESSENTIAL_KPI_LIMIT, 6);
});

test('selectEssentialKpiKeys — ordre trésorerie, CA, créances, stock', () => {
  const keys = selectEssentialKpiKeys({
    receivable: 1000,
    cultureSummary: { hasData: true, parcelCount: 2 },
  });
  assert.equal(keys[0], 'cashNet');
  assert.equal(keys[1], 'ca');
  assert.equal(keys[2], 'receivable');
  assert.equal(keys[3], 'stock');
  assert.ok(keys.length <= ESSENTIAL_KPI_LIMIT);
});

test('selectEssentialKpiKeys — production ou cultures selon activité', () => {
  const withEggs = selectEssentialKpiKeys({
    eggProduction: { eggsPeriod: 100 },
    headcount: { effectifPondeuses: 50 },
  });
  assert.ok(withEggs.includes('production'));

  const withCultures = selectEssentialKpiKeys({
    cultureSummary: { hasData: true, parcelCount: 3 },
  });
  assert.ok(withCultures.includes('production') || withCultures.includes('cultures'));
});
