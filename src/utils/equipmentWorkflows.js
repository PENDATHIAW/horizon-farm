import { makeId } from './ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const amount = (value = 0) => Number(value || 0) || 0;

export const equipmentLabel = (row = {}) => row.name || row.nom || row.libelle || row.id || 'Équipement';
export const equipmentActionKey = (row = {}, action = 'maintenance') => `equipment:${action}:${clean(row.id)}`;

const closedStatuses = ['termine', 'terminé', 'done', 'closed', 'resolue', 'résolue', 'annule', 'annulé'];
const isClosed = (row = {}) => closedStatuses.includes(lower(row.status || row.statut));

export function findOpenEquipmentTask(equipment = {}, tasks = []) {
  const keys = [equipmentActionKey(equipment, 'panne'), equipmentActionKey(equipment, 'maintenance'), `equipment_maintenance:${clean(equipment.id)}`];
  return tasks.find((task) => !isClosed(task) && (keys.includes(clean(task.task_dedupe_key || task.action_key)) || (clean(task.source_module) === 'equipements' && clean(task.related_id || task.source_record_id) === clean(equipment.id))));
}

export function findOpenEquipmentAlert(equipment = {}, alertes = []) {
  const keys = [equipmentActionKey(equipment, 'panne'), equipmentActionKey(equipment, 'maintenance'), `equipment_maintenance:${clean(equipment.id)}`];
  return alertes.find((alert) => !isClosed(alert) && (keys.includes(clean(alert.alert_dedupe_key || alert.action_key)) || (clean(alert.module_source || alert.source_module) === 'equipements' && clean(alert.entity_id || alert.related_id) === clean(equipment.id))));
}

export function buildEquipmentBreakdownFollowUp(equipment = {}, { date = today(), note = '', priority = 'critique' } = {}) {
  if (!equipment?.id) return null;
  const key = equipmentActionKey(equipment, 'panne');
  const taskId = makeId('TSK');
  const alertId = makeId('ALT');
  return {
    equipmentPatch: {
      status: 'panne',
      statut: 'panne',
      breakdown_at: now(),
      last_incident_date: date,
      notes: note || equipment.notes || '',
    },
    task: {
      id: taskId,
      title: `Panne ${equipmentLabel(equipment)}`,
      module_lie: 'equipements',
      source_module: 'equipements',
      source_record_id: equipment.id,
      related_id: equipment.id,
      task_dedupe_key: key,
      action_key: key,
      due_date: date,
      priority,
      status: 'a_faire',
      checklist: 'Diagnostiquer; Sécuriser; Réparer; Tester; Remettre en service',
      notes: note,
    },
    alert: {
      id: alertId,
      title: `Panne équipement: ${equipmentLabel(equipment)}`,
      message: note || `${equipmentLabel(equipment)} est en panne.`,
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipment.id,
      severity: priority === 'critique' ? 'critique' : 'warning',
      status: 'nouvelle',
      action_recommandee: 'Diagnostiquer et planifier la réparation.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'panne_equipement_declaree',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipment.id,
      title: `Panne ${equipmentLabel(equipment)}`,
      description: note,
      event_date: date,
      severity: priority === 'critique' ? 'critique' : 'warning',
      linked_task_id: taskId,
      linked_alert_id: alertId,
      saisies_evitees: 2,
    },
  };
}

export function buildEquipmentRepairWorkflow({ equipment = {}, task = null, alert = null, cost = 0, note = '', date = today() } = {}) {
  if (!equipment?.id) return null;
  const repairCost = amount(cost);
  const trxId = repairCost > 0 ? makeId('TRX') : '';
  const docId = repairCost > 0 ? makeId('DOC') : '';
  return {
    equipmentPatch: {
      status: 'operationnel',
      statut: 'operationnel',
      maintenance_status: 'termine',
      last_repair_done_at: now(),
      last_maintenance_done_at: now(),
      repair_cost: repairCost,
      cout_reparation: repairCost,
      last_repair_note: note,
    },
    taskPatch: task?.id ? { id: task.id, patch: { status: 'termine', statut: 'termine', completed_at: now(), resolution_notes: note } } : null,
    alertPatch: alert?.id ? { id: alert.id, patch: { status: 'resolue', statut: 'resolue', resolved_at: now(), linked_resolution_task_id: task?.id || '' } } : null,
    financeTransaction: repairCost > 0 ? {
      id: trxId,
      type: 'sortie',
      transaction_type: 'sortie',
      libelle: `Réparation ${equipmentLabel(equipment)}`,
      montant: repairCost,
      amount: repairCost,
      date,
      categorie: 'Réparation équipements',
      module_lie: 'equipements',
      related_id: equipment.id,
      source_module: 'equipements',
      source_record_id: equipment.id,
      statut: 'paye',
      status: 'paye',
      cash_effect: true,
      proof_document_id: docId,
    } : null,
    document: repairCost > 0 ? {
      id: docId,
      title: `Preuve réparation ${equipmentLabel(equipment)}`,
      document_category: 'reparation_equipement',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipment.id,
      related_id: equipment.id,
      transaction_id: trxId,
      montant: repairCost,
      date,
      status: 'manquant',
      verification_status: 'preuve_manquante',
      notes: 'Facture ou reçu de réparation à joindre.',
    } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'reparation_equipement_cloturee',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipment.id,
      title: `Réparation clôturée ${equipmentLabel(equipment)}`,
      description: note || (repairCost > 0 ? `Coût réparation: ${repairCost} FCFA` : 'Équipement remis en service.'),
      event_date: date,
      severity: 'info',
      linked_task_id: task?.id || '',
      linked_alert_id: alert?.id || '',
      linked_transaction_id: trxId,
      linked_document_id: docId,
      amount: repairCost,
      saisies_evitees: repairCost > 0 ? 4 : 2,
    },
  };
}
