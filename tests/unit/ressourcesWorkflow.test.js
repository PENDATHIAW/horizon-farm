import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commitEquipmentMaintenance,
  commitEquipmentBreakdown,
  commitSmartDeviceOffline,
  commitRhPayroll,
  runRessourcesScenario,
  validateEquipmentMaintenanceForm,
} from '../../src/utils/ressourcesWorkflow.js';
import { buildRessourcesGapRows } from '../../src/utils/ressourcesIntegrity.js';
import { financeIds } from '../../src/utils/sideEffectIds.js';

test('validateEquipmentMaintenanceForm requires equipment', () => {
  assert.match(validateEquipmentMaintenanceForm({}), /Équipement obligatoire/);
});

test('commitEquipmentMaintenance with cost creates task and finance', async () => {
  const state = {
    equipment: [{ id: 'EQ-1', nom: 'Pompe', status: 'operationnel', statut: 'operationnel' }],
    tasks: [],
    alertes: [],
    transactions: [],
    documents: [],
  };
  const handlers = {
    onUpdateEquipment: async (id, patch) => {
      Object.assign(state.equipment[0], patch);
    },
    onCreateTask: async (row) => state.tasks.push(row),
    onCreateAlert: async (row) => state.alertes.push(row),
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
    onCreateBusinessEvent: async () => {},
  };

  await commitEquipmentMaintenance({
    form: {
      equipment_id: 'EQ-1',
      action: 'schedule',
      cost: 30000,
      priority: 'haute',
      date: '2026-06-01',
      notes: 'Révision',
    },
    context: state,
    handlers,
  });

  assert.equal(state.tasks.length, 1);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].montant, 30000);
});

test('commitEquipmentBreakdown creates critical alert', async () => {
  const state = {
    equipment: [{ id: 'EQ-2', nom: 'Groupe', status: 'operationnel' }],
    tasks: [],
    alertes: [],
  };
  await commitEquipmentBreakdown({
    form: { equipment_id: 'EQ-2', priority: 'critique', notes: 'Panne moteur' },
    context: state,
    handlers: {
      onUpdateEquipment: async (id, patch) => Object.assign(state.equipment[0], patch),
      onCreateTask: async (row) => state.tasks.push(row),
      onCreateAlert: async (row) => state.alertes.push(row),
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.ok(state.tasks.length >= 1);
  assert.ok(state.alertes.some((a) => a.severity === 'critique' || a.severity === 'warning'));
  assert.equal(state.equipment[0].status, 'panne');
});

test('commitSmartDeviceOffline dedupes task', async () => {
  const key = 'smartfarm:capteur:SENS-1';
  const state = {
    sensors: [{ id: 'SENS-1', nom: 'Temp', zone: 'Serre', status: 'ok', strategic: true }],
    cameras: [],
    equipment: [],
    tasks: [{ id: 'TSK-OLD', task_dedupe_key: key, status: 'a_faire' }],
    alertes: [],
    businessEvents: [],
  };
  let tasksCreated = 0;
  await commitSmartDeviceOffline({
    form: { device_id: 'SENS-1', kind: 'capteur', reason: 'Offline', strategic: true },
    context: state,
    handlers: {
      onUpdateSensor: async (id, patch) => Object.assign(state.sensors[0], patch),
      onCreateTask: async () => { tasksCreated += 1; },
      onCreateAlert: async (row) => state.alertes.push(row),
      onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
    },
  });
  assert.equal(tasksCreated, 0);
  assert.equal(state.sensors[0].status, 'offline');
});

test('commitRhPayroll blocks duplicate finance', async () => {
  const state = {
    people: [{ id: 'RH-9', nom: 'Test', statut: 'actif', salaire_mensuel: 100000, prime_mensuelle: 0, avance_mois: 0 }],
    teams: [],
    transactions: [],
    documents: [],
  };
  const handlers = {
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
    onCreateDocument: async (row) => state.documents.push(row),
    onCreateBusinessEvent: async () => {},
    onUpdatePerson: async (id, patch) => Object.assign(state.people[0], patch),
    onPersistPeople: async (p) => { state.people = p; },
  };

  await commitRhPayroll({
    form: { person_id: 'RH-9', amount: 100000, date: '2026-06-05', period: '2026-06' },
    context: state,
    handlers,
  });

  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].id, financeIds.rhPayroll('RH-9', '2026-06'));

  await assert.rejects(
    () => commitRhPayroll({
      form: { person_id: 'RH-9', amount: 100000, date: '2026-06-05', period: '2026-06' },
      context: state,
      handlers,
    }),
    /déjà enregistrée/i,
  );
});

test('runRessourcesScenario integrates maintenance, smart farm and payroll', async () => {
  const { state, duplicateBlocked } = await runRessourcesScenario();
  assert.ok(state.tasks.length >= 1);
  assert.ok(state.transactions.length >= 2);
  assert.equal(duplicateBlocked, true);
  const gaps = buildRessourcesGapRows({
    equipment: state.equipment,
    sensors: state.sensors,
    tasks: state.tasks,
    alertes: state.alertes,
    transactions: state.transactions,
    documents: state.documents,
    people: state.people,
    businessEvents: state.events,
  });
  assert.ok(Array.isArray(gaps));
});
