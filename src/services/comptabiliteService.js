import { supabase } from '../lib/supabase';
import {
  ACCOUNTING_ACCOUNTS_SEED,
  ACCOUNTING_BUDGETS_SEED,
  ACCOUNTING_CLOSURES_SEED,
  TREASURY_ACCOUNTS_SEED,
  buildDraftEntryFromTransaction,
} from '../utils/accounting';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const amountOf = (row = {}) => Number(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);

const businessError = (message, error) => {
  if (error?.message) console.warn(message, error.message);
  const err = new Error(message);
  err.cause = error;
  return err;
};

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
    console.warn(`Initialisation ${table} ignorée`, error.message);
    return [];
  }
  return data || [];
};

const safeInsertMany = async (table, rows, message = 'Création comptable impossible') => {
  if (!rows?.length) return [];
  const { data, error } = await supabase.from(table).insert(rows).select('*');
  if (error) throw businessError(message, error);
  return data || [];
};

const findFirst = async (table, column, value) => {
  if (!value) return null;
  const { data, error } = await supabase.from(table).select('*').eq(column, value).limit(1);
  if (error) {
    console.warn(`Recherche ${table}.${column} ignorée`, error.message);
    return null;
  }
  return arr(data)[0] || null;
};

const findEntryLines = async (entryId) => {
  if (!entryId) return [];
  const { data, error } = await supabase.from('accounting_entry_lines').select('*').eq('entry_id', entryId);
  if (error) {
    console.warn('Lecture lignes comptables ignorée', error.message);
    return [];
  }
  return data || [];
};

const findExistingEntryForTransaction = async (transaction = {}, proposedEntryId) => {
  const candidates = [
    transaction.accounting_entry_id,
    proposedEntryId,
    transaction.id ? `ECR-${transaction.id}` : '',
  ].filter(Boolean);

  for (const id of candidates) {
    const byId = await findFirst('accounting_entries', 'id', id);
    if (byId) return byId;
  }

  if (transaction.id) {
    const byReference = await findFirst('accounting_entries', 'reference', transaction.id);
    if (byReference) return byReference;
  }

  const sourceId = transaction.source_record_id || transaction.related_id || transaction.id;
  if (sourceId) {
    const { data, error } = await supabase
      .from('accounting_entries')
      .select('*')
      .eq('source_id', sourceId)
      .limit(1);
    if (!error && arr(data)[0]) return data[0];
    if (error) console.warn('Recherche doublon comptable ignorée', error.message);
  }

  return null;
};

const safeFinanceUpdate = async (entryId, payload) => {
  if (!entryId) return;
  const targets = ['finances', 'transactions'];
  await Promise.allSettled(targets.map(async (table) => {
    const { error } = await supabase.from(table).update(payload).eq('accounting_entry_id', entryId);
    if (error) console.warn(`Maj ${table} compta ignorée`, error.message);
  }));
};

const linkTransactionToEntry = async (transactionId, entryId, status = 'brouillon') => {
  if (!transactionId || !entryId) return;
  const payload = {
    accounting_entry_id: entryId,
    accounting_status: status,
    accounting_updated_at: now(),
  };
  await Promise.allSettled(['finances', 'transactions'].map(async (table) => {
    const { error } = await supabase.from(table).update(payload).eq('id', transactionId);
    if (error) console.warn(`Lien comptable ${table} ignoré`, error.message);
  }));
};

const assertBalanced = async (entryId) => {
  const lines = await findEntryLines(entryId);
  const debit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const credit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (Math.round(debit) !== Math.round(credit)) throw businessError('Écriture non équilibrée');
  if (!lines.length) throw businessError('Aucune ligne comptable à valider');
  return { debit, credit };
};

