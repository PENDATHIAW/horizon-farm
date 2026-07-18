import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureCriticalAlertTask, isCriticalAlert } from '../../src/utils/criticalAlertAutomation.js';

test('isCriticalAlert: urgence/critique = critique, warning/info = non', () => {
  assert.equal(isCriticalAlert({ severity: 'urgence' }), true);
  assert.equal(isCriticalAlert({ severity: 'critique' }), true);
  assert.equal(isCriticalAlert({ severity: 'warning' }), false);
  assert.equal(isCriticalAlert({ severity: 'info' }), false);
});

test('ensureCriticalAlertTask: crée une tâche pour une alerte critique', async () => {
  const created = [];
  const patched = [];
  const task = await ensureCriticalAlertTask(
    { id: 'ALERT-1', severity: 'critique', title: 'Mortalité anormale lot 3', module_source: 'avicole' },
    { existingTasks: [], onCreateTask: (t) => { created.push(t); }, onUpdateAlert: async (id, patch) => { patched.push([id, patch]); } },
  );
  assert.ok(task, 'une tâche doit être retournée');
  assert.equal(created.length, 1);
  assert.equal(created[0].created_from, 'critical_alert_auto');
  assert.equal(String(created[0].source_record_id || created[0].alert_id || ''), 'ALERT-1');
  assert.equal(patched.length, 1);
});

test('ensureCriticalAlertTask: pas de doublon si une tâche ouverte existe déjà', async () => {
  const created = [];
  const existingTasks = [{ id: 'T1', source_record_id: 'ALERT-1', status: 'a_faire' }];
  const task = await ensureCriticalAlertTask(
    { id: 'ALERT-1', severity: 'critique', title: 'Mortalité anormale lot 3' },
    { existingTasks, onCreateTask: (t) => { created.push(t); } },
  );
  assert.equal(task, null);
  assert.equal(created.length, 0);
});

test('ensureCriticalAlertTask: ignore les alertes non critiques', async () => {
  const created = [];
  const task = await ensureCriticalAlertTask(
    { id: 'ALERT-2', severity: 'warning', title: 'Info' },
    { existingTasks: [], onCreateTask: (t) => { created.push(t); } },
  );
  assert.equal(task, null);
  assert.equal(created.length, 0);
});
