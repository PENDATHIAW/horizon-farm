import { supabase } from '../lib/supabase';
import { normalizePayloadBeforeSave } from '../utils/normalize';

const dbKeyMap = {
  productionJour: 'productionjour',
  revenuEstime: 'revenu_estime',
  scoresSante: 'scores_sante',
  prixUnit: 'prixunit',
  totalAchats: 'totalachats',
  derniereCommande: 'dernierecommande',
  margeFinale: 'margefinale',
  photoUrl: 'photo_url',
  moduleLie: 'module_lie',
  relatedId: 'related_id',
  clientId: 'client_id',
  fournisseurId: 'fournisseur_id',
  justificatifUrl: 'justificatif_url',
  treasuryAccountId: 'treasury_account_id',
  accountingEntryId: 'accounting_entry_id',
};

const GENERATED_COLUMNS = {
  bp_investment_lines: ['total'],
  bp_revenue_projections: ['ca_estime', 'marge_estimee'],
  business_plans: ['apport_total'],
};

const today = () => new Date().toISOString().slice(0, 10);
const amountOf = (...values) => values.map((value) => Number(value || 0)).find((value) => value > 0) || 0;

const enrichWorkflowPayload = (payload = {}, table = '') => {
  if (table !== 'payments') return payload;
  const paymentDate = payload.date_paiement || payload.date || payload.paid_at || today();
  const amount = amountOf(payload.montant_paye, payload.montant, payload.amount, payload.paid_amount);
  return {
    ...payload,
    date_paiement: paymentDate,
    date: payload.date || paymentDate,
    montant_paye: amount || payload.montant_paye || 0,
    montant: payload.montant ?? amount,
    amount: payload.amount ?? amount,
    mode_paiement: payload.mode_paiement || payload.moyen_paiement || payload.paiement || payload.payment_method || 'Cash',
    moyen_paiement: payload.moyen_paiement || payload.mode_paiement || payload.paiement || payload.payment_method || 'Cash',
    statut: payload.statut || 'paye',
  };
};

const toDbPayload = (payload = {}, table = '') => {
  const generated = GENERATED_COLUMNS[table] || [];
  const enriched = enrichWorkflowPayload(payload, table);
  const mapped = Object.fromEntries(
    Object.entries(enriched)
      .filter(([key]) => !generated.includes(dbKeyMap[key] || key))
      .map(([key, value]) => [dbKeyMap[key] || key, value])
  );
  return normalizePayloadBeforeSave(mapped);
};

const getMissingSchemaColumn = (error) => {
  const message = String(error?.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
};

const isDuplicateKeyError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '23505' || message.includes('duplicate key value violates unique constraint');
};

const withoutColumn = (payload, column) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => (dbKeyMap[key] || key) !== column));

const updateExistingByPrimaryKey = async ({ table, payload, idField }) => {
  const id = payload?.[idField];
  if (!id) return null;
  const { data, error } = await supabase.from(table).update(payload).eq(idField, id).select('*').single();
  if (error) throw error;
  return data;
};

const runMutationWithSchemaRetry = async ({ table, action, payload, id, idField }) => {
  let nextPayload = toDbPayload(payload, table);
  const removedColumns = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const query = action === 'insert'
      ? supabase.from(table).insert(nextPayload).select('*').single()
      : supabase.from(table).update(nextPayload).eq(idField, id).select('*').single();

    const { data, error } = await query;
    if (!error) return data;

    if (action === 'insert' && isDuplicateKeyError(error) && nextPayload?.[idField]) {
      return updateExistingByPrimaryKey({ table, payload: nextPayload, idField });
    }

    const missingColumn = getMissingSchemaColumn(error);
    if (!missingColumn || removedColumns.includes(missingColumn)) throw error;

    removedColumns.push(missingColumn);
    nextPayload = withoutColumn(nextPayload, missingColumn);
  }

  throw new Error(`Schema Supabase incomplet pour ${table}. Colonnes ignorees: ${removedColumns.join(', ')}`);
};

export const createSupabaseCrudService = (table, idField = 'id') => ({
  async getAll() {
    if (!table) return [];
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data || [];
  },

  async create(payload) {
    if (!table) return payload;
    return runMutationWithSchemaRetry({ table, action: 'insert', payload, idField });
  },

  async update(id, payload) {
    if (!table) return payload;
    return runMutationWithSchemaRetry({ table, action: 'update', payload, id, idField });
  },

  async remove(id) {
    if (!table) return true;
    const { error } = await supabase.from(table).delete().eq(idField, id);
    if (error) throw error;
    return true;
  },
});
