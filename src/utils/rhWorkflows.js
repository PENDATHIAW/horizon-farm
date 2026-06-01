import { toNumber } from './format.js';
import { makeId } from './ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();

export function rhPayrollOf(person = {}) {
  const salaire = toNumber(person.salaire_mensuel ?? person.salaire);
  const prime = toNumber(person.prime_mensuelle ?? person.prime);
  const avance = toNumber(person.avance_mois ?? person.avance);
  const brut = salaire + prime;
  return { salaire, prime, avance, brut, net: Math.max(0, brut - avance) };
}

export function buildRhSalaryWorkflow({ person = {}, teams = [], amount = 0, date = today(), transactionId = makeId('TRX') } = {}) {
  if (!person?.id) return null;
  const paidAmount = toNumber(amount) || rhPayrollOf(person).net;
  if (paidAmount <= 0) return null;
  const modules = Array.isArray(person.modules) && person.modules.length ? person.modules : ['rh'];
  const team = teams.find((item) => String(item.id) === String(person.equipe_id));
  const documentId = makeId('DOC');
  return {
    financeTransaction: {
      id: transactionId,
      type: 'sortie',
      transaction_type: 'sortie',
      libelle: `Rémunération ${person.nom || person.id}`,
      montant: paidAmount,
      amount: paidAmount,
      date,
      categorie: 'Rémunérations',
      module_lie: 'rh',
      related_id: person.id,
      source_module: 'rh',
      source_record_id: person.id,
      statut: 'paye',
      status: 'paye',
      cash_effect: true,
      equipe_id: person.equipe_id || '',
      modules_affectes: modules.join(','),
      cout_rh_modules: JSON.stringify(modules.map((module) => ({ module, montant: paidAmount / Math.max(1, modules.length) }))),
      payroll_period: date.slice(0, 7),
      proof_document_id: documentId,
    },
    document: {
      id: documentId,
      title: `Reçu salaire · ${person.nom || person.id}`,
      document_category: 'recu_salaire',
      module_source: 'rh',
      entity_type: 'personne',
      entity_id: person.id,
      related_id: person.id,
      transaction_id: transactionId,
      finance_id: transactionId,
      montant: paidAmount,
      date,
      status: 'manquant',
      verification_status: 'preuve_manquante',
      notes: `Preuve de paiement RH à joindre pour ${date.slice(0, 7)}.`,
    },
    personPatch: {
      avance_mois: 0,
      dernier_paiement: date,
      last_payment_amount: paidAmount,
      last_payment_modules: modules.join(','),
      last_payment_transaction_id: transactionId,
      last_payment_document_id: documentId,
      updated_at: now(),
    },
    event: {
      id: makeId('EVT'),
      event_type: 'paiement_remuneration',
      module_source: 'rh',
      entity_type: 'personne',
      entity_id: person.id,
      title: `Rémunération payée · ${person.nom || person.id}`,
      description: `${paidAmount} FCFA · équipe ${team?.name || person.equipe_id || 'RH'}`,
      event_date: date,
      severity: 'info',
      amount: paidAmount,
      equipe_id: person.equipe_id || '',
      modules_affectes: modules.join(','),
      linked_transaction_id: transactionId,
      linked_document_id: documentId,
      saisies_evitees: 3,
    },
  };
}

export function buildRhAbsenceFollowUp({ person = {}, date = today(), reason = 'Absence à vérifier', createTask = true } = {}) {
  if (!person?.id) return null;
  const taskId = createTask ? makeId('TSK') : '';
  return {
    personPatch: {
      last_absence_date: date,
      last_absence_reason: reason,
      presence_status: 'absent',
      updated_at: now(),
    },
    task: createTask ? {
      id: taskId,
      title: `Suivre absence · ${person.nom || person.id}`,
      module_lie: 'rh',
      source_module: 'rh',
      source_record_id: person.id,
      related_id: person.id,
      assigned_to: person.id,
      task_dedupe_key: `rh-absence:${person.id}:${date}`,
      due_date: date,
      priority: 'moyenne',
      status: 'a_faire',
      checklist: 'Confirmer absence; Réorganiser tâches terrain; Mettre à jour présence',
      notes: reason,
    } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'absence_rh_signalee',
      module_source: 'rh',
      entity_type: 'personne',
      entity_id: person.id,
      title: `Absence signalée · ${person.nom || person.id}`,
      description: reason,
      event_date: date,
      severity: 'warning',
      linked_task_id: taskId,
      saisies_evitees: createTask ? 2 : 1,
    },
  };
}

export function buildRhAssignedTask({ person = {}, module = 'taches', title = '', dueDate = today(), priority = 'moyenne', notes = '' } = {}) {
  if (!person?.id) return null;
  const label = clean(title) || `Action terrain · ${person.nom || person.id}`;
  const taskId = makeId('TSK');
  return {
    task: {
      id: taskId,
      title: label,
      module_lie: module,
      source_module: 'rh',
      source_record_id: person.id,
      related_id: person.id,
      assigned_to: person.id,
      task_dedupe_key: `rh-task:${person.id}:${module}:${label}`,
      due_date: dueDate,
      priority,
      status: 'a_faire',
      checklist: 'Confirmer responsable; Réaliser action; Marquer terminé',
      notes,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'tache_rh_assignee',
      module_source: 'rh',
      entity_type: 'personne',
      entity_id: person.id,
      title: `Tâche assignée · ${person.nom || person.id}`,
      description: label,
      event_date: dueDate,
      severity: priority === 'critique' ? 'warning' : 'info',
      linked_task_id: taskId,
      saisies_evitees: 2,
    },
  };
}
