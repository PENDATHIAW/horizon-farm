import { toNumber } from './format.js';
import { makeId } from './ids.js';

const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export const missingDocumentStatuses = ['manquant', 'a_joindre', 'à joindre', 'a_completer', 'à compléter', 'missing', 'pending', 'preuve_manquante'];
export const documentLinkKey = (row = {}) => `document_missing:${row.transaction_id || row.finance_id || row.entity_id || row.related_id || row.id}`;

export function documentNeedsProof(document = {}) {
  const status = lower(document.statut || document.status || document.etat || document.verification_status);
  const verification = lower(document.verification_status || document.proof_status);
  if (missingDocumentStatuses.includes(status) || missingDocumentStatuses.includes(verification)) return true;
  return !Boolean(document.file_url || document.url || document.storage_path || document.justificatif_url || document.proof_url || document.preuve_url);
}

export function buildDocumentProofFollowUp({ document = {}, transaction = {}, date = today() } = {}) {
  const amount = toNumber(transaction.montant ?? transaction.amount ?? document.montant ?? document.amount);
  const targetId = clean(document.transaction_id || document.finance_id || document.entity_id || document.related_id || transaction.id || document.id);
  if (!targetId || !documentNeedsProof(document)) return null;
  const key = documentLinkKey({ ...document, transaction_id: targetId });
  const taskId = makeId('TSK');
  const label = document.title || transaction.libelle || targetId;
  return {
    key,
    task: {
      id: taskId,
      title: `Joindre preuve / facture — ${label}`,
      module_lie: 'documents',
      related_id: document.id || targetId,
      document_id: document.id,
      source_module: 'documents',
      source_record_id: document.id || targetId,
      due_date: date,
      priority: amount >= 100000 ? 'haute' : 'moyenne',
      status: 'a_faire',
      task_dedupe_key: key,
      action_key: key,
      notes: 'Ajouter le fichier, la photo ou le lien de preuve puis marquer vérifié.',
    },
    alert: {
      id: makeId('ALT'),
      title: `Preuve manquante: ${label}`,
      message: amount > 0 ? `Montant à justifier: ${amount} FCFA.` : 'Document créé sans fichier de preuve.',
      module_source: 'documents',
      entity_type: 'document',
      entity_id: document.id || targetId,
      related_id: targetId,
      severity: amount >= 100000 ? 'warning' : 'info',
      status: 'nouvelle',
      action_recommandee: 'Joindre la preuve / facture et la vérifier.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
  };
}
