import { summarizeOrphanDocuments } from './documentsOrphanSyncService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const labelOf = (row = {}) => row.title || row.nom || row.name || row.filename || row.libelle || row.id || 'Document';
const hasProof = (row = {}) => Boolean(row.document_id || row.proof_url || row.proof_document_id || row.justificatif_id || row.file_url);

function aggregateMissingProofItems(transactions = [], documents = []) {
  return arr(transactions)
    .filter((trx) => {
      const amount = num(trx.montant ?? trx.amount);
      const linkedDoc = arr(documents).some((d) =>
        String(d.transaction_id || d.source_record_id || d.related_id) === String(trx.id));
      return amount > 0 && !hasProof(trx) && !linkedDoc;
    })
    .map((trx) => ({
      id: trx.id,
      amount: num(trx.montant ?? trx.amount),
    }));
}

function collectProofRows(documents = [], transactions = []) {
  const missing = aggregateMissingProofItems(transactions, documents);
  const linked = arr(documents).filter((doc) =>
    doc.source_module
    || doc.source_record_id
    || doc.transaction_id
    || doc.order_id
    || doc.invoice_id
    || doc.payment_id,
  );

  return {
    missingCount: missing.length,
    missingAmount: missing.reduce((sum, row) => sum + num(row.amount), 0),
    linkedCount: linked.length,
    rows: linked.slice(0, 40).map((doc) => ({
      id: doc.id,
      title: labelOf(doc),
      module: doc.source_module || doc.module_source || 'documents',
      recordId: doc.source_record_id || doc.transaction_id || doc.order_id || doc.related_id || '',
      url: doc.file_url || doc.url || '',
    })),
  };
}

export function buildFinanceurReportData({
  documents = [],
  transactions = [],
  salesOrders = [],
  payments = [],
  businessPlans = [],
} = {}) {
  const orphanSummary = summarizeOrphanDocuments(documents);
  const proofs = collectProofRows(documents, transactions);
  const revenue = arr(payments).reduce((sum, row) => sum + num(row.montant ?? row.amount ?? row.montant_paye), 0)
    || arr(salesOrders).reduce((sum, row) => sum + num(row.montant_total ?? row.total), 0);
  const expenses = arr(transactions)
    .filter((row) => ['sortie', 'depense', 'dépense', 'expense'].includes(String(row.type || row.transaction_type || '').toLowerCase()))
    .reduce((sum, row) => sum + num(row.montant ?? row.amount), 0);

  return {
    kpis: {
      documents: arr(documents).length,
      orphanDocuments: orphanSummary.count,
      missingProofs: proofs.missingCount,
      linkedProofs: proofs.linkedCount,
      revenue,
      expenses,
      businessPlans: arr(businessPlans).length,
    },
    proofs,
    orphanSummary,
    sections: [
      'Résumé exécutif',
      'Chiffres ERP (CA, charges, trésorerie)',
      'Preuves et justificatifs liés',
      'Documents orphelins à traiter',
      'Risques et mitigations',
      'Impact et emplois',
    ],
  };
}
