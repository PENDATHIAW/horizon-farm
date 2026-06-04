/**
 * Persistance profil manuel + historique exports (Supabase + repli localStorage).
 */

import { supabase } from '../../lib/supabase.js';
import { safeLocalStorageSetJson } from '../../utils/safeLocalStorage.js';
import { EMPTY_MANUAL_CONTENT } from './mergeInvestorForumProfile.js';

const PROFILE_LOCAL_KEY = 'horizon_investor_forum_profile';
const EXPORTS_LOCAL_KEY = 'horizon_investor_forum_exports';
const BLOB_PREFIX = 'horizon_investor_export_blob:';

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

export async function loadInvestorForumProfile() {
  const ownerId = await currentOwnerId();
  try {
    const { data, error } = await supabase
      .from('investor_forum_profiles')
      .select('*')
      .eq('owner_user_id', ownerId)
      .limit(1);
    if (!error && data?.[0]) {
      const row = data[0];
      safeLocalStorageSetJson(PROFILE_LOCAL_KEY, row);
      return row;
    }
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_profiles load', error);
  }
  const local = safeJson(PROFILE_LOCAL_KEY, null);
  if (local && (local.owner_user_id === ownerId || !local.owner_user_id)) return local;
  return {
    id: `local-profile-${ownerId}`,
    owner_user_id: ownerId,
    manual_content: { ...EMPTY_MANUAL_CONTENT },
    dossier_status: 'brouillon',
    updated_at: new Date().toISOString(),
  };
}

export async function saveInvestorForumProfile(manualContent = {}, dossierStatus = 'brouillon') {
  const ownerId = await currentOwnerId();
  const payload = {
    owner_user_id: ownerId,
    manual_content: { ...EMPTY_MANUAL_CONTENT, ...manualContent },
    dossier_status: dossierStatus || manualContent.dossier_status || 'brouillon',
    updated_at: new Date().toISOString(),
  };

  let saved = { id: `local-profile-${ownerId}`, ...payload };

  try {
    const { data: existing } = await supabase
      .from('investor_forum_profiles')
      .select('id')
      .eq('owner_user_id', ownerId)
      .limit(1);

    if (existing?.[0]?.id) {
      const { data, error } = await supabase
        .from('investor_forum_profiles')
        .update(payload)
        .eq('id', existing[0].id)
        .select('*')
        .limit(1);
      if (!error && data?.[0]) saved = data[0];
      else if (error && !isMissingTableError(error)) throw error;
    } else {
      const { data, error } = await supabase
        .from('investor_forum_profiles')
        .insert(payload)
        .select('*')
        .limit(1);
      if (!error && data?.[0]) saved = data[0];
      else if (error && !isMissingTableError(error)) throw error;
    }
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_profiles save', error);
  }

  safeLocalStorageSetJson(PROFILE_LOCAL_KEY, saved);
  return saved;
}

export async function listInvestorForumExports() {
  const ownerId = await currentOwnerId();
  try {
    const { data, error } = await supabase
      .from('investor_forum_exports')
      .select('*')
      .eq('owner_user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && Array.isArray(data)) {
      safeLocalStorageSetJson(EXPORTS_LOCAL_KEY, data);
      return data;
    }
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_exports list', error);
  }
  const local = safeJson(EXPORTS_LOCAL_KEY, []);
  return (Array.isArray(local) ? local : []).filter((row) => row.owner_user_id === ownerId || !row.owner_user_id);
}

export function storeExportBlob(exportId, blob) {
  if (typeof localStorage === 'undefined' || !exportId || !blob) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(`${BLOB_PREFIX}${exportId}`, reader.result);
        resolve(reader.result);
      } catch {
        resolve(null);
      }
    };
    reader.readAsDataURL(blob);
  });
}

export function readExportBlob(exportId) {
  if (typeof localStorage === 'undefined' || !exportId) return null;
  return localStorage.getItem(`${BLOB_PREFIX}${exportId}`);
}

export function removeExportBlob(exportId) {
  if (typeof localStorage === 'undefined' || !exportId) return;
  localStorage.removeItem(`${BLOB_PREFIX}${exportId}`);
}

export async function saveInvestorForumExport({
  packType,
  audienceKey,
  documentTitle,
  filename,
  blob,
}) {
  const ownerId = await currentOwnerId();
  const id = `exp-${Date.now()}`;
  const row = {
    id,
    owner_user_id: ownerId,
    pack_type: packType,
    audience_key: audienceKey,
    document_title: documentTitle,
    filename,
    storage_ref: `${BLOB_PREFIX}${id}`,
    file_size_bytes: blob?.size || null,
    created_at: new Date().toISOString(),
  };

  if (blob) await storeExportBlob(id, blob);

  try {
    const { data, error } = await supabase
      .from('investor_forum_exports')
      .insert({
        owner_user_id: ownerId,
        pack_type: packType,
        audience_key: audienceKey,
        document_title: documentTitle,
        filename,
        storage_ref: row.storage_ref,
        file_size_bytes: row.file_size_bytes,
      })
      .select('*')
      .limit(1);
    if (!error && data?.[0]) {
      const saved = { ...data[0], id: data[0].id || id };
      if (blob) await storeExportBlob(saved.id, blob);
      const list = await listInvestorForumExports();
      safeLocalStorageSetJson(EXPORTS_LOCAL_KEY, [saved, ...list.filter((e) => e.id !== saved.id)].slice(0, 50));
      return saved;
    }
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_exports save', error);
  }

  const list = safeJson(EXPORTS_LOCAL_KEY, []);
  const next = [row, ...(Array.isArray(list) ? list : [])].slice(0, 50);
  safeLocalStorageSetJson(EXPORTS_LOCAL_KEY, next);
  return row;
}

export async function deleteInvestorForumExport(exportId) {
  removeExportBlob(exportId);
  try {
    const { error } = await supabase.from('investor_forum_exports').delete().eq('id', exportId);
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_exports delete', error);
  }
  const list = safeJson(EXPORTS_LOCAL_KEY, []);
  safeLocalStorageSetJson(EXPORTS_LOCAL_KEY, (Array.isArray(list) ? list : []).filter((row) => row.id !== exportId));
  return true;
}
