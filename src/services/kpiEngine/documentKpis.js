const arr = (value) => (Array.isArray(value) ? value : []);
const number = (value = 0) => Number(value || 0);
const amount = (row = {}) => number(row.montant ?? row.amount ?? row.total ?? row.montant_total);

export function computeDocumentKpis(documents = [], transactions = [], invoices = []) {
  const docs = arr(documents);
  const tx = arr(transactions);
  const inv = arr(invoices);
  const missingProof = tx.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id).length;
  const orphanDocs = docs.filter((row) => !row.source_module && !row.source_record_id && !row.related_id).length;
  const unlinkedInvoices = inv.filter((row) => !docs.some((doc) => String(doc.invoice_id || doc.source_record_id) === String(row.id))).length;
  const complianceScore = tx.length ? Math.max(0, Math.round(((tx.length - missingProof) / tx.length) * 100)) : 100;
  return { documentCount: docs.length, missingProof, orphanDocs, unlinkedInvoices, complianceScore, sources: { documents: 'documents', proofGap: 'finances-documents' } };
}
