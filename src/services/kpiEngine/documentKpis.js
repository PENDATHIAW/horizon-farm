const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

export function computeDocumentKpis(documents = [], transactions = [], invoices = []) {
  const docs = arr(documents);
  const tx = arr(transactions);
  const inv = arr(invoices);
  const missingProof = tx.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id).length;
  const orphanDocs = docs.filter((row) => !row.source_module && !row.source_record_id && !row.related_id).length;
  const unlinkedInvoices = inv.filter((row) => !docs.some((doc) => String(doc.invoice_id || doc.source_record_id) === String(row.id))).length;
  const complianceScore = tx.length ? Math.max(0, Math.round(((tx.length - missingProof) / tx.length) * 100)) : 100;

  return {
    documentCount: docs.length,
    missingProof,
    orphanDocs,
    unlinkedInvoices,
    complianceScore,
    sources: { documents: 'documents', proofGap: 'finances-documents' },
  };
}
