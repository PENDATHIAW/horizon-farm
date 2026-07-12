import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  navigateRhTab,
  navigationOptionsForFinding,
  resolveRhTab,
} from '../../src/utils/commercialNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const rhPeople = readFileSync(join(root, 'src/modules/RHPeopleTeams.jsx'), 'utf8');

test('resolveRhTab — alias Équipements et Affectations', () => {
  assert.equal(resolveRhTab('Équipements'), 'Parc Matériel & Maintenance');
  assert.equal(resolveRhTab('Affectations'), 'Personnel & Paie');
  assert.equal(resolveRhTab('Résumé'), 'Cockpit RH & Maintenance');
});

test('navigateRhTab — conserve alias brut', () => {
  const calls = [];
  navigateRhTab((module, opts) => calls.push({ module, ...opts }), 'Équipements');
  assert.deepEqual(calls, [{ module: 'equipe', tab: 'Équipements' }]);
});

test('navigationOptionsForFinding — alias rh vers equipe', () => {
  const nav = navigationOptionsForFinding({ module: 'rh', tab: 'Maintenance' });
  assert.equal(nav.module, 'equipe');
  assert.equal(nav.tab, 'Maintenance');
});

test('RHPeopleTeams — rôle et équipe en select', () => {
  assert.match(rhPeople, /RH_ROLES\.map/);
  assert.match(rhPeople, /teams\.map\(\(t\) => <option/);
  assert.doesNotMatch(rhPeople, /window\.prompt/);
});
