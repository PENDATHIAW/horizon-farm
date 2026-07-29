import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterRecordsByFarmActivities,
  isActivityModuleVisible,
  isRecordActivityActive,
  recordActivityKey,
} from '../../src/config/farmActivities.js';

const fermePondeuses = { id: 'F1', activity_type: ['aviculture_pondeuses', 'agri_feeds'] };
const fermeMixte = { id: 'F2', activity_type: ['mixte'] };
const fermeSansConfig = { id: 'F3' };

test('ferme pondeuses + agri_feeds : Cultures masquée, Élevage et AGRI FEEDS visibles', () => {
  assert.equal(isActivityModuleVisible('elevage', fermePondeuses), true);
  assert.equal(isActivityModuleVisible('agri_feeds', fermePondeuses), true);
  assert.equal(isActivityModuleVisible('cultures', fermePondeuses), false);
  assert.equal(isActivityModuleVisible('smartfarm', fermePondeuses), false);
});

test('les modules de pilotage/gestion restent toujours visibles', () => {
  for (const id of ['dashboard', 'finance_pilotage', 'commercial', 'objectifs_croissance', 'financements', 'documents_rapports', 'gestion_systeme', 'centre_decisionnel']) {
    assert.equal(isActivityModuleVisible(id, fermePondeuses), true, `${id} doit rester visible`);
  }
});

test('ferme mixte : tout est visible', () => {
  assert.equal(isActivityModuleVisible('cultures', fermeMixte), true);
  assert.equal(isActivityModuleVisible('elevage', fermeMixte), true);
});

test('ferme non configurée : recentrée par défaut sur pondeuses + AGRI FEEDS', () => {
  for (const ferme of [fermeSansConfig, null]) {
    assert.equal(isActivityModuleVisible('elevage', ferme), true);
    assert.equal(isActivityModuleVisible('agri_feeds', ferme), true);
    assert.equal(isActivityModuleVisible('cultures', ferme), false);
  }
});

test('recordActivityKey classe correctement (pondeuse avant chair)', () => {
  assert.equal(recordActivityKey('Lot pondeuses B-12'), 'aviculture_pondeuses');
  assert.equal(recordActivityKey('Bande chair C-07'), 'poulets_chair');
  assert.equal(recordActivityKey('Aliment pondeuse démarrage'), 'aviculture_pondeuses');
  assert.equal(recordActivityKey('Taureau zébu'), 'embouche_bovine');
  assert.equal(recordActivityKey('Parcelle maraîchage'), 'cultures');
  assert.equal(recordActivityKey('Fournitures diverses'), null);
});

test('isRecordActivityActive : chair masquée, pondeuses gardée, transverse gardée', () => {
  assert.equal(isRecordActivityActive(fermePondeuses, 'Lot pondeuses'), true);
  assert.equal(isRecordActivityActive(fermePondeuses, 'Bande chair'), false);
  assert.equal(isRecordActivityActive(fermePondeuses, 'Bovin embouche'), false);
  // enregistrement non classable : conservé
  assert.equal(isRecordActivityActive(fermePondeuses, 'Sac de ciment'), true);
});

test('filterRecordsByFarmActivities ne garde que les pondeuses pour une ferme recentrée', () => {
  const lots = [
    { id: 'l1', name: 'Lot pondeuses A' },
    { id: 'l2', name: 'Bande chair B' },
    { id: 'l3', type: 'Bovin', name: 'Boeuf 1' },
    { id: 'l4', name: 'Divers' },
  ];
  const gardes = filterRecordsByFarmActivities(fermePondeuses, lots);
  const ids = gardes.map((l) => l.id);
  assert.deepEqual(ids, ['l1', 'l4'], 'garde pondeuses + non classable, retire chair et bovin');
});

test('filterRecordsByFarmActivities laisse tout passer pour une ferme mixte', () => {
  const lots = [{ id: 'l1', name: 'pondeuses' }, { id: 'l2', name: 'chair' }];
  assert.equal(filterRecordsByFarmActivities(fermeMixte, lots).length, 2);
});

test('filterRecordsByFarmActivities : ferme non configurée recentrée pondeuses par défaut', () => {
  const lots = [{ id: 'l1', name: 'pondeuses' }, { id: 'l2', name: 'chair' }];
  const gardes = filterRecordsByFarmActivities(fermeSansConfig, lots).map((l) => l.id);
  assert.deepEqual(gardes, ['l1'], 'chair masquée par défaut');
});
