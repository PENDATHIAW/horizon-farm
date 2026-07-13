import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGrowthScenarioRecord,
  calculateGrowthScenario,
  nextScenarioVersion,
} from '../../src/services/growthScenarioService.js';

const assumptions = {
  targetSubjects: 100,
  durationDays: 90,
  feedPerSubjectDayKg: 0.12,
  salePricePerSubject: 6500,
  otherCostPerSubject: 1200,
};

const context = {
  feedPriceKg: 300,
  availableCash: 500000,
  minimumCash: 100000,
  buildingCapacity: 150,
  teamCapacity: 120,
  equipmentCapacity: 130,
};

test('le scénario calcule tous les résultats exigés hors du composant React', () => {
  const result = calculateGrowthScenario(assumptions, context);
  assert.equal(result.feedNeedKg, 1080);
  assert.equal(result.projectedRevenue, 650000);
  assert.equal(result.projectedProfit, 206000);
  assert.equal(result.projectedCash, 706000);
  assert.equal(result.capacities.buildings.usagePercent, 66.7);
  assert.equal(result.capacities.team.usagePercent, 83.3);
  assert.equal(result.capacities.equipment.usagePercent, 76.9);
  assert.equal(result.sustainabilityThreshold, 100000);
  assert.equal(result.sustainable, true);
});

test('le seuil de soutenabilité bloque une capacité dépassée', () => {
  const result = calculateGrowthScenario({ ...assumptions, targetSubjects: 200 }, context);
  assert.equal(result.checks.capacitySustainable, false);
  assert.equal(result.sustainable, false);
});

test('les versions sont séquentielles par ferme et scénario', () => {
  const rows = [
    { scenario_key: 'croissance', version: 1 },
    { scenario_key: 'croissance', version: 3 },
    { scenario_key: 'autre', version: 8 },
  ];
  assert.equal(nextScenarioVersion(rows, 'croissance'), 4);
  const record = buildGrowthScenarioRecord({ assumptions, context, existingRows: rows, farmId: 'farm-1', userId: 'user-1' });
  assert.equal(record.version, 4);
  assert.equal(record.farm_id, 'farm-1');
  assert.deepEqual(record.assumptions, assumptions);
  assert.equal(record.results.sustainable, true);
});
