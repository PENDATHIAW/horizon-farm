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
  // La transformation n'est plus une section repliable dédoublée : elle est
  // rendue une seule fois dans l'onglet Récoltes (via CulturesRecoltesHub).
  assert.doesNotMatch(recovered, /transformationDetailsRef/);
  assert.match(recovered, /graphiquesDetailsRef/);
  assert.match(recovered, /resolveCulturesSectionIntent/);
  assert.match(recovered, /sectionIntent/);
});

test('resolveCulturesTab — alias legacy vers canonique', () => {
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles cultures');
  assert.equal(resolveCulturesTab('Parcelles & campagnes'), 'Parcelles cultures');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes cultures');
  assert.equal(resolveCulturesTab('Intrants & Météo'), 'Intrants & fertilisation cultures');
});

test('resolveCulturesSectionIntent — Intrants ouvre section intrants', () => {
  assert.equal(resolveCulturesSectionIntent('Intrants & Météo').section, 'intrants');
  assert.equal(resolveCulturesSectionIntent('Transformation').section, 'transformation');
});
