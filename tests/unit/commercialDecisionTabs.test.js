import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

const TAB_IDS = MODULE_TARGET_TABS.commercial;

const LEGACY_ALIASES = {
  Résumé: 'Pilotage',
  resume: 'Pilotage',
  Clients: 'Clients & créances',
  clients: 'Clients & créances',
  Relances: 'Clients & créances',
  relances: 'Clients & créances',
  devis: 'Ventes',
  Graphiques: 'Ventes',
  Annexe: 'Ventes',
  Opportunités: 'Opportunités',
  Livraisons: 'Livraisons',
  Abonnements: 'Abonnements',
  Pilotage: 'Pilotage',
};

function resolveTab(initial) {
  const mapped = initial ? (LEGACY_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

test('commercial exposes 6 target tabs', () => {
  assert.deepEqual(TAB_IDS, [
    'Ventes',
    'Opportunités',
    'Clients & créances',
    'Livraisons',
    'Abonnements',
    'Pilotage',
  ]);
});

test('legacy commercial tab aliases resolve to new tabs', () => {
  assert.equal(resolveTab('Résumé'), 'Pilotage');
  assert.equal(resolveTab('Clients'), 'Clients & créances');
  assert.equal(resolveTab('Relances'), 'Clients & créances');
  assert.equal(resolveTab('Graphiques'), 'Ventes');
  assert.equal(resolveTab('unknown'), 'Ventes');
});

test('canonical commercial tabs pass through unchanged', () => {
  assert.equal(resolveTab('Ventes'), 'Ventes');
  assert.equal(resolveTab('Opportunités'), 'Opportunités');
  assert.equal(resolveTab('Clients & créances'), 'Clients & créances');
  assert.equal(resolveTab('Pilotage'), 'Pilotage');
});

test('default commercial entry tab is Pilotage not legacy Résumé', () => {
  assert.equal(resolveTab('Pilotage'), 'Pilotage');
  assert.equal(resolveTab('Résumé'), 'Pilotage');
  assert.notEqual(resolveTab('Résumé'), 'Résumé');
});
