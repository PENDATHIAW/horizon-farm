import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import {
  navigateDocumentsTab,
  navigationOptionsForFinding,
  resolveDocumentsTab,
} from '../../src/utils/commercialNavigation.js';

test('MODULE_TARGET_TABS.documents_rapports — 4 onglets', () => {
  assert.equal(MODULE_TARGET_TABS.documents_rapports.length, 4);
});

test('resolveDocumentsTab — alias Preuves et Rapports', () => {
  assert.equal(resolveDocumentsTab('Preuves'), 'Rapprochement & preuves');
  assert.equal(resolveDocumentsTab('Rapports'), 'Rapports & exports');
  assert.equal(resolveDocumentsTab('Résumé'), 'Centre de contrôle');
  assert.equal(resolveDocumentsTab('OCR'), 'Gestionnaire & OCR');
});

test('navigateDocumentsTab — conserve alias brut', () => {
  const calls = [];
  const resolved = navigateDocumentsTab((module, opts) => calls.push({ module, ...opts }), 'Preuves');
  assert.equal(resolved, 'Rapprochement & preuves');
  assert.deepEqual(calls, [{ module: 'documents_rapports', tab: 'Preuves' }]);
});

test('navigationOptionsForFinding — alias documents conservé', () => {
  const nav = navigationOptionsForFinding({ module: 'documents_rapports', tab: 'Preuves' });
  assert.equal(nav.module, 'documents_rapports');
  assert.equal(nav.tab, 'Preuves');
});
