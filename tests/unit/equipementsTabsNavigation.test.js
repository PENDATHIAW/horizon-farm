import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveModuleTab } from '../../src/config/moduleTabs/index.js';

test('equipements expose exactement les cinq onglets métier', () => {
  assert.deepEqual(MODULE_TARGET_TABS.equipements, ['Parc', 'Acquisitions', 'Pannes', 'Réparations', 'Coûts & disponibilité']);
  assert.equal(resolveModuleTab('equipements', 'Parc').component, 'EquipmentFleetView');
  assert.equal(resolveModuleTab('equipements', 'Achat équipement').component, 'EquipmentAcquisitionsView');
  assert.equal(resolveModuleTab('equipements', 'Maintenance').component, 'EquipmentRepairsView');
});
