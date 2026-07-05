import test from 'node:test';
import assert from 'node:assert/strict';
import { CENTRE_IA_TABS, navigateCentreTab, resolveCentreTab } from '../../src/utils/centreDecisionTabs.js';

test('resolveCentreTab conserve les 7 onglets canoniques', () => {
  CENTRE_IA_TABS.forEach((tab) => {
    assert.equal(resolveCentreTab(tab), tab);
  });
});

test('resolveCentreTab mappe les alias legacy', () => {
  assert.equal(resolveCentreTab('Opportunités'), 'Cycles');
  assert.equal(resolveCentreTab('Performance'), 'Recommandations');
  assert.equal(resolveCentreTab('Rentabilité lots'), 'Recommandations');
  assert.equal(resolveCentreTab('Flux & stocks'), 'Risques');
  assert.equal(resolveCentreTab('Efficacité'), 'À traiter');
  assert.equal(resolveCentreTab('Priorités & risques'), 'À traiter');
});

test('resolveCentreTab retombe sur À traiter si inconnu', () => {
  assert.equal(resolveCentreTab('Inexistant'), 'À traiter');
  assert.equal(resolveCentreTab(''), 'À traiter');
});

test('navigateCentreTab résout et navigue', () => {
  const calls = [];
  const resolved = navigateCentreTab((module, opts) => calls.push({ module, tab: opts?.tab }), 'Opportunités');
  assert.equal(resolved, 'Cycles');
  assert.deepEqual(calls[0], { module: 'centre_ia', tab: 'Cycles' });
});
