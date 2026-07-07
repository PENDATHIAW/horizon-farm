import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tabActions = readFileSync(join(root, 'src/modules/CulturesTabActionsBridge.jsx'), 'utf8');
const transformPanel = readFileSync(join(root, 'src/modules/cultures/CulturesTransformationPanel.jsx'), 'utf8');
const harvestPanel = readFileSync(join(root, 'src/modules/cultures/CulturesHarvestPanel.jsx'), 'utf8');

test('CulturesTabActionsBridge — parcelle et campagne en select si fiches existantes', () => {
  assert.match(tabActions, /parcelleOptions/);
  assert.match(tabActions, /campagneOptions/);
  assert.match(tabActions, /type: 'select', options: parcelleOptions/);
  assert.match(tabActions, /type: 'select', options: campagneOptions/);
});

test('CulturesTransformationPanel — unité produit fini en select', () => {
  assert.match(transformPanel, /unite_produit_fini/);
  assert.match(transformPanel, /<select[^>]*value=\{form\.unite_produit_fini\}/);
  assert.doesNotMatch(transformPanel, /unite_produit_fini[^}]*<input type="text"/);
});

test('CulturesHarvestPanel — culture et destination en select', () => {
  assert.match(harvestPanel, /<select[^>]*culture_id/);
  assert.match(harvestPanel, /destination.*<select/s);
  assert.match(harvestPanel, /commitCultureHarvest/);
});
