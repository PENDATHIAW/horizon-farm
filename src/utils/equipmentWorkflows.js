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

export function validateEquipmentRecommission({ date = '', result = '', responsible = '', validated = false } = {}) {
  if (!validated) return { ok: false, error: 'Validation explicite obligatoire pour la remise en service.' };
  if (!clean(result)) return { ok: false, error: 'Résultat de réparation obligatoire.' };
  if (!clean(date)) return { ok: false, error: 'Date de remise en service obligatoire.' };
  if (!clean(responsible)) return { ok: false, error: 'Responsable de validation obligatoire.' };
  return { ok: true };
}

export function buildValidatedEquipmentRepairWorkflow({ equipment = {}, task = null, alert = null, cost = 0, result = '', date = today(), responsible = '', validated = false } = {}) {
  const validation = validateEquipmentRecommission({ date, result, responsible, validated });
  if (!validation.ok) return validation;
  const workflow = buildEquipmentRepairWorkflow({ equipment, task, alert, cost, note: result, date });
  if (!workflow) return { ok: false, error: 'Équipement introuvable.' };
  return {
    ...workflow,
    ok: true,
    equipmentPatch: {
      ...workflow.equipmentPatch,
      recommission_validated: true,
      recommissioned_at: date,
      recommissioned_by: clean(responsible),
      recommission_result: clean(result),
    },
  };
}

export function equipmentFinanceCosts(transactions = [], equipmentId = '') {
  const id = clean(equipmentId);
  return transactions.filter((row) => {
    const linked = clean(row.related_id || row.source_record_id || row.equipment_id) === id;
    const expense = /sortie|depense|expense|charge/.test(lower(`${row.type || ''} ${row.transaction_type || ''} ${row.categorie || ''}`));
    return linked && expense;
  }).reduce((sum, row) => sum + amount(row.montant ?? row.amount), 0);
}

export function buildEquipmentPurchaseWorkflow({
  payload = {},
  supplier = {},
  fundingSource = {},
  date = today(),
} = {}) {
  const label = equipmentLabel(payload);
  const equipmentId = clean(payload.id) || makeId('EQP');
  const amountValue = amount(payload.purchase_cost ?? payload.cout_achat ?? payload.valeur ?? payload.montant);
  const supplierId = clean(payload.fournisseur_id || payload.supplier_id || supplier.id);
  const fundingId = clean(payload.funding_source_id || payload.financement_id || fundingSource.id);
  const maintenanceDays = amount(payload.maintenance_interval_days ?? payload.frequence_maintenance_jours) || 90;
  const serviceDate = payload.date_mise_en_service || payload.service_date || date;
  const nextMaintenance = payload.maintenance_due || payload.prochaine_maintenance || (() => {
    const d = new Date(serviceDate);
    if (Number.isNaN(d.getTime())) return date;
    d.setDate(d.getDate() + maintenanceDays);
    return d.toISOString().slice(0, 10);
  })();
  const usefulLifeMonths = amount(payload.duree_amortissement_mois ?? payload.useful_life_months) || 60;
  const monthlyAmortization = usefulLifeMonths > 0 ? Math.round(amountValue / usefulLifeMonths) : 0;
  const trxId = amountValue > 0 ? makeId('TRX') : '';
  const docId = makeId('DOC');
  const issueKey = `equipment-purchase:${equipmentId}`;

  return {
    equipment: {
      id: equipmentId,
      name: label,
      nom: label,
      type: payload.type || payload.categorie || 'machine',
      categorie: payload.categorie || payload.type || 'Équipement agricole',
      status: 'operationnel',
      statut: 'operationnel',
      purchase_date: payload.purchase_date || payload.date_achat || date,
      date_achat: payload.date_achat || payload.purchase_date || date,
      purchase_cost: amountValue,
      cout_achat: amountValue,
      valeur: amountValue,
      fournisseur_id: supplierId,
      supplier_id: supplierId,
      date_mise_en_service: serviceDate,
      service_date: serviceDate,
      maintenance_due: nextMaintenance,
      prochaine_maintenance: nextMaintenance,
      financement_id: fundingId,
      funding_source_id: fundingId,
      amortissement_mensuel: monthlyAmortization,
      monthly_amortization: monthlyAmortization,
      cout_fixe_mensuel: monthlyAmortization,
      source_module: payload.source_module || 'equipements',
      source_record_id: payload.source_record_id || equipmentId,
      issue_key: issueKey,
    },
    financeTransaction: amountValue > 0 ? {
      id: trxId,
      type: 'sortie',
      transaction_type: 'depense',
      libelle: `Achat équipement ${label}`,
      montant: amountValue,
      amount: amountValue,
      date,
      categorie: 'Investissements',
      module_lie: 'equipements',
      related_id: equipmentId,
      source_module: 'equipements',
      source_record_id: equipmentId,
      fournisseur_id: supplierId,
      funding_source_id: fundingId,
      statut: 'validee',
      status: 'validee',
      cash_effect: false,
      proof_document_id: docId,
    } : null,
    document: {
      id: docId,
      title: `Justificatif achat ${label}`,
      document_category: 'facture_equipement',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipmentId,
      related_id: equipmentId,
      transaction_id: trxId,
      montant: amountValue,
      date,
      status: payload.justificatif_url || payload.proof_url ? 'fourni' : 'manquant',
      verification_status: payload.justificatif_url || payload.proof_url ? 'a_verifier' : 'preuve_manquante',
      file_url: payload.justificatif_url || payload.proof_url || '',
      issue_key: issueKey,
    },
    maintenanceTask: {
      id: makeId('TSK'),
      title: `Planifier maintenance ${label}`,
      module_lie: 'equipements',
      source_module: 'equipements',
      source_record_id: equipmentId,
      related_id: equipmentId,
      task_dedupe_key: `${issueKey}:maintenance`,
      due_date: nextMaintenance,
      priority: 'moyenne',
      status: 'a_faire',
      checklist: 'Vérifier mise en service; Contrôler garantie; Programmer maintenance; Archiver facture',
    },
    alert: payload.justificatif_url || payload.proof_url ? null : {
      id: makeId('ALT'),
      title: `Justificatif achat manquant · ${label}`,
      message: 'Facture ou reçu requis pour valider l’achat équipement et le reporting financeur.',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipmentId,
      severity: 'warning',
      status: 'nouvelle',
      alert_dedupe_key: `${issueKey}:preuve-manquante`,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'equipment_purchase',
      type_evenement: 'equipment_purchase',
      module_source: 'equipements',
      entity_type: 'equipement',
      entity_id: equipmentId,
      title: `Achat équipement · ${label}`,
      description: `${amountValue} FCFA · mise en service ${serviceDate} · maintenance ${nextMaintenance}`,
      event_date: date,
      severity: payload.justificatif_url || payload.proof_url ? 'info' : 'warning',
      amount: amountValue,
      linked_transaction_id: trxId,
      linked_document_id: docId,
      linked_task_id: '',
      saisies_evitees: 7,
    },
  };
}
