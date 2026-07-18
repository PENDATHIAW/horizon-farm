import test from 'node:test';
import assert from 'node:assert/strict';
import { weighingSeries } from '../../src/utils/simulatedWeighings.js';

test('bovin : série de 12 pesées croissantes avec GMQ et gain', () => {
  const s = weighingSeries({ id: 'AN-1', type: 'bovin' }, 'animaux');
  assert.equal(s.points.length, 12);
  assert.ok(s.last > s.first, 'le poids progresse');
  assert.ok(s.gmq > 0, 'GMQ positif');
  assert.equal(s.unit, 'kg');
  s.points.forEach((p) => { assert.ok(p.date && p.label && typeof p.poids === 'number'); });
});

test('lot avicole : série de 6 pesées (poulet de chair)', () => {
  const s = weighingSeries({ id: 'LOT-1' }, 'avicole');
  assert.equal(s.points.length, 6);
  assert.ok(s.last > s.first);
  assert.ok(s.last <= 3, 'poids poulet réaliste (< 3 kg)');
});

test('déterministe : même sujet = même courbe', () => {
  assert.deepEqual(weighingSeries({ id: 'X9', type: 'vache' }), weighingSeries({ id: 'X9', type: 'vache' }));
});
