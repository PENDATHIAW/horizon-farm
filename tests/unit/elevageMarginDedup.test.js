import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('Fiche animal — marge sur prix proposé distincte de la marge brute technique', () => {
  const card = readFileSync(join(root, 'src/components/SalePricingSummaryCard.jsx'), 'utf8');
  const focused = readFileSync(join(root, 'src/modules/AnimauxSpeciesFocused.jsx'), 'utf8');
  assert.match(card, /marginOnProposed/);
  assert.match(card, /PROPOSED_PRICE_MARGIN_LABEL/);
  assert.match(focused, /marginOnProposed=\{proposed\.marginOnProposed\}/);
  assert.match(focused, /marginSource=\{proposed\.marginSource\}/);
  assert.match(focused, /PRODUCTION_FINANCE_LABELS\.marginGross/);
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
