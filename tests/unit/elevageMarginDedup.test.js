import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('Fiche animal — marge brute technique alignée liste (pas marge prix proposé)', () => {
  const card = readFileSync(join(root, 'src/components/SalePricingSummaryCard.jsx'), 'utf8');
  const focused = readFileSync(join(root, 'src/modules/AnimauxSpeciesFocused.jsx'), 'utf8');
  assert.match(card, /marginGross/);
  assert.match(card, /PRODUCTION_FINANCE_LABELS\.marginGross/);
  assert.match(focused, /marginGross=\{costs\.marge\}/);
  assert.match(focused, /marginSource=\{costs\.saleSource\}/);
});

test('Animaux / Avicole — sections Transformation et ramassage supprimées (hub canonique seul)', () => {
  const animaux = readFileSync(join(root, 'src/modules/AnimauxV2.jsx'), 'utf8');
  const avicole = readFileSync(join(root, 'src/modules/AvicoleV10.jsx'), 'utf8');
  assert.doesNotMatch(animaux, /AnimalSlaughterStockBridge/);
  assert.doesNotMatch(animaux, /Transformation et stock/);
  assert.doesNotMatch(avicole, /AvicoleTransformationBridge/);
  assert.doesNotMatch(avicole, /AvicoleJournalsBridge/);
  assert.doesNotMatch(avicole, /Transformation et stock/);
  assert.doesNotMatch(avicole, /Journal de ramassage|Journal de ponte et charges/);
});
