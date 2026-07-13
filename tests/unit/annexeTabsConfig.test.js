import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { annexePresetForModule } from '../../src/services/annexeModuleConfig.js';

test('smartfarm — 7 onglets métier sans onglet Annexe dédié', () => {
  const tabs = MODULE_TARGET_TABS.smartfarm || [];
  assert.equal(tabs.length, 7);
  assert.ok(!tabs.includes('Annexe'));
  assert.ok(annexePresetForModule('smartfarm'));
});

test('finance_pilotage — 6 onglets canoniques', () => {
  const tabs = MODULE_TARGET_TABS.finance_pilotage;
  assert.equal(tabs.length, 6);
  assert.deepEqual(tabs, ['Vue d’ensemble', 'Transactions', 'Trésorerie', 'Budget & écarts', 'Coûts & marges', 'Investissements & dettes']);
});

test('activite_suivi — 5 onglets sans onglet Annexe dédié', () => {
  const tabs = MODULE_TARGET_TABS.activite_suivi;
  assert.equal(tabs.length, 5);
  assert.ok(tabs.includes('À faire'));
  assert.ok(!tabs.includes('Annexe'));
  assert.ok(annexePresetForModule('activite_suivi'));
});

test('documents_rapports — 5 onglets sans onglet Annexe dédié', () => {
  const tabs = MODULE_TARGET_TABS.documents_rapports;
  assert.equal(tabs.length, 5);
  assert.ok(!tabs.includes('Annexe'));
  assert.ok(annexePresetForModule('documents_rapports'));
});
