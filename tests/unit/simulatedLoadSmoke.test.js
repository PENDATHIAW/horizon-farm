import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseCrudService } from '../../src/services/baseSupabaseService.js';
import { setSimulatedDataMode, isSimulatedDataModeEnabled } from '../../src/utils/uiPreferences.js';
import { setupTestStorage } from './helpers/moduleTabTestHarness.js';

setupTestStorage();

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.window.dispatchEvent !== 'function') {
  globalThis.window.dispatchEvent = () => {};
}

test('mode simulé charge les seeds sales_orders et stock', async () => {
  setSimulatedDataMode(true);
  assert.equal(isSimulatedDataModeEnabled(), true);

  const sales = await createSupabaseCrudService('sales_orders').getAll();
  const stocks = await createSupabaseCrudService('stock').getAll();
  const avicole = await createSupabaseCrudService('avicole').getAll();

  assert.ok(sales.length > 0, `sales_orders: ${sales.length}`);
  assert.ok(stocks.length > 0, `stock: ${stocks.length}`);
  assert.ok(avicole.length > 0, `avicole: ${avicole.length}`);
});
