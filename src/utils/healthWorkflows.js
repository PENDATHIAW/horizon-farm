import { toNumber } from './format';
import { makeId } from './ids';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const today = () => new Date().toISOString().slice(0, 10);

export const isHealthOverdue = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(norm(row.statut || row.status || row.etat));
export const isHealthDone = (row = {}) => ['fait', 'termine', 'terminé', 'realise', 'réalisé', 'administre', 'administré', 'ok'].includes(norm(row.statut || row.status || row.etat));
export const healthKey = (row = {}) => `health-action:${row.id || row.source_record_id || row.animal_id || row.lot_id || row.target_id || row.related_id || row.nom || row.name}`;
export const healthTitle = (row = {}) => row.nom || row.name || row.title || row.type_soin || row.type || row.vaccin || row.id || 'Soin santé';
export const healthTarget = (row = {}) => row.target_summary || row.animal || row.animal_id || row.lot_id || row.target_id || row.related_id || row.entity_id || row.sujet || 'cible non renseignée';

export function buildHealthFollowUp(row = {}, source = 'santé') {
  if (!isHealthOverdue(row)) return null;
  const key = healthKey(row);
  const taskId = makeId('TSK');
  const title = `Soin en retard · ${healthTitle(row)}`;
  const description = `Cible: ${healthTarget(row)} · Source: ${source}`;
  return {
    key,
    task: {
      id: taskId,
      task_dedupe_key: key,
      action_key: key,
      title,
      module_lie: 'sante',
      source_module: 'sante',
      source_record_id: key,
      related_id: row.id,
      due_date: row.date_prevue || row.date_rappel || row.prevue || row.date || today(),
      priority: 'haute',
      status: 'a_faire',
      checklist: 'Vérifier la cible;Préparer le produit;Réaliser le soin;Mettre à jour la fiche santé',
      notes: description,
    },
    alert: {
      id: makeId('ALT'),
      alert_dedupe_key: key,
      dedupe_key: key,
      title,
      message: description,
      module_source: 'sante',
      entity_type: 'health_action',
      entity_id: row.id,
      severity: 'haute',
      status: 'nouvelle',
      action_recommandee: 'Réaliser le soin, puis marquer la fiche comme faite.',
      source_record_id: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'sante_retard_detecte',
      module_source: 'sante',
      entity_type: 'health_action',
      entity_id: row.id,
      title,
      description,
      event_date: today(),
      severity: 'warning',
      linked_task_key: key,
      linked_alert_key: key,
      linked_task_id: taskId,
      saisies_evitees: 2,
    },
  };
}

export function buildHealthCostTransaction(row = {}) {
  const amount = toNumber(row.cout ?? row.montant ?? row.amount);
  if (amount <= 0 || row.linked_finance_transaction_id) return null;
  const id = makeId('TRX');
  return {
    id,
    type: 'sortie',
    libelle: `Soin ${healthTitle(row)}`,
    montant: amount,
    amount,
    montant_total: amount,
    date: row.effectuee || row.date || today(),
    categorie: 'Sante',
    module_lie: 'sante',
    related_id: row.id,
    sante_id: row.id,
    statut: 'paye',
    source_module: 'sante',
    source_record_id: row.id,
    notes: `Coût santé lié à ${healthTarget(row)}`,
  };
}

export function buildHealthProofDocument(row = {}) {
  const file = row.preuve_photo_data || row.preuve_url || row.file_url || '';
  if (!file) return null;
  return {
    id: makeId('DOC'),
    title: `${row.preuve_type === 'ordonnance_photo' ? 'Ordonnance' : 'Preuve santé'} ${healthTitle(row)}`,
    document_category: row.preuve_type === 'ordonnance_photo' ? 'ordonnance' : 'sanitaire',
    module_source: 'sante',
    entity_type: 'sante',
    entity_id: row.id,
    related_id: row.id,
    file_url: file,
    file_name: row.preuve_file_name || `preuve-${row.id}.jpg`,
    mime_type: row.preuve_mime_type || 'image/*',
    status: 'fourni',
    verification_status: 'a_verifier',
    storage_mode: row.preuve_photo_data ? 'photo_upload' : 'lien',
  };
}

export function buildHealthMissingProofDocument(row = {}, transaction = {}) {
  const amount = toNumber(transaction.montant ?? transaction.amount ?? row.cout ?? row.montant ?? row.amount);
  if (amount <= 0) return null;
  const transactionId = transaction.id || row.linked_finance_transaction_id || '';
  return {
    id: makeId('DOC'),
    title: `Preuve / facture à ajouter · ${healthTitle(row)}`,
    document_category: 'facture',
    module_source: 'sante',
    entity_type: 'sante',
    entity_id: row.id,
    related_id: row.id,
    transaction_id: transactionId,
    finance_id: transactionId,
    source_record_id: row.id,
    montant: amount,
    amount,
    status: 'manquant',
    statut: 'manquant',
    verification_status: 'a_joindre',
    notes: `Ajouter la preuve ou la facture liée à cette dépense santé de ${amount} FCFA.`,
  };
}
