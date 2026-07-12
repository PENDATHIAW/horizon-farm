import test from 'node:test';
import assert from 'node:assert/strict';
import { getModuleTabs } from '../../src/config/moduleTabs/index.js';
import { resolveFinancementsTab, resolveGestionSystemeTab, resolveSmartFarmTab } from '../../src/utils/commercialNavigation.js';
import { resolveAgriFeedsTab } from '../../src/utils/agriFeedsNavigation.js';
import {
  SMART_ALERT_RULE_CATALOG,
  SMART_DEVICE_FAMILIES,
  SMARTFARM_EVENT_TYPES,
} from '../../src/modules/smartfarm/smartFarmTelemetryCatalog.js';

test('Gestion du système relie ses neuf libellés à neuf vues distinctes', () => {
  const tabs = getModuleTabs('gestion_systeme');
  assert.equal(tabs.length, 9);
  assert.equal(new Set(tabs.map((tab) => tab.component)).size, 9);
  assert.equal(resolveGestionSystemeTab('Catalogues KPI & alertes'), 'SystemCatalogsView');
});

test('AGRI FEEDS relie ses huit libellés à huit vues distinctes', () => {
  const tabs = getModuleTabs('agri_feeds');
  assert.equal(tabs.length, 8);
  assert.equal(new Set(tabs.map((tab) => tab.component)).size, 8);
  assert.equal(resolveAgriFeedsTab('Coûts & décisions'), 'AgriFeedsCostsView');
});

test('Smart Farm relie sept vues sans vue caméra', () => {
  const tabs = getModuleTabs('smartfarm');
  assert.equal(tabs.length, 7);
  assert.equal(new Set(tabs.map((tab) => tab.component)).size, 7);
  assert.equal(resolveSmartFarmTab('Dispositifs'), 'SmartFarmDevicesView');
  assert.equal(tabs.some((tab) => /camera/i.test(`${tab.label} ${tab.component}`)), false);
  assert.doesNotMatch(JSON.stringify({
    families: SMART_DEVICE_FAMILIES,
    rules: SMART_ALERT_RULE_CATALOG,
    events: SMARTFARM_EVENT_TYPES,
  }), /camera|caméra/i);
});

test('Financements expose huit vues cockpit et cinq vues externes', () => {
  assert.equal(getModuleTabs('financements').length, 8);
  assert.equal(getModuleTabs('financements_externe').length, 5);
  assert.equal(resolveFinancementsTab('Pièces du dossier'), 'cockpit-documents');
  assert.equal(resolveFinancementsTab('Contact'), 'funder-contact');
});
