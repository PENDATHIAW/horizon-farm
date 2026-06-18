import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTaskPayloadFromPriorityItem,
  runPriorityAlertAction,
  runPriorityTaskAction,
} from '../../src/modules/vision/visionPriorityActions.js';

test('buildTaskPayloadFromPriorityItem titre fête depuis eventLabel', () => {
  const payload = buildTaskPayloadFromPriorityItem({
    id: 'launch-fin-annee',
    title: "Préparer Fin d'année",
    message: 'Lancer bandes avant novembre',
    category: 'launch_timing',
    task_dedupe_key: 'centre_strategique:launch_timing:launch-fin-annee:Fin d\'année',
  }, []);
  assert.match(payload.title, /Fin d'année/);
  assert.equal(payload.module_lie, 'taches');
});

test('runPriorityTaskAction crée une tâche et ouvre Activité & Suivi', async () => {
  const created = [];
  const navigated = [];
  const ok = await runPriorityTaskAction({
    id: 'launch-tabaski',
    title: 'Préparer Tabaski',
    message: 'Vérifier dates pivot',
    category: 'launch_timing',
    task_dedupe_key: 'centre_strategique:launch_timing:launch-tabaski:Tabaski',
  }, {
    existingTasks: [],
    onCreateTask: async (payload) => { created.push(payload); return payload; },
    onRefreshTasks: async () => {},
    onNavigate: (module, opts) => navigated.push({ module, opts }),
  });
  assert.equal(ok, true);
  assert.equal(created.length, 1);
  assert.equal(navigated[0]?.module, 'activite_suivi');
});

test('runPriorityTaskAction déduplique tâche existante', async () => {
  let createCalls = 0;
  const navigated = [];
  const ok = await runPriorityTaskAction({
    id: 'launch-korite',
    title: 'Préparer Korité',
    task_dedupe_key: 'centre_strategique:launch_timing:launch-korite:Korité',
  }, {
    existingTasks: [{
      id: 'TSK-001',
      title: 'Préparer Korité',
      status: 'a_faire',
      task_dedupe_key: 'centre_strategique:launch_timing:launch-korite:Korité',
    }],
    onCreateTask: async () => { createCalls += 1; },
    onNavigate: (module) => navigated.push(module),
  });
  assert.equal(ok, true);
  assert.equal(createCalls, 0);
  assert.equal(navigated[0], 'activite_suivi');
});

test('runPriorityAlertAction crée une alerte', async () => {
  const created = [];
  const ok = await runPriorityAlertAction({
    id: 'launch-korite',
    title: 'Préparer Korité',
    message: 'Date pivot dépassée',
    alert_dedupe_key: 'centre_strategique:launch_timing:launch-korite:Korité',
  }, {
    existingAlerts: [],
    onCreateAlert: async (payload) => { created.push(payload); return payload; },
    onRefreshAlertes: async () => {},
    onNavigate: () => {},
  });
  assert.equal(ok, true);
  assert.equal(created.length, 1);
  assert.equal(created[0].module_source, 'centre_decisionnel');
});
