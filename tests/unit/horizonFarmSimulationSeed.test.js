import test from 'node:test';
import assert from 'node:assert/strict';

test('horizonFarmSimulationSeed — charge sans ReferenceError', async () => {
  const mod = await import('../../src/utils/horizonFarmSimulationSeed.js');
  assert.ok(mod.horizonFarmSimulationSeed);
  assert.ok(Array.isArray(mod.horizonFarmSimulationSeed.animaux));
  assert.ok(Array.isArray(mod.horizonFarmSimulationSeed.avicole));
});
