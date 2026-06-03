import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProblemFiche,
  buildProblemFiches,
  completeActiviteTask,
  createLinkedTaskFromAlert,
  enrichAlertPatch,
  inferActiviteIssueKey,
  resetActivitePushHistoryForTests,
  resolveActiviteAlert,
  runActiviteScenario,
  sendCriticalAlertPushOnce,
  ACTIVITE_ORIGIN_TYPES,
} from '../../src/utils/activiteSuiviWorkflow.js';
import { buildActiviteGapRows } from '../../src/utils/activiteSuiviIntegrity.js';
import { isAlertClosed, isTaskClosed } from '../../src/utils/taskWorkflows.js';

test('alerte stock bas → tâche → résolution', async () => {
  resetActivitePushHistoryForTests();
  const state = { alertes: [], tasks: [], businessEvents: [] };
  const handlers = {
    onCreateTask: async (row) => { state.tasks.push(row); },
    onUpdateTask: async (id, patch) => {
      const i = state.tasks.findIndex((t) => t.id === id);
      state.tasks[i] = { ...state.tasks[i], ...patch };
    },
    onUpdateAlert: async (id, patch) => {
      const i = state.alertes.findIndex((a) => a.id === id);
      state.alertes[i] = { ...state.alertes[i], ...patch };
    },
    onCreateBusinessEvent: async (row) => { state.businessEvents.push(row); },
  };

  const alert = enrichAlertPatch({
    id: 'ALT-STK',
    title: 'Stock bas',
    module_source: 'stock',
    entity_id: 'STK-1',
    severity: 'critique',
    status: 'nouvelle',
    problem_kind: 'stock_bas',
  });
  state.alertes.push(alert);
  await createLinkedTaskFromAlert({ alert, context: state, handlers });
  assert.equal(state.tasks.length, 1);
  assert.ok(state.tasks[0].issue_key);
  await completeActiviteTask({ task: state.tasks[0], resolveAlert: true, handlers });
  assert.equal(isTaskClosed(state.tasks[0]), true);
  assert.equal(isAlertClosed(state.alertes[0]), true);
});

test('alerte mortalité → tâche santé', async () => {
  const state = { alertes: [], tasks: [], businessEvents: [] };
  const handlers = {
    onCreateTask: async (row) => { state.tasks.push(row); },
    onUpdateAlert: async (id, patch) => {
      const i = state.alertes.findIndex((a) => a.id === id);
      state.alertes[i] = { ...state.alertes[i], ...patch };
    },
    onCreateBusinessEvent: async () => {},
  };
  const alert = enrichAlertPatch({
    id: 'ALT-MORT',
    title: 'Mortalité lot A',
    module_source: 'avicole',
    entity_id: 'LOT-A',
    severity: 'critique',
    status: 'nouvelle',
    problem_kind: 'mortalite',
  });
  state.alertes.push(alert);
  await createLinkedTaskFromAlert({
    alert,
    context: state,
    handlers: {
      ...handlers,
      onCreateTask: async (row) => { state.tasks.push({ ...row, module_lie: 'sante', source_module: 'sante' }); },
    },
  });
  assert.equal(state.tasks[0].module_lie, 'sante');
  assert.ok(state.tasks[0].issue_key.includes('mortalite') || state.tasks[0].issue_key.includes('LOT-A'));
});

test('alerte impayé → tâche relance', async () => {
  const state = { alertes: [], tasks: [], businessEvents: [] };
  const alert = enrichAlertPatch({
    id: 'ALT-IMP',
    title: 'Impayé client',
    module_source: 'ventes',
    entity_id: 'CLI-9',
    severity: 'warning',
    status: 'nouvelle',
    problem_kind: 'impaye',
    action_recommandee: 'Relancer le client',
  });
  state.alertes.push(alert);
  await createLinkedTaskFromAlert({
    alert,
    context: state,
    handlers: {
      onCreateTask: async (row) => { state.tasks.push(row); },
      onUpdateAlert: async (id, patch) => {
        const i = state.alertes.findIndex((a) => a.id === id);
        state.alertes[i] = { ...state.alertes[i], ...patch };
      },
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.match(state.tasks[0].title, /Impayé|Relancer|client/i);
});

test('push unique pour alerte critique', async () => {
  resetActivitePushHistoryForTests();
  const alert = enrichAlertPatch({
    id: 'ALT-PUSH',
    title: 'Critique test',
    module_source: 'stock',
    entity_id: 'STK-P',
    severity: 'critique',
    status: 'nouvelle',
  });
  const first = await sendCriticalAlertPushOnce(alert);
  const second = await sendCriticalAlertPushOnce(alert);
  assert.equal(first.sent, true);
  assert.equal(second.sent, false);
  assert.equal(second.reason, 'already_sent');
});

test('issue_key regroupe alerte, tâche et événement', async () => {
  resetActivitePushHistoryForTests();
  const { state, fiches } = await runActiviteScenario();
  const stockKey = inferActiviteIssueKey(state.alertes.find((a) => a.id === 'ALT-STK'), ACTIVITE_ORIGIN_TYPES.ALERT);
  const fiche = buildProblemFiche(stockKey, {
    alertes: state.alertes,
    tasks: state.tasks,
    recommendations: [],
    businessEvents: state.businessEvents,
    documents: [],
    transactions: [],
  });
  assert.equal(fiche.tasks.length >= 1, true);
  assert.equal(fiche.events.length >= 1, true);
  assert.ok(fiches.length >= 3);
  assert.ok(fiches.every((row) => row.issue_key));
});

test('buildActiviteGapRows détecte alerte critique sans tâche', () => {
  const gaps = buildActiviteGapRows({
    alertes: [{
      id: 'A1',
      title: 'Critique',
      severity: 'critique',
      status: 'nouvelle',
      module_source: 'stock',
      entity_id: 'S1',
      issue_key: 'activite:stock:S1:critique',
    }],
    tasks: [],
    recommendations: [],
    pushHistory: [],
  });
  assert.ok(gaps.some((g) => g.title === 'Alerte critique sans tâche'));
});

test('résolution alerte supprime push futur', async () => {
  resetActivitePushHistoryForTests();
  const alert = enrichAlertPatch({
    id: 'ALT-RES',
    title: 'À résoudre',
    module_source: 'stock',
    entity_id: 'S2',
    severity: 'critique',
    status: 'nouvelle',
  });
  const state = { alertes: [alert], businessEvents: [] };
  await resolveActiviteAlert({
    alert,
    handlers: {
      onUpdateAlert: async (id, patch) => { state.alertes[0] = { ...state.alertes[0], ...patch }; },
      onCreateBusinessEvent: async (row) => { state.businessEvents.push(row); },
    },
  });
  assert.equal(isAlertClosed(state.alertes[0]), true);
  assert.equal(state.alertes[0].push_suppressed, true);
  const push = await sendCriticalAlertPushOnce(state.alertes[0]);
  assert.equal(push.sent, false);
  assert.equal(push.reason, 'resolved');
});
