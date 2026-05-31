import { ACCOUNTING_ACCOUNTS_SEED, buildDraftEntryFromTransaction } from '../utils/accounting';
import { safeLocalStorageGet, safeLocalStorageSetJson } from '../utils/safeLocalStorage';

const ENTRIES_KEY = 'hf_accounting_entries';
const LINES_KEY = 'hf_accounting_entry_lines';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const amountOf = (row = {}) => Number(row.montant ?? row.amount ?? 0);

export function getLocalAccountingStore() {
  return {
    entries: safeLocalStorageGet(ENTRIES_KEY, []),
    lines: safeLocalStorageGet(LINES_KEY, []),
  };
}

export function listAccountingEntries() {
  return getLocalAccountingStore().entries;
}

export function listAccountingLines() {
  return getLocalAccountingStore().lines;
}

/** Crée ou réutilise une écriture comptable brouillon depuis une transaction Finance. */
export async function syncFinanceTransactionToAccounting(transaction = {}, handlers = {}) {
  const value = amountOf(transaction);
  if (!transaction?.id || value <= 0) return null;
  if (transaction.accounting_entry_id) return { reused: true, entryId: transaction.accounting_entry_id };

  const draft = buildDraftEntryFromTransaction(transaction, ACCOUNTING_ACCOUNTS_SEED);
  const entryId = draft.entry.id;
  const store = getLocalAccountingStore();
  const existing = store.entries.find((row) => row.id === entryId || clean(row.reference) === clean(transaction.id));

  if (!existing) {
    safeLocalStorageSetJson(ENTRIES_KEY, [
      ...store.entries.filter((row) => row.id !== entryId),
      { ...draft.entry, status: 'brouillon', accounting_source: 'finance_transaction', created_from: 'auto_sync' },
    ]);
    const withoutLines = store.lines.filter((row) => row.entry_id !== entryId);
    safeLocalStorageSetJson(LINES_KEY, [
      ...withoutLines,
      ...draft.lines.map((line) => ({ ...line, entry_id: entryId })),
    ]);
  }

  const patch = {
    accounting_entry_id: entryId,
    accounting_status: existing?.status || 'brouillon',
    accounting_synced_at: new Date().toISOString(),
  };
  await handlers.onUpdateFinanceTransaction?.(transaction.id, patch);
  return { entryId, created: !existing };
}

/** Lie un document (facture) à l'écriture comptable de la transaction finance. */
export async function linkDocumentToAccounting(document = {}, transaction = {}, handlers = {}) {
  if (!document?.id || !transaction?.accounting_entry_id) return null;
  const patch = {
    accounting_entry_id: transaction.accounting_entry_id,
    transaction_id: transaction.id,
    finance_id: transaction.id,
    linked_transaction_id: transaction.id,
  };
  await handlers.onUpdateDocument?.(document.id, patch);
  return patch;
}
