import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEquipmentSmartFarmSummary,
  devicesForEquipment,
  equipmentForDevice,
  orphanSmartFarmDevices,
} from '../../src/services/equipmentSmartFarmBridge.js';

const equipements = [
  { id: 'EQP-1', name: 'Incubateur A', zone: 'couveuse' },
  { id: 'EQP-2', name: 'Pompe eau', zone: 'magasin' },
];

const sensors = [
  { id: 'SENS-1', name: 'Temp couveuse', equipment_id: 'EQP-1' },
  { id: 'SENS-2', name: 'Humidité magasin', zone: 'magasin' },
  { id: 'SENS-3', name: 'Orphelin', zone: 'inconnu' },
];

const cameras = [
  { id: 'CAM-1', name: 'Cam couveuse', equipment_id: 'EQP-1' },
];

test('devicesForEquipment lie par equipment_id explicite', () => {
  const linked = devicesForEquipment(equipements[0], sensors, cameras);
  assert.equal(linked.sensors.length, 1);
  assert.equal(linked.cameras.length, 1);
  assert.equal(linked.sensors[0].id, 'SENS-1');
});

test('devicesForEquipment lie par zone', () => {
  const linked = devicesForEquipment(equipements[1], sensors, cameras);
  assert.equal(linked.sensors.length, 1);
  assert.equal(linked.sensors[0].id, 'SENS-2');
});

test('equipmentForDevice retrouve équipement par equipment_id', () => {
  const eq = equipmentForDevice(sensors[0], equipements);
  assert.equal(eq.id, 'EQP-1');
});

test('buildEquipmentSmartFarmSummary trie par nombre de devices', () => {
  const summary = buildEquipmentSmartFarmSummary(equipements, sensors, cameras);
  assert.equal(summary[0].equipment.id, 'EQP-1');
  assert.equal(summary[0].totalDevices, 2);
});

test('orphanSmartFarmDevices liste capteurs sans équipement', () => {
  const orphans = orphanSmartFarmDevices(equipements, sensors, cameras);
  assert.ok(orphans.some((d) => d.id === 'SENS-3'));
  assert.ok(!orphans.some((d) => d.id === 'SENS-1'));
});
