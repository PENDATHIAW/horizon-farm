import test from 'node:test';
import assert from 'node:assert/strict';
import { SMARTFARM_TABS, resolveSmartFarmTab, resolveSmartFarmNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('smartfarm — 3 onglets canoniques', () => {
  assert.equal(SMARTFARM_TABS.length, 3);
  assert.deepEqual(MODULE_TARGET_TABS.smartfarm, SMARTFARM_TABS);
});

test('resolveSmartFarmTab — aliases anciens onglets', () => {
  assert.equal(resolveSmartFarmTab('Résumé'), 'Objets connectés');
  assert.equal(resolveSmartFarmTab('Capteurs'), 'Objets connectés');
  assert.equal(resolveSmartFarmTab('Caméras'), 'Objets connectés');
  assert.equal(resolveSmartFarmTab('Graphiques'), 'Flux temps réel');
  assert.equal(resolveSmartFarmTab('Annexe'), 'Objets connectés');
  assert.equal(resolveSmartFarmNavigation('Capteurs').tab, 'Objets connectés');
});
