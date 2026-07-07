import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveCulturesSectionIntent, resolveCulturesTab } from '../../src/utils/culturesNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const recovered = readFileSync(join(root, 'src/modules/CulturesRecoveredModule.jsx'), 'utf8');

test('CulturesRecoveredModule — sections repliables avec refs deep-link', () => {
  assert.match(recovered, /intrantsDetailsRef/);
  assert.match(recovered, /transformationDetailsRef/);
  assert.match(recovered, /graphiquesDetailsRef/);
  assert.match(recovered, /resolveCulturesSectionIntent/);
  assert.match(recovered, /sectionIntent/);
});

test('resolveCulturesTab — alias legacy vers canonique', () => {
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Parcelles & campagnes'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes');
  assert.equal(resolveCulturesTab('Intrants & Météo'), 'Parcelles & campagnes');
});

test('resolveCulturesSectionIntent — Intrants ouvre section intrants', () => {
  assert.equal(resolveCulturesSectionIntent('Intrants & Météo').section, 'intrants');
  assert.equal(resolveCulturesSectionIntent('Transformation').section, 'transformation');
});
