import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeByTitle, normalizeTitle, titleOverlaps } from '../../src/modules/centre/centreContentUtils.js';

test('normalizeTitle collapses whitespace', () => {
  assert.equal(normalizeTitle('  Tabaski   '), 'tabaski');
});

test('titleOverlaps detects partial matches', () => {
  assert.equal(titleOverlaps('Lancement suspendu — trésorerie', ['lancement suspendu']), true);
  assert.equal(titleOverlaps('Tabaski', ['korité']), false);
});

test('dedupeByTitle removes duplicates and respects exclude keys', () => {
  const rows = [
    { title: 'Tabaski' },
    { title: 'Tabaski' },
    { title: 'Stock bas' },
    { title: 'Lancement suspendu' },
  ];
  const out = dedupeByTitle(rows, 5, ['lancement suspendu']);
  assert.equal(out.length, 2);
  assert.equal(out[0].title, 'Tabaski');
  assert.equal(out[1].title, 'Stock bas');
});
