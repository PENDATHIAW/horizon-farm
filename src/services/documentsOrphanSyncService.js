import { isDocumentOrphan } from '../utils/documentsWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const labelOf = (row = {}) => row.title || row.nom || row.name || row.filename || row.libelle || row.id || 'Document';
const dateOf = (row = {}) => row.date || row.created_at || row.updated_at || '—';

export function findOrphanDocuments(documents = []) {
  return arr(documents)
    .filter((doc) => isDocumentOrphan(doc))
    .map((doc) => ({
      docId: doc.id,
      title: labelOf(doc),
      date: dateOf(doc),
      type: doc.type || doc.categorie || doc.category || 'Document',
    }));
}

export function summarizeOrphanDocuments(documents = []) {
  const orphans = findOrphanDocuments(documents);
  return {
    count: orphans.length,
    orphans,
    hasOrphans: orphans.length > 0,
  };
}
