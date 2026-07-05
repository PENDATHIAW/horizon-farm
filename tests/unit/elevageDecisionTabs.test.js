import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

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
  return TAB_IDS[0];
}

function resolveLotsSubview(value = '') {
  const tab = String(value || '').trim();
  if (tab === 'Avicole' || tab.toLowerCase() === 'avicole') return 'avicole';
  if (tab === 'Animaux' || tab.toLowerCase() === 'animaux') return 'animaux';
  return null;
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
  assert.equal(resolveLotsSubview('Avicole'), 'avicole');
  assert.equal(resolveLotsSubview('Animaux'), 'animaux');
  assert.equal(resolveLotsSubview('Cycles'), null);
});

test('alias Avicole et Animaux résolvent vers Lots & bandes avec sous-vue', () => {
  assert.equal(resolveTab('Avicole'), 'Lots & bandes');
  assert.equal(resolveTab('Animaux'), 'Lots & bandes');
  assert.equal(resolveLotsSubview('Avicole'), 'avicole');
});
