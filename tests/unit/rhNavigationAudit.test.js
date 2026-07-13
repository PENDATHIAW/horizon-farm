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
const equipeModule = readFileSync(join(root, 'src/modules/EquipeV1Module.jsx'), 'utf8');

test('resolveRhTab — alias Équipements et Affectations', () => {
  assert.equal(resolveRhTab('Équipements'), 'TeamOverviewView');
  assert.equal(resolveRhTab('Affectations'), 'TeamAssignmentsView');
  assert.equal(resolveRhTab('Résumé'), 'TeamOverviewView');
});

test('navigateRhTab — conserve alias brut', () => {
  const calls = [];
  navigateRhTab((module, opts) => calls.push({ module, ...opts }), 'Équipements');
  assert.deepEqual(calls, [{ module: 'equipe', tab: 'Équipements' }]);
});

test('navigationOptionsForFinding — alias rh conservé', () => {
  const nav = navigationOptionsForFinding({ module: 'rh', tab: 'Maintenance' });
  assert.equal(nav.module, 'rh');
  assert.equal(nav.tab, 'Maintenance');
});

test('Equipe — rôle et équipe en select, sans écran paie', () => {
  assert.match(equipeModule, /ERP_ROLES\.map/);
  assert.match(equipeModule, /directory\.teams\.map/);
  assert.doesNotMatch(equipeModule, /window\.prompt/);
  assert.doesNotMatch(equipeModule, /salaire|prime_mensuelle|pointage|medical_notes/i);
});
