import test from 'node:test';
import assert from 'node:assert/strict';
import { SMARTFARM_TABS, resolveSmartFarmTab, resolveSmartFarmNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('smartfarm — 7 vues canoniques et 7 libellés cibles', () => {
  assert.equal(SMARTFARM_TABS.length, 7);
  assert.deepEqual(MODULE_TARGET_TABS.smartfarm, ['Vue d’ensemble', 'Relevés d’eau', 'Énergie', 'Bâtiments', 'Dispositifs', 'Relevés & qualité', 'Configuration']);
});

test('resolveSmartFarmTab — aliases anciens onglets', () => {
  assert.equal(resolveSmartFarmTab('Résumé'), 'SmartFarmOverviewView');
  assert.equal(resolveSmartFarmTab('Capteurs'), 'SmartFarmDevicesView');
  assert.equal(resolveSmartFarmTab('Caméras'), 'SmartFarmDevicesView');
  assert.equal(resolveSmartFarmTab('Graphiques'), 'SmartFarmReadingsView');
  assert.equal(resolveSmartFarmTab('Annexe'), 'SmartFarmDevicesView');
  assert.equal(resolveSmartFarmNavigation('Capteurs').tab, 'SmartFarmDevicesView');
});
