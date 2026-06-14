import test from 'node:test';
import assert from 'node:assert/strict';
import { RH_TABS, resolveRhTab, resolveRhNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('rh — 4 onglets canoniques', () => {
  assert.equal(RH_TABS.length, 4);
  assert.deepEqual(MODULE_TARGET_TABS.rh, RH_TABS);
});

test('resolveRhTab — aliases anciens onglets', () => {
  assert.equal(resolveRhTab('Résumé'), 'Cockpit RH & Maintenance');
  assert.equal(resolveRhTab('Équipements'), 'Parc Matériel & Maintenance');
  assert.equal(resolveRhTab('Maintenance'), 'Parc Matériel & Maintenance');
  assert.equal(resolveRhTab('Affectations'), 'Personnel & Paie');
  assert.equal(resolveRhTab('Coûts'), 'Personnel & Paie');
  assert.equal(resolveRhTab('Documents'), 'Registres & Analyses');
  assert.equal(resolveRhTab('Graphiques'), 'Registres & Analyses');
  assert.equal(resolveRhNavigation('Maintenance').tab, 'Parc Matériel & Maintenance');
});
