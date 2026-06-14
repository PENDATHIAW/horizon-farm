import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITE_SUIVI_TABS, resolveActiviteSuiviTab, resolveActiviteSuiviNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('activite_suivi — 4 onglets canoniques', () => {
  assert.equal(ACTIVITE_SUIVI_TABS.length, 4);
  assert.deepEqual(MODULE_TARGET_TABS.activite_suivi, ACTIVITE_SUIVI_TABS);
});

test('resolveActiviteSuiviTab — aliases anciens onglets', () => {
  assert.equal(resolveActiviteSuiviTab('Résumé'), 'Cockpit & décisions');
  assert.equal(resolveActiviteSuiviTab('Alertes'), 'À traiter maintenant');
  assert.equal(resolveActiviteSuiviTab('Tâches'), 'À traiter maintenant');
  assert.equal(resolveActiviteSuiviTab('Traçabilité'), 'Registre & traçabilité');
  assert.equal(resolveActiviteSuiviTab('Graphiques'), 'Performance & analytique');
  assert.equal(resolveActiviteSuiviNavigation('Alertes').tab, 'À traiter maintenant');
});
