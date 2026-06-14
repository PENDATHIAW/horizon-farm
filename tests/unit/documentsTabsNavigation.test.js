import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENTS_RAPPORTS_TABS, resolveDocumentsTab, resolveDocumentsNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('documents_rapports — 4 onglets canoniques', () => {
  assert.equal(DOCUMENTS_RAPPORTS_TABS.length, 4);
  assert.deepEqual(MODULE_TARGET_TABS.documents_rapports, DOCUMENTS_RAPPORTS_TABS);
});

test('resolveDocumentsTab — aliases anciens onglets', () => {
  assert.equal(resolveDocumentsTab('Résumé'), 'Centre de contrôle');
  assert.equal(resolveDocumentsTab('Bibliothèque'), 'Gestionnaire & OCR');
  assert.equal(resolveDocumentsTab('Preuves'), 'Rapprochement & preuves');
  assert.equal(resolveDocumentsTab('Graphiques'), 'Rapports & exports');
  assert.equal(resolveDocumentsTab('Modèles'), 'Gestionnaire & OCR');
  assert.equal(resolveDocumentsNavigation('Exports').tab, 'Rapports & exports');
});
