import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEquipmentSmartFarmSummary,
  buildSmartFarmDeviceFields,
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
});

test('buildSmartFarmDeviceFields propose un select équipement', () => {
  const fields = buildSmartFarmDeviceFields([{ key: 'equipment_id', label: 'Équipement lié', type: 'text' }], equipements);
  const eqField = fields.find((f) => f.key === 'equipment_id');
  assert.equal(eqField.type, 'select');
  assert.ok(eqField.options().some((o) => o.value === 'EQP-1'));
});

test('orphanSmartFarmDevices liste capteurs sans équipement', () => {
  const orphans = orphanSmartFarmDevices(equipements, sensors, cameras);
  assert.ok(orphans.some((d) => d.id === 'SENS-3'));
});
