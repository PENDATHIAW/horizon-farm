import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

const TAB_IDS = MODULE_TARGET_TABS.objectifs_croissance;

const LEGACY_ALIASES = {
  Performance: 'Suivi du Business Plan',
  'Rentabilité Lot & Cycle': 'Suivi du Business Plan',
  Prévisions: 'Efficacité Technique & Zootechnique',
  'Efficacité Technique': 'Efficacité Technique & Zootechnique',
  Plans: 'Sécurisation des Flux',
  Financeurs: 'Sécurisation des Flux',
  Investisseurs: 'Sécurisation des Flux',
  'Objectifs & Écarts Zootechniques': 'Efficacité Technique & Zootechnique',
  'Flux & Équilibres': 'Sécurisation des Flux',
  'Maraîchage & Diversification': 'Simulateur Sandbox',
  Graphiques: 'Suivi du Business Plan',
  Annexe: 'Suivi du Business Plan',
};

function resolveTab(initial) {
  const mapped = initial ? (LEGACY_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

test('objectifs_croissance exposes 4 target tabs', () => {
  assert.deepEqual(TAB_IDS, [
    'Suivi du Business Plan',
    'Efficacité Technique & Zootechnique',
    'Simulateur Sandbox',
    'Sécurisation des Flux',
  ]);
});

test('legacy objectifs tab aliases resolve to new tabs', () => {
  assert.equal(resolveTab('Rentabilité Lot & Cycle'), 'Suivi du Business Plan');
  assert.equal(resolveTab('Efficacité Technique'), 'Efficacité Technique & Zootechnique');
  assert.equal(resolveTab('Maraîchage & Diversification'), 'Simulateur Sandbox');
  assert.equal(resolveTab('Flux & Équilibres'), 'Sécurisation des Flux');
  assert.equal(resolveTab('unknown'), 'Suivi du Business Plan');
});
