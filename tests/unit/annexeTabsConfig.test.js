import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { annexePresetForModule } from '../../src/services/annexeModuleConfig.js';

test('smartfarm — 3 onglets télémétrie sans onglet Annexe dédié', () => {
  const tabs = MODULE_TARGET_TABS.smartfarm || [];
  assert.equal(tabs.length, 3);
  assert.ok(!tabs.includes('Annexe'));
  assert.ok(annexePresetForModule('smartfarm'));
});

test('finance_pilotage — 5 onglets avec Pilotage', () => {
  const tabs = MODULE_TARGET_TABS.finance_pilotage;
  assert.equal(tabs.length, 5);
  assert.deepEqual(tabs, ['Résumé', 'Trésorerie', 'Créances & dettes', 'Pilotage', 'Graphiques']);
});

test('activite_suivi — 4 onglets sans onglet Annexe dédié', () => {
  const tabs = MODULE_TARGET_TABS.activite_suivi;
  assert.equal(tabs.length, 4);
  assert.ok(tabs.includes('À traiter maintenant'));
  assert.ok(!tabs.includes('Annexe'));
  assert.ok(annexePresetForModule('activite_suivi'));
});

test('documents_rapports — 4 onglets sans onglet Annexe dédié', () => {
  const tabs = MODULE_TARGET_TABS.documents_rapports;
  assert.equal(tabs.length, 4);
  assert.ok(!tabs.includes('Annexe'));
  assert.ok(annexePresetForModule('documents_rapports'));
});
