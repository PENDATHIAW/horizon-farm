import test from 'node:test';
import assert from 'node:assert/strict';
import { SYNC_ACTIVITY_TABS, resolveSyncActivityTab, resolveSyncActivityNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('sync_activity — 3 onglets canoniques', () => {
  assert.equal(SYNC_ACTIVITY_TABS.length, 3);
  assert.deepEqual(MODULE_TARGET_TABS.sync_activity, SYNC_ACTIVITY_TABS);
});

test('resolveSyncActivityTab — aliases navigation', () => {
  assert.equal(resolveSyncActivityTab('Résumé'), 'Vérifications');
  assert.equal(resolveSyncActivityTab('sync'), 'Connexion & envoi');
  assert.equal(resolveSyncActivityTab('journal'), 'Journal d\'activité');
  assert.equal(resolveSyncActivityNavigation('audit').tab, 'Vérifications');
});
