/**
 * Écarts chantier 7 - documents / preuves / conformité.
 */

import { toNumber } from './format.js';
import { isDocumentOrphan, buildDocumentsIssueKey, DOCUMENT_DOMAINS } from './documentsWorkflow.js';

import { findOrphanDocuments } from '../services/documentsOrphanSyncService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);

const hasProof = (row = {}) => Boolean(
  row.document_id || row.proof_url || row.proof_document_id || row.justificatif_id || row.file_url,
);

const docLinksTrx = (doc = {}, trxId = '') =>
  clean(doc.transaction_id) === clean(trxId)
  || clean(doc.finance_id) === clean(trxId)
  || clean(doc.source_record_id) === clean(trxId);

export function buildDocumentsGapRows({
  documents = [],
  transactions = [],
  salesOrders = [],
  invoices = [],
} = {}) {
  const gaps = [];
  const push = (row) => gaps.push({ severity: 'warning', ...row });

  findOrphanDocuments(documents).forEach((orphan) => {
    push({
      issue_key: buildDocumentsIssueKey(DOCUMENT_DOMAINS.LINK, orphan.docId, 'orphelin'),
      title: 'Document orphelin',
      detail: `${orphan.title} : rattacher depuis Preuves ou Bibliothèque.`,
      repair: 'link_document',
      record_id: orphan.docId,
    });
  });

  arr(transactions).forEach((trx) => {
    const amount = num(trx.montant ?? trx.amount);
    if (amount <= 0) return;
    const linkedDoc = arr(documents).some((d) => docLinksTrx(d, trx.id));
    if (!hasProof(trx) && !linkedDoc) {
      push({
        issue_key: buildDocumentsIssueKey(DOCUMENT_DOMAINS.PROOF, trx.id, 'sans_preuve'),
        title: 'Transaction sans preuve',
        detail: `${trx.libelle || trx.id} · ${amount} FCFA`,
        repair: 'link_proof',
        record_id: trx.id,
      });
    }
  });

  arr(salesOrders).forEach((order) => {
    const orderId = clean(order.id);
    const hasInvoiceDoc = arr(documents).some((d) =>
      clean(d.order_id || d.sale_id) === orderId
      && /facture|invoice|recu|reçu/i.test(`${d.title || ''} ${d.document_category || ''}`));
    const hasInvoice = arr(invoices).some((inv) => clean(inv.order_id) === orderId);
    if (hasInvoice && !hasInvoiceDoc && num(order.montant_total ?? order.total) > 0) {
      push({
        issue_key: buildDocumentsIssueKey('facture', orderId, 'sans_pdf'),
        title: 'Facture vente sans PDF/document',
        detail: `Commande ${orderId}`,
        repair: 'link_invoice',
        record_id: orderId,
      });
    }
  });

  const seen = new Map();
  arr(documents).forEach((doc) => {
    const url = clean(doc.file_url || doc.url);
    const fingerprint = url || `${lower(doc.title)}:${num(doc.montant ?? doc.amount)}:${doc.date || ''}`;
    if (!fingerprint) return;
    const prev = seen.get(fingerprint);
    if (prev && prev !== doc.id) {
      push({
        issue_key: buildDocumentsIssueKey('doublon', doc.id, prev),
        title: 'Document dupliqué',
        detail: `${doc.title || doc.id} ≈ ${prev}`,
        repair: 'dedupe_document',
        record_id: doc.id,
      });
    } else {
      seen.set(fingerprint, doc.id);
    }
  });

  arr(documents).filter((doc) => !isDocumentOrphan(doc)).forEach((doc) => {
    const module = lower(doc.source_module || doc.module_source || '');
    const related = lower(doc.related_type || doc.entity_type || '');
    const mismatch = (
      (module === 'ventes' && related === 'transaction')
      || (module === 'finances' && related === 'commande')
      || (doc.stock_id && module !== 'stock')
      || (doc.health_id && !module.includes('sante') && module !== 'sante')
    );
    if (mismatch) {
      push({
        issue_key: buildDocumentsIssueKey('module', doc.id, 'mauvais_lien'),
        title: 'Preuve liée au mauvais module',
        detail: `${doc.title || doc.id} · ${module} / ${related}`,
        repair: 'relink_document',
        record_id: doc.id,
      });
    }
  });

  return gaps;
}
