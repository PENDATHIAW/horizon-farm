import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import {
  navigateDocumentsTab,
  navigationOptionsForFinding,
  resolveDocumentsTab,
} from '../../src/utils/commercialNavigation.js';

test('MODULE_TARGET_TABS.documents_rapports — 5 onglets', () => {
  assert.equal(MODULE_TARGET_TABS.documents_rapports.length, 5);
});

test('resolveDocumentsTab — alias Preuves et Rapports', () => {
  assert.equal(resolveDocumentsTab('Preuves'), 'DocumentsEvidenceView');
  assert.equal(resolveDocumentsTab('Rapports'), 'ReportsLifecycleView');
  assert.equal(resolveDocumentsTab('Résumé'), 'ReportsArchivesView');
  assert.equal(resolveDocumentsTab('OCR'), 'DocumentsLibraryView');
});

test('navigateDocumentsTab — conserve alias brut', () => {
  const calls = [];
  const resolved = navigateDocumentsTab((module, opts) => calls.push({ module, ...opts }), 'Preuves');
  assert.equal(resolved, 'DocumentsEvidenceView');
  assert.deepEqual(calls, [{ module: 'documents_rapports', tab: 'Preuves' }]);
});

test('navigationOptionsForFinding — alias documents conservé', () => {
  const nav = navigationOptionsForFinding({ module: 'documents_rapports', tab: 'Preuves' });
  assert.equal(nav.module, 'documents_rapports');
  assert.equal(nav.tab, 'Preuves');
});
