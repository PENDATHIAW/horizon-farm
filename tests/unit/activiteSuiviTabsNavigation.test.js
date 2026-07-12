import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITE_SUIVI_TABS, resolveActiviteSuiviTab, resolveActiviteSuiviNavigation, navigateActiviteSuiviTab } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('activite_suivi — 5 vues canoniques et 5 libellés cibles', () => {
  assert.deepEqual(ACTIVITE_SUIVI_TABS, ['ActiviteTodoView', 'ActiviteCalendarView', 'ActiviteAlertsView', 'ActiviteJournalView', 'ActiviteHistoryView']);
  assert.deepEqual(MODULE_TARGET_TABS.activite_suivi, ['À faire', 'Calendrier', 'Alertes liées', 'Journal d’exploitation', 'Historique']);
});

test('resolveActiviteSuiviTab — aliases anciens onglets', () => {
  assert.equal(resolveActiviteSuiviTab('Résumé'), 'ActiviteAlertsView');
  assert.equal(resolveActiviteSuiviTab('Alertes'), 'ActiviteAlertsView');
  assert.equal(resolveActiviteSuiviTab('A traiter maintenant'), 'ActiviteTodoView');
  assert.equal(resolveActiviteSuiviTab('À faire'), 'ActiviteTodoView');
  assert.equal(resolveActiviteSuiviTab('Tâches'), 'ActiviteTodoView');
  assert.equal(resolveActiviteSuiviTab('Traçabilité'), 'ActiviteJournalView');
  assert.equal(resolveActiviteSuiviTab('Graphiques'), 'ActiviteHistoryView');
  assert.equal(resolveActiviteSuiviNavigation('Alertes').tab, 'ActiviteAlertsView');
  assert.equal(resolveActiviteSuiviTab('Calendrier'), 'ActiviteCalendarView');
});

test('navigateActiviteSuiviTab — conserve alias brut', () => {
  const calls = [];
  const resolved = navigateActiviteSuiviTab((module, opts) => calls.push({ module, ...opts }), 'Alertes');
  assert.equal(resolved, 'ActiviteAlertsView');
  assert.deepEqual(calls, [{ module: 'activite_suivi', tab: 'Alertes' }]);
});
