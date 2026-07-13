import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveCentreTab } from '../../src/utils/commercialNavigation.js';
import { CENTRE_HEY_HORIZON_QUESTIONS } from '../../src/utils/centreHeyHorizon.js';

const TAB_IDS = MODULE_TARGET_TABS.centre_decisionnel;

test('le Centre décisionnel expose les 5 onglets cibles', () => {
  assert.deepEqual(TAB_IDS, ['À traiter', 'Écarts', 'Risques', 'Décisions', 'Historique']);
  assert.deepEqual(MODULE_TARGET_TABS.centre_ia, TAB_IDS);
});

test('les anciens onglets se résolvent vers les vues cibles', () => {
  assert.equal(resolveCentreTab('Urgences & risques'), 'À traiter');
  assert.equal(resolveCentreTab('Priorités'), 'À traiter');
  assert.equal(resolveCentreTab('Flux & stocks'), 'À traiter');
  assert.equal(resolveCentreTab('Écarts & cohérence'), 'Écarts');
  assert.equal(resolveCentreTab('Croissance & opportunités'), 'Décisions');
  assert.equal(resolveCentreTab('Recommandations'), 'Décisions');
  assert.equal(resolveCentreTab('Performance'), 'Décisions');
  assert.equal(resolveCentreTab('Rentabilité lots'), 'Décisions');
  assert.equal(resolveCentreTab('Graphiques'), 'Décisions');
  assert.equal(resolveCentreTab('Saisons & marchés'), 'Risques');
  assert.equal(resolveCentreTab('Cycles'), 'Risques');
  assert.equal(resolveCentreTab('Historique'), 'Historique');
  assert.equal(resolveCentreTab('inconnu'), 'À traiter');
});

test('les questions Hey Horizon pointent vers des onglets valides', () => {
  CENTRE_HEY_HORIZON_QUESTIONS.forEach((item) => {
    assert.ok(TAB_IDS.includes(resolveCentreTab(item.tab)), `onglet invalide pour ${item.id}: ${item.tab}`);
  });
  assert.equal(CENTRE_HEY_HORIZON_QUESTIONS.length, 3);
});
