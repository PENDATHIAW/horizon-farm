import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveObjectifsTab } from '../../src/utils/commercialNavigation.js';

const TAB_IDS = MODULE_TARGET_TABS.objectifs_croissance;

test('objectifs_croissance expose les 3 onglets cibles', () => {
  assert.deepEqual(TAB_IDS, [
    'Objectifs',
    'Scénarios',
    'Historique',
  ]);
});

test('les anciens onglets Objectifs restent des alias', () => {
  assert.equal(resolveObjectifsTab('Rentabilité Lot & Cycle'), 'Objectifs');
  assert.equal(resolveObjectifsTab('Efficacité Technique'), 'Scénarios');
  assert.equal(resolveObjectifsTab('Maraîchage & Diversification'), 'Scénarios');
  assert.equal(resolveObjectifsTab('Flux & Équilibres'), 'Scénarios');
  assert.equal(resolveObjectifsTab('unknown'), 'Objectifs');
});
