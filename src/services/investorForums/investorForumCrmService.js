/**
 * CRM Investisseurs & Forums — Supabase + repli localStorage.
 */

import { supabase } from '../../lib/supabase.js';
import { safeLocalStorageSetJson } from '../../utils/safeLocalStorage.js';

const CRM_LOCAL_KEY = 'horizon_investor_forum_contacts';

export const CONTACT_TYPES = [
  { id: 'investisseur', label: 'Investisseur' },
  { id: 'banque', label: 'Banque' },
  { id: 'ong', label: 'ONG' },
  { id: 'subvention', label: 'Subvention' },
  { id: 'partenaire_technique', label: 'Partenaire technique' },
  { id: 'incubateur', label: 'Incubateur' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'fournisseur', label: 'Fournisseur' },
  { id: 'forum', label: 'Forum' },
  { id: 'salon', label: 'Salon' },
  { id: 'partenaire', label: 'Partenaire' },
];

export const CONTACT_STATUS = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'contacte', label: 'Contacté' },
  { id: 'en_discussion', label: 'En discussion' },
  { id: 'dossier_envoye', label: 'Dossier envoyé' },
  { id: 'negociation', label: 'Négociation' },
  { id: 'accord', label: 'Accord' },
  { id: 'refus', label: 'Refus' },
  { id: 'inactif', label: 'Inactif' },
];

export const EMPTY_CONTACT = {
  name: '',
  organization: '',
  country: '',
  email: '',
  phone: '',
  contact_type: 'investisseur',
  potential_amount: '',
  status: 'prospect',
  last_exchange_at: '',
  follow_up_at: '',
  notes: '',
  documents_sent: '',
};

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

export function contactTypeLabel(id) {
  return CONTACT_TYPES.find((t) => t.id === id)?.label || id || '—';
}

export function contactStatusLabel(id) {
  return CONTACT_STATUS.find((s) => s.id === id)?.label || id || '—';
}

export async function listInvestorForumContacts() {
  const ownerId = await currentOwnerId();
  try {
    const { data, error } = await supabase
      .from('investor_forum_contacts')
      .select('*')
      .eq('owner_user_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (!error && Array.isArray(data)) {
      safeLocalStorageSetJson(CRM_LOCAL_KEY, data);
      return data;
    }
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_contacts list', error);
  }
  const local = safeJson(CRM_LOCAL_KEY, []);
  return (Array.isArray(local) ? local : []).filter((row) => row.owner_user_id === ownerId || !row.owner_user_id);
}

function normalizeContact(payload = {}, ownerId) {
  const now = new Date().toISOString();
  return {
    owner_user_id: ownerId,
    name: String(payload.name || '').trim() || 'Contact',
    organization: payload.organization || null,
    country: payload.country || null,
    email: payload.email || null,
    phone: payload.phone || null,
    contact_type: payload.contact_type || 'investisseur',
    potential_amount: payload.potential_amount != null && payload.potential_amount !== ''
      ? Number(payload.potential_amount)
      : null,
    status: payload.status || 'prospect',
    last_exchange_at: payload.last_exchange_at || null,
    follow_up_at: payload.follow_up_at || null,
    notes: payload.notes || null,
    documents_sent: payload.documents_sent || null,
    updated_at: now,
  };
}

export async function saveInvestorForumContact(payload = {}) {
  const ownerId = await currentOwnerId();
  const normalized = normalizeContact(payload, ownerId);
  const id = payload.id || `crm-${Date.now()}`;
  let saved = { id, ...normalized, created_at: payload.created_at || normalized.updated_at };

  if (payload.id) {
    try {
      const { data, error } = await supabase
        .from('investor_forum_contacts')
        .update(normalized)
        .eq('id', payload.id)
        .select('*')
        .limit(1);
      if (!error && data?.[0]) {
        saved = data[0];
        const list = await listInvestorForumContacts();
        safeLocalStorageSetJson(CRM_LOCAL_KEY, list);
        return saved;
      }
      if (error && !isMissingTableError(error)) throw error;
    } catch (error) {
      if (!isMissingTableError(error)) console.warn('investor_forum_contacts update', error);
    }
  } else {
    try {
      const { data, error } = await supabase
        .from('investor_forum_contacts')
        .insert(normalized)
        .select('*')
        .limit(1);
      if (!error && data?.[0]) {
        saved = data[0];
        const list = await listInvestorForumContacts();
        safeLocalStorageSetJson(CRM_LOCAL_KEY, list);
        return saved;
      }
      if (error && !isMissingTableError(error)) throw error;
    } catch (error) {
      if (!isMissingTableError(error)) console.warn('investor_forum_contacts insert', error);
    }
  }

  const list = safeJson(CRM_LOCAL_KEY, []);
  const without = (Array.isArray(list) ? list : []).filter((row) => row.id !== id);
  safeLocalStorageSetJson(CRM_LOCAL_KEY, [saved, ...without].slice(0, 200));
  return saved;
}

export async function deleteInvestorForumContact(contactId) {
  try {
    const { error } = await supabase.from('investor_forum_contacts').delete().eq('id', contactId);
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) console.warn('investor_forum_contacts delete', error);
  }
  const list = safeJson(CRM_LOCAL_KEY, []);
  safeLocalStorageSetJson(CRM_LOCAL_KEY, (Array.isArray(list) ? list : []).filter((row) => row.id !== contactId));
  return true;
}
