import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSmartFarmAlerts } from '../../src/services/smartFarmAlertEngine.js';
import { buildUnifiedAlerts } from '../../src/utils/unifiedAlerts.js';

test('buildSmartFarmAlerts — chaleur, sol sec, batterie et hors ligne', () => {
  const devices = [
    { id: 'D1', type: 'temperature', last_value: 38, zone: 'poulailler', status: 'online' },
    { id: 'D2', type: 'humidite_sol', last_value: 12, zone: 'parcelle A' },
    { id: 'D3', type: 'temperature', last_value: 24, battery_level: 15 },
    { id: 'D4', type: 'humidite_air', status: 'offline' },
  ];
  const alerts = buildSmartFarmAlerts(devices, []);
  const codes = alerts.map((a) => a.code);
  assert.ok(codes.includes('temp_high'), 'chaleur critique attendue');
  assert.ok(codes.includes('humidity_soil_low'), 'sol sec attendu');
  assert.ok(codes.includes('battery_low'), 'batterie faible attendue');
  assert.ok(codes.includes('sensor_offline'), 'capteur hors ligne attendu');
  // La chaleur est critique et rattachée à l'élevage.
  const heat = alerts.find((a) => a.code === 'temp_high');
  assert.equal(heat.severity, 'critique');
  assert.equal(heat.moduleKey, 'elevage');
});

test('buildSmartFarmAlerts — événement intrusion = urgence', () => {
  const alerts = buildSmartFarmAlerts([], [{ id: 'EVT1', event_type: 'intrusion', zone: 'magasin', status: 'nouvelle' }]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'urgence');
});

test('buildSmartFarmAlerts — seuils personnalisés du capteur respectés', () => {
  const devices = [{ id: 'D5', type: 'temperature', last_value: 30, seuils: { temperature_max: 28 } }];
  const alerts = buildSmartFarmAlerts(devices, []);
  assert.ok(alerts.some((a) => a.code === 'temp_high'), 'seuil personnalisé 28°C dépassé');
});

test('les alertes Smart Farm rejoignent le flux unifié', () => {
  const dataMap = {
    alertes_center: [],
    sensor_devices: [{ id: 'D1', type: 'temperature', last_value: 40, zone: 'poulailler' }],
    smartfarm_events: [{ id: 'EVT1', event_type: 'fuite_eau', status: 'nouvelle' }],
  };
  const alerts = buildUnifiedAlerts(dataMap, { online: true });
  assert.ok(alerts.some((a) => a.code === 'temp_high'));
  assert.ok(alerts.some((a) => a.code === 'water_leak'));
  // L'urgence/critique remonte en tête (tri par gravité).
  assert.ok(['urgence', 'critique'].includes(alerts[0].severity));
});

test('aucun capteur = aucune alerte Smart Farm', () => {
  assert.equal(buildSmartFarmAlerts([], []).length, 0);
});
