import test from 'node:test';
import assert from 'node:assert/strict';
import { GESTION_SYSTEME_TABS, SYNC_ACTIVITY_TABS, resolveSyncActivityTab, resolveSyncActivityNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('gestion_systeme — onglets canoniques incluant sync et audit', () => {
  assert.equal(SYNC_ACTIVITY_TABS.length, 3);
  assert.deepEqual(MODULE_TARGET_TABS.gestion_systeme, GESTION_SYSTEME_TABS);
  assert.ok(MODULE_TARGET_TABS.gestion_systeme.includes('Sauvegardes'));
  assert.ok(MODULE_TARGET_TABS.gestion_systeme.includes('Audit'));
});

test('resolveSyncActivityTab — aliases navigation', () => {
  assert.equal(resolveSyncActivityTab('Résumé'), 'Vérifications');
  assert.equal(resolveSyncActivityTab('sync'), 'Connexion & envoi');
  assert.equal(resolveSyncActivityTab('journal'), 'Journal d\'activité');
  assert.equal(resolveSyncActivityNavigation('audit').tab, 'Vérifications');
});
