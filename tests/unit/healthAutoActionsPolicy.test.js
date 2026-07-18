import test from 'node:test';
import assert from 'node:assert/strict';

// localStorage minimal pour le module (dédup persistée).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

const { applyErpHealthAutoActions } = await import('../../src/services/erpHealthAutoActions.js');

function makeReport(findings) {
  return { autoTasks: findings, autoAlerts: [], findings };
}

test('applyErpHealthAutoActions — tâche auto seulement pour critique/haute', async () => {
  globalThis.localStorage.clear();
  const created = [];
  const findings = [
    { id: 'f-crit', title: 'Rupture totale', severity: 'critique', auto_action: 'create_task', module: 'achats_stock' },
    { id: 'f-haute', title: 'Fuite eau', severity: 'haute', auto_action: 'create_task', module: 'finance_pilotage' },
    { id: 'f-moy', title: 'Sol un peu sec', severity: 'moyenne', auto_action: 'create_task', module: 'cultures' },
    { id: 'f-basse', title: 'Batterie', severity: 'basse', auto_action: 'create_task', module: 'smartfarm' },
  ];
  const res = await applyErpHealthAutoActions(makeReport(findings), {
    existingTasks: [],
    existingAlerts: [],
    onCreateTask: async (t) => { created.push(t); },
  });
  const titles = created.map((t) => t.title);
  assert.ok(titles.includes('Rupture totale'), 'critique doit créer une tâche');
  assert.ok(titles.includes('Fuite eau'), 'haute doit créer une tâche');
  assert.ok(!titles.some((t) => t.includes('Sol un peu sec')), 'moyenne = pas de tâche auto');
  assert.ok(!titles.some((t) => t.includes('Batterie')), 'basse = pas de tâche auto');
  assert.equal(res.createdTasks, 2);
});
