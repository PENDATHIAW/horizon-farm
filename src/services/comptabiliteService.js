import { supabase } from '../lib/supabase';
import {
  ACCOUNTING_ACCOUNTS_SEED,
  ACCOUNTING_BUDGETS_SEED,
  ACCOUNTING_CLOSURES_SEED,
  TREASURY_ACCOUNTS_SEED,
  buildDraftEntryFromTransaction,
} from '../utils/accounting';

const safeSelect = async (table) => {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.warn(`Table ${table} indisponible`, error.message);
    return [];
  }
  return data || [];
};

const safeUpsertMany = async (table, rows) => {
  if (!rows?.length) return [];
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict: 'id' }).select('*');
  if (error) {
    console.warn(`Seed ${table} indisponible`, error.message);
    return [];
  }
  return data || [];
};

const safeInsertMany = async (table, rows) => {
  if (!rows?.length) return [];
  const { data, error } = await supabase.from(table).insert(rows).select('*');
  if (error) throw error;
  return data || [];
};

const safeFinanceUpdate = async (entryId, payload) => {
  if (!entryId) return;
  const targets = ['finances', 'transactions'];
  await Promise.allSettled(targets.map(async (table) => {
    const { error } = await supabase.from(table).update(payload).eq('accounting_entry_id', entryId);
    if (error) console.warn(`Maj ${table} compta ignoree`, error.message);
  }));
};

export const comptabiliteService = {
  async getAll() {
    let [accounts, entries, lines, budgets, closures, documents, treasuryAccounts, treasuryMovements] = await Promise.all([
      safeSelect('accounting_accounts'),
      safeSelect('accounting_entries'),
      safeSelect('accounting_entry_lines'),
      safeSelect('accounting_budgets'),
      safeSelect('accounting_closures'),
      safeSelect('accounting_documents'),
      safeSelect('treasury_accounts'),
      safeSelect('treasury_movements'),
    ]);

    if (accounts.length === 0) accounts = await safeUpsertMany('accounting_accounts', ACCOUNTING_ACCOUNTS_SEED);
    if (treasuryAccounts.length === 0) treasuryAccounts = await safeUpsertMany('treasury_accounts', TREASURY_ACCOUNTS_SEED);
    if (budgets.length === 0) budgets = await safeUpsertMany('accounting_budgets', ACCOUNTING_BUDGETS_SEED);
    if (closures.length === 0) closures = await safeUpsertMany('accounting_closures', ACCOUNTING_CLOSURES_SEED);

    return { accounts, entries, lines, budgets, closures, documents, treasuryAccounts, treasuryMovements };
  },

  async createDraftFromTransaction(transaction, accounts = ACCOUNTING_ACCOUNTS_SEED) {
    const draft = buildDraftEntryFromTransaction(transaction, accounts);
    const { data: entry, error: entryError } = await supabase
      .from('accounting_entries')
      .upsert(draft.entry, { onConflict: 'id' })
      .select('*')
      .single();
    if (entryError) throw entryError;

    const { error: deleteError } = await supabase.from('accounting_entry_lines').delete().eq('entry_id', draft.entry.id);
    if (deleteError) throw deleteError;

    const lines = await safeInsertMany('accounting_entry_lines', draft.lines);

    if (transaction.id) {
      await Promise.allSettled(['finances', 'transactions'].map(async (table) => {
        const { error } = await supabase.from(table).update({
          accounting_entry_id: draft.entry.id,
          accounting_status: 'brouillon',
          accounting_updated_at: new Date().toISOString(),
        }).eq('id', transaction.id);
        if (error) console.warn(`Lien comptable ${table} ignore`, error.message);
      }));
    }

    return { entry, lines };
  },

  async validateEntry(entryId) {
    const validatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('accounting_entries')
      .update({ status: 'valide', validated_at: validatedAt })
      .eq('id', entryId)
      .select('*')
      .single();
    if (error) throw error;

    await safeFinanceUpdate(entryId, {
      accounting_status: 'valide',
      accounting_validated_at: validatedAt,
      accounting_updated_at: validatedAt,
    });

    return data;
  },

  async cancelEntry(entryId) {
    const { data, error } = await supabase
      .from('accounting_entries')
      .update({ status: 'annule' })
      .eq('id', entryId)
      .select('*')
      .single();
    if (error) throw error;

    await safeFinanceUpdate(entryId, {
      accounting_status: 'annule',
      accounting_updated_at: new Date().toISOString(),
    });

    return data;
  },

  async createBudget(payload) {
    const { data, error } = await supabase.from('accounting_budgets').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  },

  async updateBudget(id, payload) {
    const { data, error } = await supabase.from('accounting_budgets').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  },

  async createClosure(payload) {
    const { data, error } = await supabase.from('accounting_closures').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  },

  async uploadDocument(payload) {
    const { data, error } = await supabase.from('accounting_documents').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  },
};
