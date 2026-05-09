const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();

export function documentLinkedToTransaction(document = {}, transaction = {}) {
  const transactionId = clean(transaction.id);
  const entryId = clean(transaction.accounting_entry_id);
  const relatedId = clean(transaction.related_id);
  const sourceRecordId = clean(transaction.source_record_id || transaction.source_id);
  const saleId = clean(transaction.sale_id || transaction.order_id);
  const invoiceId = clean(transaction.invoice_id);
  const candidates = [transactionId, entryId, relatedId, sourceRecordId, saleId, invoiceId].filter(Boolean);

  if (!candidates.length) return false;

  const docValues = [
    document.transaction_id,
    document.finance_id,
    document.entry_id,
    document.accounting_entry_id,
    document.related_id,
    document.entity_id,
    document.source_record_id,
    document.source_id,
    document.sale_id,
    document.order_id,
    document.invoice_id,
  ].map(clean).filter(Boolean);

  return docValues.some((value) => candidates.includes(value));
}

export function transactionHasProof(transaction = {}, businessDocuments = [], accountingDocuments = []) {
  if (transaction.justificatif_url || transaction.proof_url || transaction.preuve_url || transaction.receipt_url) return true;
  const documents = [...arr(businessDocuments), ...arr(accountingDocuments)];
  return documents.some((document) => documentLinkedToTransaction(document, transaction));
}

export function transactionsMissingProof(transactions = [], businessDocuments = [], accountingDocuments = []) {
  return arr(transactions).filter((transaction) => !transactionHasProof(transaction, businessDocuments, accountingDocuments));
}
