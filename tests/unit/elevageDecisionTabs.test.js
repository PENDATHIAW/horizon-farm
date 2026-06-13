import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveElevageTab, resolveElevageLotsSubview } from '../../src/utils/commercialNavigation.js';

const TAB_IDS = MODULE_TARGET_TABS.elevage;

const LEGACY_ALIASES = {
  Résumé: 'Lots & bandes',
  Cycles: 'Cycles & Reproduction',
  Animaux: 'Lots & bandes',
  Avicole: 'Lots & bandes',
  Alimentation: 'Lots & bandes',
  Production: 'Lots & bandes',
  Reproduction: 'Cycles & Reproduction',
  Annexe: 'Lots & bandes',
  Graphiques: 'Lots & bandes',
};

function resolveTab(initial) {
  const mapped = initial ? (LEGACY_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return resolveElevageTab(initial);
}

test('elevage exposes 4 target tabs', () => {
  assert.deepEqual(TAB_IDS, [
    'Lots & bandes',
    'Cycles & Reproduction',
    'Santé',
    'Transformation',
  ]);
});

test('legacy elevage tab aliases resolve to new tabs', () => {
  assert.equal(resolveTab('Résumé'), 'Lots & bandes');
  assert.equal(resolveTab('Cycles'), 'Cycles & Reproduction');
  assert.equal(resolveTab('Avicole'), 'Lots & bandes');
  assert.equal(resolveTab('Reproduction'), 'Cycles & Reproduction');
  assert.equal(resolveTab('unknown'), 'Lots & bandes');
});

test('resolveElevageLotsSubview maps avicole and animaux', () => {
  assert.equal(resolveElevageLotsSubview('Avicole'), 'avicole');
  assert.equal(resolveElevageLotsSubview('Animaux'), 'animaux');
  assert.equal(resolveElevageLotsSubview('Cycles'), null);
});
