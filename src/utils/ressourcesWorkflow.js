/**
 * Chantier 6 — RH, Équipements, Smart Farm : une saisie → finance, documents, tâches, alertes, traçabilité.
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { financeIds, documentIds, alertIds } from './sideEffectIds.js';
import {
  buildEquipmentRepairWorkflow,
  equipmentActionKey,
  equipmentLabel,
  findOpenEquipmentAlert,
  findOpenEquipmentTask,
} from './equipmentWorkflows.js';
import {
  runEquipmentBreakdownSideEffects,
} from './equipmentSideEffects.js';
import {
  buildSmartFarmDeviceFollowUp,
  isSmartFarmDeviceCritical,
  smartFarmActionKey,
  smartDeviceLabel,
} from './smartFarmWorkflows.js';
import { buildRhSalaryWorkflow, rhPayrollOf } from './rhWorkflows.js';
import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const RESSOURCES_DOMAINS = {
  MAINTENANCE: 'maintenance',
  SMARTFARM: 'smartfarm',
  PAYROLL: 'paie',
};

export function buildRessourcesIssueKey(domain = '', recordId = '', suffix = '') {
  const d = clean(domain) || 'ressources';
  const id = clean(recordId) || 'record';
  const tail = clean(suffix);
  return tail ? `ressources:${d}:${id}:${tail}` : `ressources:${d}:${id}`;
}

const closedStatuses = ['termine', 'terminé', 'done', 'closed', 'resolue', 'résolue', 'annule', 'annulé'];
const isClosed = (row = {}) => closedStatuses.includes(lower(row.status || row.statut));

export function validateEquipmentMaintenanceForm(form = {}) {
  if (!clean(form.equipment_id)) return 'Équipement obligatoire.';
  if (lower(form.action) === 'complete' && num(form.cost) < 0) return 'Coût invalide.';
  return '';
}

export function validateRhPayrollForm(form = {}) {
  if (!clean(form.person_id)) return 'Personne RH obligatoire.';
  const amount = num(form.amount ?? form.montant);
  if (amount <= 0) return 'Montant paie obligatoire.';
  return '';
}

export function validateSmartDeviceForm(form = {}) {
  if (!clean(form.device_id)) return 'Appareil obligatoire.';
  return '';
}

/** Maintenance équipement : tâche, alerte (panne critique), finance, document, événement, statut. */
export async function commitEquipmentMaintenance({
  form = {},
  context = {},
  handlers = {},
} = {}) {
  const err = validateEquipmentMaintenanceForm(form);
  if (err) throw new Error(err);

  const equipmentId = clean(form.equipment_id);
  const equipment = arr(context.equipment).find((row) => clean(row.id) === equipmentId);
  if (!equipment) throw new Error('Équipement introuvable');

  const action = lower(form.action || 'schedule');
  const date = form.date || today();
  const cost = num(form.cost ?? form.amount ?? form.cout);
  const note = form.notes || form.note || '';
  const maintenanceId = clean(form.maintenance_id) || makeId('MAINT');
  const issueKey = buildRessourcesIssueKey(RESSOURCES_DOMAINS.MAINTENANCE, maintenanceId);
  const isCritical = ['panne', 'critique'].includes(lower(form.priority))
    || ['panne', 'hors_service'].includes(lower(equipment.status || equipment.statut));

  if (action === 'panne' || action === 'breakdown') {
    return commitEquipmentBreakdown({
      form: { equipment_id: equipmentId, priority: form.priority || 'critique', notes: note, date },
      context,
      handlers,
    });
  }

  if (action === 'complete' || action === 'repair') {
    const tasks = arr(context.tasks);
    const alertes = arr(context.alertes);
    const task = findOpenEquipmentTask(equipment, tasks);
    const alert = findOpenEquipmentAlert(equipment, alertes);
    const raw = buildEquipmentRepairWorkflow({
      equipment,
      task,
      alert,
      cost,
      note,
      date,
    });
    if (!raw) throw new Error('Clôture maintenance impossible');

    const trxId = cost > 0 ? financeIds.equipment(equipmentId, `maint-${maintenanceId}`) : '';
    const docId = cost > 0 ? documentIds.equipmentRepair(equipmentId) : '';
    const financeRow = raw.financeTransaction && cost > 0 ? {
      ...raw.financeTransaction,
      id: trxId,
      issue_key: issueKey,
      side_effects_managed: true,
    } : null;
    const documentRow = raw.document && cost > 0 ? {
      ...raw.document,
      id: docId,
      transaction_id: trxId,
      file_url: form.document_url || form.preuve_url || form.invoice_url || '',
      issue_key: issueKey,
      side_effects_managed: true,
    } : null;

    await handlers.onUpdateEquipment?.(equipmentId, {
      ...raw.equipmentPatch,
      maintenance_status: 'termine',
      last_maintenance_id: maintenanceId,
      issue_key: issueKey,
    });

    if (raw.taskPatch?.id && handlers.onUpdateTask) {
      await handlers.onUpdateTask(raw.taskPatch.id, {
        ...raw.taskPatch.patch,
        issue_key: issueKey,
      });
    }
    if (raw.alertPatch?.id && handlers.onUpdateAlert) {
      await handlers.onUpdateAlert(raw.alertPatch.id, {
        ...raw.alertPatch.patch,
        issue_key: issueKey,
      });
    }

    if (financeRow) {
      const exists = arr(context.transactions).some((t) => clean(t.id) === clean(financeRow.id));
      if (!exists && handlers.onCreateFinanceTransaction) {
        await handlers.onCreateFinanceTransaction(financeRow);
      }
      await syncFinanceSideEffects(exists || financeRow, {
        handlers,
        document: documentRow,
      });
    }
    if (documentRow && (form.document_url || form.preuve_url) && handlers.onCreateDocument) {
      await handlers.onCreateDocument(documentRow);
    } else if (documentRow && handlers.onCreateDocument) {
      const docExists = arr(context.documents).some((d) => clean(d.id) === clean(docId));
      if (!docExists) await handlers.onCreateDocument(documentRow);
    }

    if (raw.event && handlers.onCreateBusinessEvent) {
      await handlers.onCreateBusinessEvent({
        ...raw.event,
        id: makeId('EVT'),
        issue_key: issueKey,
        linked_maintenance_id: maintenanceId,
        side_effects_managed: true,
      });
    }

    if (handlers.onCreateTrace) {
      await handlers.onCreateTrace({
        id: `TRA-EQP-${equipmentId}-${maintenanceId}`,
        type: 'equipement',
        source_id: equipmentId,
        source_module: 'equipements',
        etapes: [{
          date,
          titre: 'Maintenance clôturée',
          event_type: 'maintenance_equipement',
          montant: cost,
          details: note || equipmentLabel(equipment),
        }],
        issue_key: issueKey,
        side_effects_managed: true,
      });
    }

    return { ok: true, maintenanceId, issueKey, action: 'complete', cost };
  }

  // schedule / prepare maintenance
  const taskKey = equipmentActionKey(equipment, 'maintenance');
  const existingTask = findOpenEquipmentTask(equipment, context.tasks);
  const existingAlert = findOpenEquipmentAlert(equipment, context.alertes);
  const taskId = existingTask?.id || makeId('TSK');

  if (!existingTask && handlers.onCreateTask) {
    await handlers.onCreateTask({
      id: taskId,
      title: `Maintenance ${equipmentLabel(equipment)}`,
      module_lie: 'equipements',
      source_module: 'equipements',
      source_record_id: equipmentId,
      related_id: equipmentId,
      task_dedupe_key: taskKey,
      action_key: taskKey,
      due_date: form.due_date || equipment.maintenance_due || date,
      priority: isCritical ? 'critique' : (form.priority || 'haute'),
      status: 'a_faire',
      checklist: 'Diagnostiquer; Valider coût; Réparer; Joindre preuve; Remettre en service',
      notes: note,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  if (isCritical && !existingAlert && handlers.onCreateAlert) {
    await handlers.onCreateAlert({
      id: alertIds.equipmentBreakdown(equipmentId),
      title: `Maintenance critique · ${equipmentLabel(equipment)}`,
      message: note || `${equipmentLabel(equipment)} nécessite une intervention urgente.`,
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipmentId,
      severity: 'critique',
      status: 'nouvelle',
      alert_dedupe_key: taskKey,
      linked_task_id: taskId,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  if (cost > 0 && handlers.onCreateFinanceTransaction) {
    const trxId = financeIds.equipment(equipmentId, `maint-plan-${maintenanceId}`);
    const exists = arr(context.transactions).some((t) => clean(t.id) === clean(trxId));
    if (!exists) {
      const financeRow = {
        id: trxId,
        type: 'sortie',
        libelle: `Maintenance ${equipmentLabel(equipment)}`,
        montant: cost,
        amount: cost,
        date,
        categorie: 'Maintenance équipements',
        module_lie: 'equipements',
        related_id: equipmentId,
        source_module: 'equipements',
        source_record_id: equipmentId,
        statut: form.mark_paid ? 'paye' : 'a_payer',
        issue_key: issueKey,
        side_effects_managed: true,
      };
      await handlers.onCreateFinanceTransaction(financeRow);
      if (form.mark_paid) await syncFinanceSideEffects(financeRow, { handlers });
    }
  }

  if ((form.document_url || form.preuve_url) && handlers.onCreateDocument) {
    const docId = documentIds.equipmentRepair(equipmentId);
    const docExists = arr(context.documents).some((d) => clean(d.id) === clean(docId));
    if (!docExists) {
      await handlers.onCreateDocument({
        id: docId,
        title: `Facture maintenance · ${equipmentLabel(equipment)}`,
        document_category: 'maintenance',
        module_source: 'equipements',
        entity_id: equipmentId,
        file_url: form.document_url || form.preuve_url,
        issue_key: issueKey,
        side_effects_managed: true,
      });
    }
  }

  const statusPatch = lower(form.target_status || equipment.status || 'maintenance');
  await handlers.onUpdateEquipment?.(equipmentId, {
    status: statusPatch === 'operationnel' ? 'operationnel' : 'maintenance',
    statut: statusPatch === 'operationnel' ? 'operationnel' : 'maintenance',
    maintenance_status: 'a_faire',
    maintenance_due: form.due_date || date,
    maintenance_cost: cost || equipment.maintenance_cost,
    cout_maintenance: cost || equipment.cout_maintenance,
    maintenance_task_id: taskId,
    last_maintenance_id: maintenanceId,
    issue_key: issueKey,
  });

  if (handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({
      id: makeId('EVT'),
      event_type: 'maintenance_equipement_preparee',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipmentId,
      title: `Maintenance · ${equipmentLabel(equipment)}`,
      description: [note, cost > 0 ? `Coût ${cost} FCFA` : ''].filter(Boolean).join(' · '),
      event_date: date,
      severity: isCritical ? 'critique' : 'warning',
      linked_task_id: taskId,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  return { ok: true, maintenanceId, issueKey, taskId, action: 'schedule', cost };
}

/** Panne équipement critique — délègue au pipeline équipement avec issue_key. */
export async function commitEquipmentBreakdown({ form = {}, context = {}, handlers = {} } = {}) {
  const equipmentId = clean(form.equipment_id);
  const equipment = arr(context.equipment).find((row) => clean(row.id) === equipmentId);
  if (!equipment) throw new Error('Équipement introuvable');

  const issueKey = buildRessourcesIssueKey(RESSOURCES_DOMAINS.MAINTENANCE, equipmentId, 'panne');
  const workflow = await runEquipmentBreakdownSideEffects({
    equipment,
    date: form.date || today(),
    note: form.notes || form.note || '',
    priority: form.priority || 'critique',
    tasks: context.tasks,
    alertes: context.alertes,
    handlers: {
      ...handlers,
      onCreateTask: handlers.onCreateTask
        ? async (row) => handlers.onCreateTask({ ...row, issue_key: issueKey })
        : undefined,
      onCreateAlert: handlers.onCreateAlert
        ? async (row) => handlers.onCreateAlert({ ...row, issue_key: issueKey })
        : undefined,
      onCreateBusinessEvent: handlers.onCreateBusinessEvent
        ? async (row) => handlers.onCreateBusinessEvent({ ...row, issue_key: issueKey })
        : undefined,
    },
  });

  return { ok: true, issueKey, workflow };
}

/** Capteur / caméra offline — alerte, tâche, équipement lié, événement (sans doublon). */
export async function commitSmartDeviceOffline({
  form = {},
  context = {},
  handlers = {},
} = {}) {
  const err = validateSmartDeviceForm(form);
  if (err) throw new Error(err);

  const kind = lower(form.kind || form.device_kind || 'capteur') === 'camera' ? 'camera' : 'capteur';
  const list = kind === 'camera' ? arr(context.cameras) : arr(context.sensors);
  const device = list.find((row) => clean(row.id) === clean(form.device_id));
  if (!device) throw new Error('Appareil introuvable');

  const patched = {
    ...device,
    status: form.status || 'offline',
    statut: form.status || 'offline',
    online: false,
    last_offline_at: now(),
    offline_reason: form.reason || form.notes || '',
  };
  if (kind === 'camera' && handlers.onUpdateCamera) {
    await handlers.onUpdateCamera(device.id, patched);
  } else if (handlers.onUpdateSensor) {
    await handlers.onUpdateSensor(device.id, patched);
  }

  const key = smartFarmActionKey(device, kind);
  const issueKey = buildRessourcesIssueKey(RESSOURCES_DOMAINS.SMARTFARM, device.id, kind);
  const existingTask = arr(context.tasks).find(
    (t) => !isClosed(t) && clean(t.task_dedupe_key || t.action_key) === key,
  );
  const existingAlert = arr(context.alertes).find(
    (a) => !isClosed(a) && clean(a.alert_dedupe_key || a.action_key) === key,
  );

  const followUp = buildSmartFarmDeviceFollowUp({
    device: patched,
    kind,
    date: form.date || today(),
    source: form.source || 'saisie',
  });

  if (!followUp && !isSmartFarmDeviceCritical(patched)) {
    return { ok: true, skipped: true, reason: 'Appareil non critique' };
  }

  const workflow = followUp || buildSmartFarmDeviceFollowUp({
    device: { ...patched, status: 'offline', statut: 'offline' },
    kind,
    date: form.date || today(),
  });

  let taskId = existingTask?.id || '';
  if (!existingTask && workflow?.task && handlers.onCreateTask) {
    taskId = workflow.task.id;
    await handlers.onCreateTask({
      ...workflow.task,
      issue_key: issueKey,
      equipment_id: device.equipment_id || device.linked_equipment_id || '',
      zone: device.zone || device.location || '',
    });
  }

  const strategic = form.strategic === true
    || device.strategic === true
    || device.critique === true
    || isSmartFarmDeviceCritical(patched);

  if (strategic && !existingAlert && workflow?.alert && handlers.onCreateAlert) {
    await handlers.onCreateAlert({
      ...workflow.alert,
      id: `ALT-SF-${clean(device.id)}`,
      alert_dedupe_key: key,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  const equipmentId = clean(device.equipment_id || device.linked_equipment_id || form.equipment_id);
  if (equipmentId && handlers.onUpdateEquipment) {
    const eq = arr(context.equipment).find((e) => clean(e.id) === equipmentId);
    if (eq) {
      await handlers.onUpdateEquipment(equipmentId, {
        smartfarm_alert: true,
        dernier_signal_smartfarm: now(),
        zone: eq.zone || device.zone,
      });
    }
  }

  if (workflow?.event && handlers.onCreateBusinessEvent) {
    const eventExists = arr(context.businessEvents).some(
      (e) => clean(e.issue_key) === issueKey && !isClosed(e),
    );
    if (!eventExists) {
      await handlers.onCreateBusinessEvent({
        ...workflow.event,
        issue_key: issueKey,
        equipment_id: equipmentId || null,
        side_effects_managed: true,
      });
    }
  }

  if (handlers.onCreateTrace) {
    await handlers.onCreateTrace({
      id: `TRA-SF-${device.id}`,
      type: kind,
      source_id: device.id,
      source_module: 'smartfarm',
      etapes: [{
        date: form.date || today(),
        titre: `${kind === 'camera' ? 'Caméra' : 'Capteur'} offline`,
        event_type: 'smartfarm_offline',
        details: form.reason || smartDeviceLabel(device, kind),
      }],
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  return { ok: true, issueKey, taskId, strategic, deviceId: device.id };
}

/** Paie RH — finance, document, événement, coût MO (sans doublon finance). */
export async function commitRhPayroll({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateRhPayrollForm(form);
  if (err) throw new Error(err);

  const personId = clean(form.person_id);
  const person = arr(context.people).find((p) => clean(p.id) === personId);
  if (!person) throw new Error('Personne RH introuvable');

  const period = clean(form.period) || (form.date || today()).slice(0, 7);
  const paid = num(form.amount ?? form.montant) || rhPayrollOf(person).net;
  const trxId = financeIds.rhPayroll(personId, period);
  const issueKey = buildRessourcesIssueKey(RESSOURCES_DOMAINS.PAYROLL, `${personId}-${period}`);

  const exists = arr(context.transactions).some((t) => clean(t.id) === clean(trxId));
  if (exists) throw new Error(`Paie déjà enregistrée pour ${period}`);

  const workflow = buildRhSalaryWorkflow({
    person,
    teams: context.teams,
    amount: paid,
    date: form.date || today(),
    transactionId: trxId,
  });
  if (!workflow) throw new Error('Montant paie invalide');

  const financeRow = {
    ...workflow.financeTransaction,
    id: trxId,
    issue_key: issueKey,
    side_effects_managed: true,
  };
  const documentRow = {
    ...workflow.document,
    id: documentIds.rhPayroll(personId, period),
    issue_key: issueKey,
    file_url: form.document_url || form.preuve_url || workflow.document?.file_url || '',
    side_effects_managed: true,
  };

  await handlers.onCreateFinanceTransaction?.(financeRow);
  await syncFinanceSideEffects(financeRow, { handlers, document: documentRow });

  if ((form.document_url || form.preuve_url || form.create_document !== false) && handlers.onCreateDocument) {
    const docExists = arr(context.documents).some((d) => clean(d.id) === clean(documentRow.id));
    if (!docExists) await handlers.onCreateDocument(documentRow);
  }

  await handlers.onUpdatePerson?.(personId, {
    ...workflow.personPatch,
    issue_key: issueKey,
    cout_main_oeuvre_mois: paid,
    payroll_period_paid: period,
  });

  if (handlers.onPersistPeople) {
    const next = arr(context.people).map((p) => (
      clean(p.id) === personId ? { ...p, ...workflow.personPatch, cout_main_oeuvre_mois: paid } : p
    ));
    await handlers.onPersistPeople(next);
  }

  if (workflow.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({
      ...workflow.event,
      issue_key: issueKey,
      payroll_period: period,
      side_effects_managed: true,
    });
  }

  return { ok: true, issueKey, transactionId: trxId, amount: paid, period };
}

/** Scénario intégré pour tests. */
export async function runRessourcesScenario(handlersFactory) {
  const state = {
    equipment: [{ id: 'EQ-1', nom: 'Pompe irrigation', status: 'operationnel', statut: 'operationnel' }],
    sensors: [{ id: 'SENS-1', nom: 'Humidité serre', zone: 'Serre A', status: 'ok', equipment_id: 'EQ-1', strategic: true }],
    cameras: [],
    people: [{ id: 'RH-1', nom: 'Awa Diop', statut: 'actif', salaire_mensuel: 150000, prime_mensuelle: 10000, avance_mois: 0 }],
    teams: [],
    tasks: [],
    alertes: [],
    transactions: [],
    documents: [],
    events: [],
  };

  const handlers = {
    onUpdateEquipment: async (id, patch) => {
      const i = state.equipment.findIndex((e) => e.id === id);
      if (i >= 0) state.equipment[i] = { ...state.equipment[i], ...patch };
    },
    onCreateTask: async (row) => { state.tasks.push(row); },
    onUpdateTask: async (id, patch) => {
      const i = state.tasks.findIndex((t) => t.id === id);
      if (i >= 0) state.tasks[i] = { ...state.tasks[i], ...patch };
    },
    onCreateAlert: async (row) => { state.alertes.push(row); },
    onUpdateAlert: async (id, patch) => {
      const i = state.alertes.findIndex((a) => a.id === id);
      if (i >= 0) state.alertes[i] = { ...state.alertes[i], ...patch };
    },
    onCreateFinanceTransaction: async (row) => { state.transactions.push(row); },
    onCreateDocument: async (row) => { state.documents.push(row); },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
    onUpdateSensor: async (id, patch) => {
      const i = state.sensors.findIndex((s) => s.id === id);
      if (i >= 0) state.sensors[i] = { ...state.sensors[i], ...patch };
    },
    onUpdatePerson: async (id, patch) => {
      const i = state.people.findIndex((p) => p.id === id);
      if (i >= 0) state.people[i] = { ...state.people[i], ...patch };
    },
    onPersistPeople: async (people) => { state.people = people; },
    onCreateTrace: async () => {},
    ...handlersFactory?.(state),
  };

  const ctx = () => ({
    equipment: state.equipment,
    sensors: state.sensors,
    cameras: state.cameras,
    people: state.people,
    teams: state.teams,
    tasks: state.tasks,
    alertes: state.alertes,
    transactions: state.transactions,
    documents: state.documents,
    businessEvents: state.events,
  });

  await commitEquipmentMaintenance({
    form: {
      equipment_id: 'EQ-1',
      action: 'schedule',
      cost: 25000,
      priority: 'haute',
      date: '2026-06-01',
      notes: 'Révision pompe',
    },
    context: ctx(),
    handlers,
  });

  await commitEquipmentBreakdown({
    form: { equipment_id: 'EQ-1', priority: 'critique', notes: 'Panne moteur', date: '2026-06-02' },
    context: ctx(),
    handlers,
  });

  await commitEquipmentMaintenance({
    form: {
      equipment_id: 'EQ-1',
      action: 'complete',
      cost: 45000,
      date: '2026-06-03',
      notes: 'Réparation effectuée',
      mark_paid: true,
    },
    context: ctx(),
    handlers,
  });

  await commitSmartDeviceOffline({
    form: {
      device_id: 'SENS-1',
      kind: 'capteur',
      reason: 'Capteur hors ligne',
      date: '2026-06-04',
      strategic: true,
    },
    context: ctx(),
    handlers,
  });

  await commitRhPayroll({
    form: {
      person_id: 'RH-1',
      amount: 160000,
      date: '2026-06-05',
      period: '2026-06',
    },
    context: ctx(),
    handlers,
  });

  let duplicateBlocked = false;
  try {
    await commitRhPayroll({
      form: { person_id: 'RH-1', amount: 160000, date: '2026-06-05', period: '2026-06' },
      context: ctx(),
      handlers,
    });
  } catch (e) {
    duplicateBlocked = /déjà enregistrée/i.test(e.message || '');
  }

  return { state, duplicateBlocked };
}
