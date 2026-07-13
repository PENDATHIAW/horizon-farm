import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENTS_RAPPORTS_TABS, resolveDocumentsTab, resolveDocumentsNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('documents_rapports — 5 vues canoniques et 5 libellés cibles', () => {
  assert.deepEqual(DOCUMENTS_RAPPORTS_TABS, ['DocumentsLibraryView', 'DocumentsEvidenceView', 'ReportsLifecycleView', 'ReportsPublicationsView', 'ReportsArchivesView']);
  assert.deepEqual(MODULE_TARGET_TABS.documents_rapports, ['Bibliothèque', 'Preuves & justificatifs', 'Rapports', 'Publications', 'Archives']);
});

test('resolveDocumentsTab — aliases anciens onglets', () => {
  assert.equal(resolveDocumentsTab('Résumé'), 'ReportsArchivesView');
  assert.equal(resolveDocumentsTab('Bibliothèque'), 'DocumentsLibraryView');
  assert.equal(resolveDocumentsTab('Preuves'), 'DocumentsEvidenceView');
  assert.equal(resolveDocumentsTab('Graphiques'), 'ReportsLifecycleView');
  assert.equal(resolveDocumentsTab('Modèles'), 'ReportsLifecycleView');
  assert.equal(resolveDocumentsNavigation('Exports').tab, 'ReportsLifecycleView');
  assert.equal(resolveDocumentsTab('Publications'), 'ReportsPublicationsView');
});
