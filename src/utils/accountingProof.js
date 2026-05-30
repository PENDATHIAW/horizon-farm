const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const pendingProofStatuses = ['manquant', 'a_joindre', 'à joindre', 'a_completer', 'à compléter', 'missing', 'pending', 'preuve_manquante'];

export function documentIsUsableProof(document = {}) {
  if (document.file_url || document.url || document.storage_path || document.justificatif_url || document.proof_url || document.preuve_url) return true;
  const status = lower(document.statut || document.status || document.etat);
  const verificationStatus = lower(document.verification_status || document.proof_status);
  if (pendingProofStatuses.includes(status)) return false;
  if (pendingProofStatuses.includes(verificationStatus)) return false;
  return Boolean(clean(document.title || document.nom || document.name || document.document_category || document.category || document.type));
}

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
  return documents.some((document) => documentLinkedToTransaction(document, transaction) && documentIsUsableProof(document));
}

export function transactionsMissingProof(transactions = [], businessDocuments = [], accountingDocuments = []) {
  return arr(transactions).filter((transaction) => !transactionHasProof(transaction, businessDocuments, accountingDocuments));
}
