import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { CENTRE_HEY_HORIZON_QUESTIONS } from '../../src/utils/centreHeyHorizon.js';

const TAB_IDS = MODULE_TARGET_TABS.centre_ia;

const LEGACY_ALIASES = {
  'À traiter': 'Urgences & risques',
  Risques: 'Urgences & risques',
  Priorités: 'Urgences & risques',
  Recommandations: 'Croissance & opportunités',
  Opportunités: 'Croissance & opportunités',
  Cycles: 'Saisons & marchés',
  Historique: 'Saisons & marchés',
  Annexe: 'Saisons & marchés',
  Graphiques: 'Croissance & opportunités',
};

function resolveTab(initial) {
  const mapped = initial ? (LEGACY_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

test('centre_ia exposes 3 target tabs', () => {
  assert.deepEqual(TAB_IDS, [
    'Urgences & risques',
    'Croissance & opportunités',
    'Saisons & marchés',
  ]);
});

test('legacy initialTab aliases resolve to new tabs', () => {
  assert.equal(resolveTab('À traiter'), 'Urgences & risques');
  assert.equal(resolveTab('Risques'), 'Urgences & risques');
  assert.equal(resolveTab('Recommandations'), 'Croissance & opportunités');
  assert.equal(resolveTab('Cycles'), 'Saisons & marchés');
  assert.equal(resolveTab('Graphiques'), 'Croissance & opportunités');
  assert.equal(resolveTab('unknown'), 'Urgences & risques');
});

test('hey horizon centre presets use valid tabs', () => {
  CENTRE_HEY_HORIZON_QUESTIONS.forEach((item) => {
    assert.ok(TAB_IDS.includes(resolveTab(item.tab)), `invalid tab for ${item.id}: ${item.tab}`);
  });
  assert.equal(CENTRE_HEY_HORIZON_QUESTIONS.length, 3);
});
