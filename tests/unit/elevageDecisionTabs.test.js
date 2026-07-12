import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveElevageLotsSubview, resolveElevageTab } from '../../src/utils/commercialNavigation.js';

const TAB_IDS = MODULE_TARGET_TABS.elevage;

test('elevage expose les 7 onglets cibles', () => {
  assert.deepEqual(TAB_IDS, [
    'Vue d’ensemble',
    'Lots & animaux',
    'Alimentation',
    'Production',
    'Santé & Biosécurité',
    'Coûts & performance',
    'Historique',
  ]);
});

test('les anciens onglets élevage restent des alias', () => {
  assert.equal(resolveElevageTab('Résumé'), 'Vue élevage');
  assert.equal(resolveElevageTab('Cycles'), 'Production élevage');
  assert.equal(resolveElevageTab('Avicole'), 'Production élevage');
  assert.equal(resolveElevageTab('Reproduction'), 'Production élevage');
  assert.equal(resolveElevageTab('unknown'), 'Vue élevage');
});

test('resolveElevageLotsSubview maps avicole and animaux', () => {
  assert.equal(resolveElevageLotsSubview('Avicole'), 'avicole');
  assert.equal(resolveElevageLotsSubview('Animaux'), 'animaux');
  assert.equal(resolveElevageLotsSubview('Cycles'), null);
});

test('les alias Avicole et Animaux conservent leur sous-vue', () => {
  assert.equal(resolveElevageTab('Avicole'), 'Production élevage');
  assert.equal(resolveElevageTab('Animaux'), 'Lots & animaux');
  assert.equal(resolveElevageLotsSubview('Avicole'), 'avicole');
});
