import test from 'node:test';
import assert from 'node:assert/strict';
import {
  navigateGestionSystemeTab,
  navigateInvestisseursTab,
  navigateSmartFarmTab,
  navigateSyncActivityTab,
  resolveGestionSystemeTab,
  resolveInvestisseursTab,
  navigationOptionsForFinding,
} from '../../src/utils/commercialNavigation.js';

test('resolveInvestisseursTab — alias Préparation et Résumé', () => {
  assert.equal(resolveInvestisseursTab('Préparation'), 'preparation');
  assert.equal(resolveInvestisseursTab('Résumé'), 'room');
  assert.equal(resolveInvestisseursTab('Data Room'), 'library');
});

test('navigateInvestisseursTab — conserve alias brut', () => {
  const calls = [];
  const resolved = navigateInvestisseursTab((module, opts) => calls.push({ module, ...opts }), 'Préparation');
  assert.equal(resolved, 'preparation');
  assert.deepEqual(calls, [{ module: 'investisseurs_forums', tab: 'Préparation' }]);
});

test('navigateSmartFarmTab — conserve alias Capteurs', () => {
  const calls = [];
  const resolved = navigateSmartFarmTab((module, opts) => calls.push({ module, ...opts }), 'Capteurs');
  assert.equal(resolved, 'Objets connectés');
  assert.deepEqual(calls, [{ module: 'smartfarm', tab: 'Capteurs' }]);
});

test('navigateSyncActivityTab — conserve alias audit', () => {
  const calls = [];
  const resolved = navigateSyncActivityTab((module, opts) => calls.push({ module, ...opts }), 'audit');
  assert.equal(resolved, 'Vérifications');
  assert.deepEqual(calls, [{ module: 'sync_activity', tab: 'audit' }]);
});

test('resolveGestionSystemeTab — alias Paramètres', () => {
  assert.equal(resolveGestionSystemeTab('Paramètres'), 'Paramètres');
  assert.equal(resolveGestionSystemeTab('settings'), 'Paramètres');
  assert.equal(resolveGestionSystemeTab('Résumé'), 'Vue admin');
});

test('navigateGestionSystemeTab — conserve alias brut', () => {
  const calls = [];
  navigateGestionSystemeTab((module, opts) => calls.push({ module, ...opts }), 'Audit');
  assert.deepEqual(calls, [{ module: 'gestion_systeme', tab: 'Audit' }]);
});

test('navigationOptionsForFinding — investisseurs et sync_activity', () => {
  const inv = navigationOptionsForFinding({ module: 'investisseurs_forums', tab: 'Préparation' });
  assert.equal(inv.module, 'investisseurs_forums');
  assert.equal(inv.tab, 'Préparation');
  const sync = navigationOptionsForFinding({ module: 'audit_logs', tab: 'journal' });
  assert.equal(sync.module, 'sync_activity');
  assert.equal(sync.tab, 'journal');
});
