import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManureCollectionWorkflow } from '../../src/utils/manureWorkflows.js';
import { runManureCollectionSideEffects } from '../../src/utils/manureSideEffects.js';

test('biosécurité — collecte matière organique calcule poids et bloque parcelle contaminée', () => {
  const workflow = buildManureCollectionWorkflow({
    intervention: {
      id: 'SAN-BIO-1',
      zone_traitee: 'Bâtiment chair A / box 3',
      biosecurity_material_type: 'litiere_usee',
      biosecurity_status: 'contamine',
      biosecurity_destination: 'parcelle',
      biosecurity_next_step: 'Compostage contrôlé',
      fumier_sacs: 8,
      poids_estime_par_sac: 22,
    },
    target: { module_lie: 'avicole', related_id: 'LOT-1', target_summary: 'Lot chair A' },
    sacs: 8,
    lots: [{ id: 'LOT-1', type: 'chair' }],
    date: '2026-07-11',
  });

  assert.equal(workflow.stock.quantite, 8);
  assert.equal(workflow.stock.poids_total_kg, 176);
  assert.equal(workflow.event.poids_total_kg, 176);
  assert.equal(workflow.event.destination_blocked, true);
  assert.match(workflow.alert.title, /Destination culture bloquée/);
  assert.equal(workflow.task.title, 'Compostage contrôlé');
});

test('biosécurité — side effects créent stock, tâche et alerte via workflow existant', async () => {
  const created = { stocks: [], tasks: [], alerts: [], events: [] };
  await runManureCollectionSideEffects({
    intervention: {
      id: 'SAN-BIO-2',
      biosecurity_status: 'suspect',
      biosecurity_destination: 'parcelle',
      biosecurity_next_step: 'Vide sanitaire',
      poids_estime_par_sac: 15,
    },
    target: { module_lie: 'avicole', related_id: 'LOT-2', target_summary: 'Lot pondeuses' },
    sacs: 2,
    lots: [{ id: 'LOT-2', type: 'pondeuses' }],
    date: '2026-07-11',
    handlers: {
      onCreateStock: async (row) => created.stocks.push(row),
      onCreateTask: async (row) => created.tasks.push(row),
      onCreateAlert: async (row) => created.alerts.push(row),
      onCreateBusinessEvent: async (row) => created.events.push(row),
    },
  });

  assert.equal(created.stocks.length, 1);
  assert.equal(created.stocks[0].poids_total_kg, 30);
  assert.equal(created.tasks.length, 1);
  assert.equal(created.alerts.length, 1);
  assert.ok(created.events.some((event) => event.event_type === 'entree_fumier'));
});
