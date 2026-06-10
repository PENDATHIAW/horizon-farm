import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = readFileSync(join(root, 'src/modules/AnimauxSpeciesFocused.jsx'), 'utf8');

test('Animaux liste — colonnes marge unifiée ERP', () => {
  assert.match(src, /calculateUnifiedAnimalCost/);
  assert.match(src, /COST_UNIFIED_LABEL/);
  assert.match(src, /MARGIN_GROSS_LABEL/);
  assert.match(src, /PRODUCTION_FINANCE_LABELS/);
  assert.doesNotMatch(src, /Coût \/ marge/i);
  assert.doesNotMatch(src, /label="Marge suivie"/);
});

test('Animaux liste — marge ERP fiche dans costBreakdown', () => {
  assert.match(src, /revenueOfAnimal/);
  assert.match(src, /revenue > 0 \? revenue - total : null/);
});

test('Animaux liste — colonne marge alignée au prix proposé commercial', () => {
  assert.match(src, /buildAnimalProposedSaleDisplay/);
  assert.match(src, /PROPOSED_PRICE_MARGIN_LABEL/);
  assert.match(src, /rowProposed\.marginOnProposed/);
});
