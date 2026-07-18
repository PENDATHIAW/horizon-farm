import test from 'node:test';
import assert from 'node:assert/strict';
import { subjectSensors } from '../../src/utils/simulatedSubjectSensors.js';

test('un bœuf reçoit un collier GPS et une boucle RFID', () => {
  const { devices } = subjectSensors({ id: 'AN-001', type: 'bovin', name: 'Bœuf 1' }, 'animaux');
  const kinds = devices.map((d) => d.kind);
  assert.ok(kinds.includes('gps'), 'collier GPS attendu sur un bovin');
  assert.ok(kinds.includes('rfid'), 'boucle RFID attendue');
  const gps = devices.find((d) => d.kind === 'gps');
  assert.ok(gps.readings.some((r) => r.label === 'Position'));
  assert.ok(gps.readings.some((r) => r.label === 'Batterie'));
});

test('valeurs déterministes : même sujet = même relevé', () => {
  const a = subjectSensors({ id: 'AN-42', type: 'vache' }, 'animaux');
  const b = subjectSensors({ id: 'AN-42', type: 'vache' }, 'animaux');
  assert.deepEqual(a, b);
});

test('un lot avicole reçoit un capteur climat (temp/humidité/NH3)', () => {
  const { devices } = subjectSensors({ id: 'LOT-9' }, 'avicole');
  assert.equal(devices.length, 1);
  assert.equal(devices[0].kind, 'climat');
  const labels = devices[0].readings.map((r) => r.label);
  assert.ok(labels.includes('Température') && labels.includes('Humidité'));
});

test('une parcelle reçoit une sonde d’humidité du sol', () => {
  const { devices } = subjectSensors({ id: 'PARC-3' }, 'cultures');
  assert.equal(devices[0].kind, 'sol');
});

test('une alerte porte une action', () => {
  // balaye plusieurs sujets pour tomber sur au moins une alerte
  let found = null;
  for (let i = 0; i < 60 && !found; i += 1) {
    const { devices } = subjectSensors({ id: `LOT-${i}` }, 'avicole');
    found = devices.find((d) => d.etat === 'alerte');
  }
  if (found) {
    assert.ok(found.alert && found.alert.action, 'une alerte propose une action');
  }
});
