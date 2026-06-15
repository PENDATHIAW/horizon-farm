import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeOfflineQueue } from '../../src/services/offlineQueueService.js';

function telemetryItem(i) {
  return {
    id: `OFF-TEL-${i}`,
    type: 'SYNC_TELEMETRY',
    moduleKey: 'smartfarm_events',
    action: 'telemetry',
    payload: { temperature: 20 + i % 5, humidity: 50 + i % 10, timestamp: `2026-06-09T${String(i % 24).padStart(2, '0')}:00:00Z` },
    createdAt: `2026-06-09T${String(i % 24).padStart(2, '0')}:00:00Z`,
  };
}

test('optimizeOfflineQueue — conserve la file si ≤100 trames IoT', () => {
  const queue = Array.from({ length: 50 }, (_, i) => telemetryItem(i));
  const result = optimizeOfflineQueue(queue);
  assert.equal(result.length, 50);
});

test('optimizeOfflineQueue — condense >100 trames IoT en bulk horaire', () => {
  const queue = Array.from({ length: 150 }, (_, i) => telemetryItem(i));
  const result = optimizeOfflineQueue(queue);
  assert.ok(result.length < 150);
  const bulk = result.find((item) => item.type === 'SYNC_TELEMETRY_BULK');
  assert.ok(bulk);
  assert.equal(bulk.moduleKey, 'smartfarm_events');
  assert.ok(bulk.payload?.source_count === 150 || bulk.payload?.condensed);
});
