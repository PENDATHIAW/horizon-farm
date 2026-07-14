import { fmtCurrency } from '../utils/format';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const labelOf = (r = {}) => r.title || r.nom || r.name || r.filename || r.libelle || r.id || 'Document';
const dateOf = (r = {}) => r.date || r.created_at || r.updated_at || '-';

function isLinked(doc = {}) {
  return Boolean(
    doc.module_source
    || doc.related_type
    || doc.transaction_id
    || doc.source_record_id
    || doc.order_id
    || doc.sale_id
    || doc.entity_id
    || doc.related_id,
  );
}

export function findOrphanDocuments(documents = []) {
  return arr(documents)
    .filter((doc) => doc?.id && !isLinked(doc))
    .map((doc) => ({
      id: doc.id,
      docId: doc.id,
      title: labelOf(doc),
      detail: `${String(dateOf(doc)).slice(0, 10)} · sans module ni opération liée`,
      type: doc.type || doc.categorie || 'Document',
      amount: Number(doc.montant || doc.amount || 0) || 0,
      finding: {
        id: `doc-orphan-${doc.id}`,
        module: 'documents_rapports',
        severity: 'moyenne',
        auto_action: 'create_task',
        title: `Document orphelin : ${labelOf(doc)}`,
        description: 'Aucun module ou transaction liée',
        recommended_action: 'Rattacher à une opération métier',
        confidence_score: 0.82,
      },
    }))
    .sort((a, b) => String(b.detail).localeCompare(String(a.detail)));
}

export function filterDocumentsByQuery(documents = [], query = '') {
  const q = low(query).trim();
  if (!q) return arr(documents);
  return arr(documents).filter((doc) => {
    const hay = low(`${labelOf(doc)} ${doc.type || ''} ${doc.categorie || ''} ${doc.module_source || ''} ${doc.description || ''} ${doc.notes || ''} ${doc.id || ''}`);
    return hay.includes(q);
  });
}

export function summarizeOrphanDocuments(documents = []) {
  const orphans = findOrphanDocuments(documents);
  return {
    count: orphans.length,
    rows: orphans,
    amount: orphans.reduce((sum, row) => sum + (row.amount || 0), 0),
    label: orphans.length ? `${orphans.length} document(s) orphelin(s)` : 'Bibliothèque cohérente',
    amountLabel: orphans.some((row) => row.amount > 0) ? fmtCurrency(orphans.reduce((s, r) => s + r.amount, 0)) : '',
  };
}
