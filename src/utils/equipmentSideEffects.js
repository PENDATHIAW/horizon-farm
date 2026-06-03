import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine.js';
import {
  buildEquipmentBreakdownFollowUp,
  buildEquipmentRepairWorkflow,
  findOpenEquipmentAlert,
  findOpenEquipmentTask,
} from './equipmentWorkflows.js';
import { alertIds, documentIds, financeIds } from './sideEffectIds.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

function withDeterministicEquipmentIds(workflow = {}, equipment = {}) {
  if (!workflow) return null;
  const equipmentId = clean(equipment.id);
  const next = { ...workflow };
  if (next.financeTransaction) {
    next.financeTransaction = {
      ...next.financeTransaction,
      id: financeIds.equipment(equipmentId, 'repair'),
      side_effects_managed: true,
      created_from: 'equipment_side_effects',
    };
  }
  if (next.document) {
    next.document = {
      ...next.document,
      id: documentIds.equipmentRepair(equipmentId),
      transaction_id: financeIds.equipment(equipmentId, 'repair'),
      side_effects_managed: true,
    };
  }
  if (next.alert) {
    next.alert = { ...next.alert, id: alertIds.equipmentBreakdown(equipmentId), side_effects_managed: true };
  }
  return next;
}

export async function runEquipmentBreakdownSideEffects({
  equipment = {},
  date = '',
  note = '',
  priority = 'critique',
  tasks = [],
  alertes = [],
  handlers = {},
} = {}) {
  const raw = buildEquipmentBreakdownFollowUp(equipment, { date: date || today(), note, priority });
  const workflow = withDeterministicEquipmentIds(raw, equipment);
  if (!workflow) return null;

  await handlers.onUpdateEquipment?.(equipment.id, workflow.equipmentPatch);

  const openTask = findOpenEquipmentTask(equipment, tasks);
  if (!openTask && workflow.task) await handlers.onCreateTask?.(workflow.task);

  const openAlert = findOpenEquipmentAlert(equipment, alertes);
  if (!openAlert && workflow.alert) await handlers.onCreateAlert?.(workflow.alert);

  if (workflow.event && handlers.onCreateBusinessEvent) await handlers.onCreateBusinessEvent(workflow.event);
  return workflow;
}

export async function runEquipmentRepairSideEffects({
  equipment = {},
  cost = 0,
  note = '',
  date = '',
  tasks = [],
  alertes = [],
  transactions = [],
  handlers = {},
} = {}) {
  const task = findOpenEquipmentTask(equipment, tasks);
  const alert = findOpenEquipmentAlert(equipment, alertes);
  const raw = buildEquipmentRepairWorkflow({ equipment, task, alert, cost: num(cost), note, date: date || today() });
  const workflow = withDeterministicEquipmentIds(raw, equipment);
  if (!workflow) return null;

  await handlers.onUpdateEquipment?.(equipment.id, workflow.equipmentPatch);
  if (workflow.taskPatch?.id) await handlers.onUpdateTask?.(workflow.taskPatch.id, workflow.taskPatch.patch);
  if (workflow.alertPatch?.id) await handlers.onUpdateAlert?.(workflow.alertPatch.id, workflow.alertPatch.patch);

  if (workflow.financeTransaction) {
    const exists = arr(transactions).find((row) => clean(row.id) === clean(workflow.financeTransaction.id));
    if (!exists) await handlers.onCreateFinanceTransaction?.(workflow.financeTransaction);
    await syncFinanceSideEffects(exists || workflow.financeTransaction, { handlers, document: workflow.document });
  }

  if (workflow.document && handlers.onCreateDocument) await handlers.onCreateDocument(workflow.document);
  if (workflow.event && handlers.onCreateBusinessEvent) await handlers.onCreateBusinessEvent(workflow.event);
  return workflow;
}

export async function runEquipmentWorkflowSideEffects({
  equipment = {},
  equipmentPatch = {},
  repairCost = 0,
  tasks = [],
  alertes = [],
  transactions = [],
  handlers = {},
} = {}) {
  const merged = { ...equipment, ...equipmentPatch };
  const cost = num(repairCost || merged.cout_reparation);
  const status = clean(merged.status || merged.statut).toLowerCase();

  if (status === 'panne' || (cost <= 0 && status !== 'operationnel')) {
    return runEquipmentBreakdownSideEffects({
      equipment: merged,
      tasks,
      alertes,
      handlers,
      note: merged.notes || merged.last_repair_note || '',
      priority: merged.priority || 'haute',
    });
  }

  return runEquipmentRepairSideEffects({
    equipment: merged,
    cost,
    tasks,
    alertes,
    transactions,
    handlers,
    note: merged.notes || '',
  });
}
