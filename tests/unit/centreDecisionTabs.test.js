import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { CENTRE_HEY_HORIZON_QUESTIONS } from '../../src/utils/centreHeyHorizon.js';

const TAB_IDS = MODULE_TARGET_TABS.centre_ia;

const LEGACY_ALIASES = {
  'Urgences & risques': 'À traiter',
  'Croissance & opportunités': 'Décisions',
  'Saisons & marchés': 'Historique',
  Priorités: 'À traiter',
  'Priorités & risques': 'À traiter',
  Recommandations: 'Décisions',
  Opportunités: 'Décisions',
  Performance: 'Écarts',
  'Rentabilité lots': 'Écarts',
  'Flux & stocks': 'À traiter',
  Cycles: 'Historique',
  Annexe: 'Historique',
  Graphiques: 'Écarts',
};

function resolveTab(initial) {
  const mapped = initial ? (LEGACY_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

test('centre décisionnel expose les 5 onglets cibles', () => {
  assert.deepEqual(TAB_IDS, [
    'À traiter',
    'Écarts',
    'Risques',
    'Décisions',
    'Historique',
  ]);
});

test('legacy initialTab aliases resolve to new tabs', () => {
  assert.equal(resolveTab('Urgences & risques'), 'À traiter');
  assert.equal(resolveTab('Risques'), 'Risques');
  assert.equal(resolveTab('Recommandations'), 'Décisions');
  assert.equal(resolveTab('Cycles'), 'Historique');
  assert.equal(resolveTab('Graphiques'), 'Écarts');
  assert.equal(resolveTab('unknown'), 'À traiter');
});

test('hey horizon centre presets use valid tabs', () => {
  CENTRE_HEY_HORIZON_QUESTIONS.forEach((item) => {
    assert.ok(TAB_IDS.includes(resolveTab(item.tab)), `invalid tab for ${item.id}: ${item.tab}`);
  });
  assert.equal(CENTRE_HEY_HORIZON_QUESTIONS.length, 3);
});

test('les alias Performance et Flux & stocks ouvrent les vues cibles', () => {
  assert.equal(resolveTab('Performance'), 'Écarts');
  assert.equal(resolveTab('Rentabilité lots'), 'Écarts');
  assert.equal(resolveTab('Flux & stocks'), 'À traiter');
});
