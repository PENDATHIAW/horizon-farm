import test from 'node:test';
import assert from 'node:assert/strict';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { SIMULATED_DATA_MODE_KEY, setSimulatedDataMode } from '../../src/utils/uiPreferences.js';
import { createSupabaseCrudService } from '../../src/services/baseSupabaseService.js';
import { setupTestStorage } from './helpers/moduleTabTestHarness.js';

setupTestStorage();

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.window.dispatchEvent !== 'function') {
  globalThis.window.dispatchEvent = () => {};
}

test('activation mode simulé recharge les seeds après marquage supprimé', async () => {
  const seedIds = (horizonFarmSimulationSeed.finances || []).map((row) => row.id);
  globalThis.localStorage.setItem('horizon_simulated_deleted:finances', JSON.stringify(seedIds));

  setSimulatedDataMode(true);

  const financesSvc = createSupabaseCrudService('finances');
  const rows = await financesSvc.getAll();
  assert.ok(rows.length > 0, 'les finances simulées doivent réapparaître après activation');
  assert.equal(globalThis.localStorage.getItem(SIMULATED_DATA_MODE_KEY), '1');
});

test('getModuleSeedRows conserve les données de démonstration', async () => {
  const { getModuleSeedRows } = await import('../../src/utils/mockData.js');
  assert.ok(getModuleSeedRows('clients').length > 0);
  assert.ok(getModuleSeedRows('sales_orders').length > 0);
});
