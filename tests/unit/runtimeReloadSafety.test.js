import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupRealtimeModulesByTable, makeRealtimeChannelName } from '../../src/utils/realtimeSubscriptions.js';

test('démonte la racine React avant un remplacement à chaud', () => {
  const source = readFileSync(new URL('../../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /const root = createRoot/);
  assert.match(source, /import\.meta\.hot\.dispose\(\(\) => root\.unmount\(\)\)/);
});

test('crée un nom de canal Realtime propre à chaque montage', () => {
  assert.equal(makeRealtimeChannelName('A'), 'horizon-farm-realtime:A');
  assert.notEqual(makeRealtimeChannelName(), makeRealtimeChannelName());
});

test('regroupe les modules partageant une même table Realtime', () => {
  const groups = groupRealtimeModulesByTable({
    ventes: { table: 'sales_orders' },
    sales_orders: { table: 'sales_orders' },
    clients: { table: 'clients' },
    dashboard: {},
  });

  assert.deepEqual(groups, [
    { table: 'sales_orders', moduleKeys: ['ventes', 'sales_orders'] },
    { table: 'clients', moduleKeys: ['clients'] },
  ]);
});
