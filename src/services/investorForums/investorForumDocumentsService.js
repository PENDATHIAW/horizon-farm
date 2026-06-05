/**
 * Bibliothèque « Documents du dossier » — Supabase + repli localStorage.
 */

import { supabase } from '../../lib/supabase.js';
import { safeLocalStorageSetJson } from '../../utils/safeLocalStorage.js';

const DOCS_LOCAL_KEY = 'horizon_investor_forum_documents';
const BLOB_PREFIX = 'horizon_investor_dossier_file:';

export const DOSSIER_FILE_CATEGORIES = [
  { id: 'business_plan', label: 'Business plan' },
  { id: 'photos', label: 'Photos de la ferme' },
  { id: 'devis', label: 'Devis' },
  { id: 'factures', label: 'Factures' },
  { id: 'justificatifs', label: 'Justificatifs' },
  { id: 'captures_erp', label: 'Captures ERP' },
  { id: 'rapports_financiers', label: 'Rapports financiers' },
  { id: 'attestations', label: 'Attestations' },
  { id: 'administratif', label: 'Documents administratifs' },
  { id: 'autre', label: 'Autre' },
];

const safeJson = (key, fallback) => {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

async function currentOwnerId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || data?.user?.email || 'local';
  } catch {
    return 'local';
  }
}

function isMissingTableError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('could not find the table') || error?.code === '42P01';
}

export function storeDossierFileBlob(docId, dataUrl) {
  if (typeof localStorage === 'undefined' || !docId || !dataUrl) return;
  try {
    localStorage.setItem(`${BLOB_PREFIX}${docId}`, dataUrl);
  } catch {
    // quota — metadata still saved
  }
}

export function readDossierFileBlob(docId) {
  if (typeof localStorage === 'undefined' || !docId) return null;
  return localStorage.getItem(`${BLOB_PREFIX}${docId}`);
}

export function removeDossierFileBlob(docId) {
  if (typeof localStorage === 'undefined' || !docId) return;
  localStorage.removeItem(`${BLOB_PREFIX}${docId}`);
}

export async function listInvestorForumDocuments() {
  const ownerId = await currentOwnerId();
  try {
    const { data, error } = await supabase
      .from('investor_forum_documents')
      .select('*')
      .eq('owner_user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && Array.isArray(data)) {
      safeLocalStorageSetJson(DOCS_LOCAL_KEY, data);
      return data;
    }
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_documents list', error);
  }
  const local = safeJson(DOCS_LOCAL_KEY, []);
  return (Array.isArray(local) ? local : []).filter((row) => row.owner_user_id === ownerId || !row.owner_user_id);
}

export async function addInvestorForumDocument({
  category = 'autre',
  title,
  filename,
  fileUrl,
  erpDocumentId,
  notes,
  fileBlob,
}) {
  const ownerId = await currentOwnerId();
  const id = `doc-${Date.now()}`;
  let dataUrl = fileUrl || null;

  if (fileBlob && !dataUrl) {
    dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(fileBlob);
    });
  }

  if (dataUrl && dataUrl.length < 2_000_000) {
    storeDossierFileBlob(id, dataUrl);
  }

  const row = {
    id,
    owner_user_id: ownerId,
    category,
    title: title || filename || 'Document',
    filename: filename || title || 'fichier',
    file_url: dataUrl && dataUrl.length < 500_000 ? dataUrl : null,
    erp_document_id: erpDocumentId || null,
    notes: notes || null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('investor_forum_documents')
      .insert({
        owner_user_id: ownerId,
        category,
        title: row.title,
        filename: row.filename,
        file_url: row.file_url,
        erp_document_id: row.erp_document_id,
        notes: row.notes,
      })
      .select('*')
      .limit(1);
    if (!error && data?.[0]) {
      const saved = data[0];
      if (dataUrl) storeDossierFileBlob(saved.id, dataUrl);
      const list = await listInvestorForumDocuments();
      safeLocalStorageSetJson(DOCS_LOCAL_KEY, [saved, ...list.filter((d) => d.id !== saved.id)].slice(0, 100));
      return saved;
    }
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_documents add', error);
  }

  const list = safeJson(DOCS_LOCAL_KEY, []);
  const next = [row, ...(Array.isArray(list) ? list : [])].slice(0, 100);
  safeLocalStorageSetJson(DOCS_LOCAL_KEY, next);
  return row;
}

export async function deleteInvestorForumDocument(docId) {
  removeDossierFileBlob(docId);
  try {
    const { error } = await supabase.from('investor_forum_documents').delete().eq('id', docId);
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_documents delete', error);
  }
  const list = safeJson(DOCS_LOCAL_KEY, []);
  safeLocalStorageSetJson(DOCS_LOCAL_KEY, (Array.isArray(list) ? list : []).filter((row) => row.id !== docId));
  return true;
}

export function categoryLabel(categoryId) {
  return DOSSIER_FILE_CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId || 'Autre';
}
