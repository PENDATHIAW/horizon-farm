import test from 'node:test';
import assert from 'node:assert/strict';
import { auditErpInterconnections } from '../../src/utils/interconnectionAudit.js';

test('audit IoT — événement sans device_id', () => {
  const audit = auditErpInterconnections({
    sensor_devices: [{ id: 'SENS-1' }],
    camera_devices: [],
    smartfarm_events: [{ id: 'SFEV-1', event_type: 'temperature', message: 'test' }],
  });
  const orphan = audit.issues.find((issue) => issue.module === 'smartfarm_events' && issue.row_id === 'SFEV-1');
  assert.ok(orphan);
  assert.match(orphan.message, /aucun objet connecté/i);
});

test('audit IoT — device_id introuvable', () => {
  const audit = auditErpInterconnections({
    sensor_devices: [{ id: 'SENS-1' }],
    camera_devices: [],
    smartfarm_events: [{ id: 'SFEV-2', device_id: 'GHOST-99', event_type: 'temperature' }],
  });
  const orphan = audit.issues.find((issue) => issue.row_id === 'SFEV-2');
  assert.ok(orphan);
  assert.equal(orphan.severity, 'critical');
  assert.equal(orphan.linked_id, 'GHOST-99');
});

test('audit IoT — device_id valide sans anomalie', () => {
  const audit = auditErpInterconnections({
    sensor_devices: [{ id: 'SENS-1' }],
    camera_devices: [],
    smartfarm_events: [{ id: 'SFEV-3', device_id: 'SENS-1', event_type: 'temperature' }],
  });
  assert.ok(!audit.issues.some((issue) => issue.row_id === 'SFEV-3'));
});