const enrichDraftEntry = (draft, transaction = {}) => {
  const sourceModule = transaction.source_module || transaction.module_lie || 'finances';
  const sourceId = transaction.source_record_id || transaction.related_id || transaction.id || draft.entry.source_id || '';
  return {
    ...draft,
    entry: {
      ...draft.entry,
      source_module: sourceModule,
      source_id: sourceId,
      reference: transaction.id || draft.entry.reference || draft.entry.id,
      accounting_source: 'finance_transaction',
      source_record_id: sourceId,
      related_id: transaction.related_id || sourceId,
    },
    lines: draft.lines.map((line) => ({ ...line, source_module: sourceModule, source_record_id: sourceId })),
  };
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
    if (!transaction?.id) throw businessError('Transaction finance invalide');
    if (amountOf(transaction) <= 0) throw businessError('Montant finance invalide');

    const draft = enrichDraftEntry(buildDraftEntryFromTransaction(transaction, accounts), transaction);
    const existing = await findExistingEntryForTransaction(transaction, draft.entry.id);

    if (existing?.status === 'valide') {
      await linkTransactionToEntry(transaction.id, existing.id, 'valide');
      return { entry: existing, lines: await findEntryLines(existing.id), reused: true };
    }

    const entryPayload = existing?.id ? { ...draft.entry, id: existing.id, status: existing.status || 'brouillon' } : draft.entry;
    const linesPayload = draft.lines.map((line) => ({ ...line, entry_id: entryPayload.id, id: line.id.replace(draft.entry.id, entryPayload.id) }));

    const { data: entry, error: entryError } = await supabase
      .from('accounting_entries')
      .upsert(entryPayload, { onConflict: 'id' })
      .select('*')
      .limit(1);
    if (entryError) throw businessError('Écriture comptable impossible', entryError);

    const { error: deleteError } = await supabase.from('accounting_entry_lines').delete().eq('entry_id', entryPayload.id);
    if (deleteError) throw businessError('Mise à jour des lignes comptables impossible', deleteError);

    const lines = await safeInsertMany('accounting_entry_lines', linesPayload, 'Création des lignes comptables impossible');
    await linkTransactionToEntry(transaction.id, entryPayload.id, 'brouillon');

    return { entry: arr(entry)[0] || entryPayload, lines, reused: Boolean(existing?.id) };
  },

  async validateEntry(entryId) {
    if (!entryId) throw businessError('Écriture comptable introuvable');
    await assertBalanced(entryId);
    const validatedAt = now();
    const { data, error } = await supabase
      .from('accounting_entries')
      .update({ status: 'valide', validated_at: validatedAt })
      .eq('id', entryId)
      .select('*')
      .limit(1);
    if (error) throw businessError('Validation comptable impossible', error);

    await safeFinanceUpdate(entryId, {
      accounting_status: 'valide',
      accounting_validated_at: validatedAt,
      accounting_updated_at: validatedAt,
    });

    return arr(data)[0] || { id: entryId, status: 'valide', validated_at: validatedAt };
  },

  async cancelEntry(entryId) {
    if (!entryId) throw businessError('Écriture comptable introuvable');
    const { data, error } = await supabase
      .from('accounting_entries')
      .update({ status: 'annule' })
      .eq('id', entryId)
      .select('*')
      .limit(1);
    if (error) throw businessError('Annulation comptable impossible', error);

    await safeFinanceUpdate(entryId, {
      accounting_status: 'annule',
      accounting_updated_at: now(),
    });

    return arr(data)[0] || { id: entryId, status: 'annule' };
  },

  async createBudget(payload) {
    const { data, error } = await supabase.from('accounting_budgets').insert(payload).select('*').limit(1);
    if (error) throw businessError('Budget impossible', error);
    return arr(data)[0] || payload;
  },

  async updateBudget(id, payload) {
    const { data, error } = await supabase.from('accounting_budgets').update(payload).eq('id', id).select('*').limit(1);
    if (error) throw businessError('Mise à jour budget impossible', error);
    return arr(data)[0] || { id, ...payload };
  },

  async createClosure(payload) {
    const { data, error } = await supabase.from('accounting_closures').insert(payload).select('*').limit(1);
    if (error) throw businessError('Clôture impossible', error);
    return arr(data)[0] || payload;
  },

  async uploadDocument(payload) {
    const { data, error } = await supabase.from('accounting_documents').insert(payload).select('*').limit(1);
    if (error) throw businessError('Justificatif impossible', error);
    return arr(data)[0] || payload;
  },
};
