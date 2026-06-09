import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildReproductionProofDocument } from '../../src/utils/reproductionMetrics.js';
import { buildProductionHubSnapshot } from '../../src/utils/productionHubMetrics.js';
import { setupTestStorage } from './helpers/moduleTabTestHarness.js';

setupTestStorage();

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const reproPanelSrc = readFileSync(join(root, 'src/modules/elevage/ElevageReproductionPanel.jsx'), 'utf8');
const productionHubSrc = readFileSync(join(root, 'src/modules/elevage/ProductionHub.jsx'), 'utf8');

test('Reproduction — cartes mise bas distinctes (workflow vs fiche jeune)', () => {
  assert.match(reproPanelSrc, /Workflow portée \(mise bas\)/);
  assert.match(reproPanelSrc, /Fiche jeune \(1 animal\)/);
  assert.doesNotMatch(reproPanelSrc, /\+ Naissance \/ mise bas \(fiche\)/);
  assert.match(reproPanelSrc, /Naissance : quel bouton/);
});

test('buildReproductionProofDocument — lien mère et photo', () => {
  const doc = buildReproductionProofDocument({
    id: 'DOC-1',
    title: 'Portée photo',
    animalId: 'BOV-1',
    date: '2026-06-09',
    notes: 'test',
    preuve_photo_data: 'data:image/png;base64,abc',
    preuve_file_name: 'portee.jpg',
    preuve_mime_type: 'image/jpeg',
  });
  assert.equal(doc.module_source, 'reproduction');
  assert.equal(doc.entity_type, 'animal');
  assert.equal(doc.entity_id, 'BOV-1');
  assert.equal(doc.animal_id, 'BOV-1');
  assert.equal(doc.file_url, 'data:image/png;base64,abc');
  assert.equal(doc.verification_status, 'a_verifier');
  assert.equal(doc.storage_mode, 'photo_upload');
});

test('Production — hub orienté performances (pas registre hero)', () => {
  assert.match(productionHubSrc, /Performances & rendements/);
  assert.match(productionHubSrc, /Œufs vendables \(7 j\)/);
  assert.match(productionHubSrc, /Marge technique/);
  assert.match(productionHubSrc, /Registre bovins/);
  assert.doesNotMatch(productionHubSrc, /Lots chair actifs/);
});

test('buildProductionHubSnapshot — bloc performance agrégé', () => {
  const snap = buildProductionHubSnapshot({
    lots: [
      { id: 'L1', type: 'Chair', name: 'Chair A', initial_count: 100, current_count: 90, mortality: 10, weight_avg: 1.8, status: 'actif' },
      { id: 'L2', type: 'Pondeuse', name: 'Ponte', initial_count: 200, current_count: 200, taux_ponte: 85 },
    ],
    animaux: [
      { id: 'B1', type: 'Bovin', espece: 'bovin', name: 'Taureau', poids: 440, poids_cible: 450, poids_entree: 200, age_days: 400, status: 'actif' },
    ],
    productionLogs: [
      { id: 'P1', lot_id: 'L2', date: new Date().toISOString().slice(0, 10), oeufs_produits: 100, oeufs_casses: 10 },
    ],
    stocks: [],
    transformationRows: [],
    documents: [],
    opportunities: [],
    marginContext: { feedLogs: [], productionLogs: [], healthEvents: [] },
  });
  assert.ok(snap.performance);
  assert.equal(snap.performance.sellableEggs7d, 90);
  assert.ok(snap.performance.eggBreakRate7d > 0);
  assert.ok(snap.performance.layingRateAvg > 0);
});
