import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { fmtCurrency } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);
const labelOf = (r = {}) => r.title || r.nom || r.name || r.filename || r.libelle || r.id || 'Document';
const dateOf = (r = {}) => r.date || r.created_at || r.updated_at || '-';
const isInvoiced = (r = {}) => r.invoice_id || r.facture_id || ['facture', 'facturé', 'invoiced'].includes(low(r.invoice_status || r.facture_status));

export function buildDocumentsHealthSnapshot({ documents = [], transactions = [], salesOrders = [] }) {
  const data = { documents, finances: transactions, transactions, sales_orders: salesOrders };
  const health = runErpHealthEngine(data);
  const proofFindings = health.findings
    .filter((f) => f.id?.includes('proof') || f.id?.includes('no-proof') || f.module === 'documents_rapports' || f.module === 'finance_pilotage')
    .map((f) => ({
      ...f,
      module: 'documents_rapports',
      auto_action: f.auto_action || 'create_task',
    }));
  return {
    score: health.score,
    findings: proofFindings,
    predictions: health.predictions.filter((p) => p.module === 'documents_rapports' || p.module === 'finance_pilotage'),
    risks: health.risks.filter((r) => r.domain === 'financier' || r.module === 'documents_rapports'),
  };
}

export function buildDocumentsCoherenceRows(documents = [], transactions = [], salesOrders = []) {
  const rows = [];

  arr(transactions).forEach((trx) => {
    const val = amount(trx);
    const linkedDoc = arr(documents).some((d) => String(d.transaction_id || d.source_record_id || d.related_id) === String(trx.id));
    if (val > 0 && !hasProof(trx) && !linkedDoc) {
      rows.push({
        id: `proof-${trx.id}`,
        trxId: trx.id,
        type: 'preuve',
        title: `Justificatif manquant : ${trx.libelle || trx.title || trx.id}`,
        detail: `${String(dateOf(trx)).slice(0, 10)} · ${fmtCurrency(val)}`,
        value: val,
        finding: {
          id: `doc-proof-${trx.id}`,
          module: 'documents_rapports',
          severity: val > 50000 ? 'haute' : 'moyenne',
          auto_action: 'create_task',
          title: `Joindre preuve : ${trx.libelle || trx.id}`,
          description: `Transaction ${val} FCFA sans justificatif`,
          recommended_action: 'Attacher document ou créer tâche conformité',
          confidence_score: 0.91,
        },
      });
    }
  });

  arr(salesOrders).forEach((order) => {
    const total = amount(order);
    if (total <= 0 || isInvoiced(order)) return;
    const hasInvoiceDoc = arr(documents).some((d) => /facture|invoice/.test(low(`${labelOf(d)} ${d.type || ''}`)) && String(d.order_id || d.sale_id || d.related_id) === String(order.id));
    if (!hasInvoiceDoc) {
      rows.push({
        id: `invoice-${order.id}`,
        orderId: order.id,
        type: 'facture',
        title: `Facture absente : vente ${order.id}`,
        detail: order.client_nom || order.customer_name || 'Client',
        finding: {
          id: `doc-no-invoice-${order.id}`,
          module: 'documents_rapports',
          severity: 'moyenne',
          auto_action: 'create_alert',
          title: `Vente sans document facture : ${order.id}`,
          description: 'Aucune facture/reçu archivé',
          recommended_action: 'Générer ou joindre facture',
          confidence_score: 0.88,
        },
      });
    }
  });

  arr(documents).filter((d) => !d.module_source && !d.related_type && !d.transaction_id && !d.source_record_id).slice(0, 5).forEach((doc) => {
    rows.push({
      id: `orphan-${doc.id}`,
      docId: doc.id,
      type: 'orphelin',
      title: `Document non rattaché : ${labelOf(doc)}`,
      detail: dateOf(doc),
      finding: {
        id: `doc-orphan-${doc.id}`,
        module: 'documents_rapports',
        severity: 'moyenne',
        auto_action: 'create_task',
        title: `Document orphelin : ${labelOf(doc)}`,
        description: 'Aucun module ou transaction liée',
        recommended_action: 'Rattacher à une opération métier',
        confidence_score: 0.82,
      },
    });
  });

  return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
}

export function aggregateMissingProofItems(transactions = [], documents = []) {
  return arr(transactions)
    .filter((trx) => {
      const val = amount(trx);
      const linkedDoc = arr(documents).some((d) => String(d.transaction_id || d.source_record_id || d.related_id) === String(trx.id));
      return val > 0 && !hasProof(trx) && !linkedDoc;
    })
    .map((trx) => ({
      id: trx.id,
      title: trx.libelle || trx.title || trx.id,
      amount: amount(trx),
      date: dateOf(trx),
    }))
    .sort((a, b) => b.amount - a.amount);
}

const moduleHint = (row = {}) => low(`${row.module_lie || ''} ${row.source_module || ''} ${row.categorie || ''} ${row.libelle || ''} ${row.module_source || ''}`);

export function buildDocumentsDomainCoverage({ documents = [], transactions = [], gaps = [] } = {}) {
  const trxFinance = arr(transactions).filter((trx) => moduleHint(trx).match(/finance|vente|client|paiement|charge|achat|fournisseur/) || amount(trx) > 0);
  const trxElevage = arr(transactions).filter((trx) => moduleHint(trx).match(/elevage|avicole|animal|sante|soin|veterinaire/));
  const trxCultures = arr(transactions).filter((trx) => moduleHint(trx).match(/culture|recolte|parcelle|intrant/));
  const docsElevage = arr(documents).filter((d) => moduleHint(d).match(/elevage|avicole|animal|sante/));
  const docsCultures = arr(documents).filter((d) => moduleHint(d).match(/culture|recolte|parcelle/));
  const docsFinance = arr(documents).filter((d) => moduleHint(d).match(/finance|facture|paiement|vente/) || /preuve|facture|paiement/.test(low(`${d.type || d.categorie || ''} ${d.title || d.nom || ''}`)));

  const proofRate = (trxRows, docRows) => {
    const pool = trxRows.length ? trxRows : docRows;
    if (!pool.length) return 100;
    const ok = pool.filter((row) => {
      if (trxRows.length) {
        const linked = arr(documents).some((d) => String(d.transaction_id || d.source_record_id || d.related_id) === String(row.id));
        return hasProof(row) || linked;
      }
      return Boolean(row.file_url || row.url || row.transaction_id || row.source_record_id);
    });
    return Math.round((ok.length / pool.length) * 100);
  };

  const gapCount = (pattern) => arr(gaps).filter((g) => pattern.test(low(`${g.title || ''} ${g.detail || ''} ${g.issue_key || ''}`))).length;

  return [
    { key: 'finance', label: 'Finance', pct: proofRate(trxFinance, docsFinance), gaps: gapCount(/finance|transaction|preuve|facture/) },
    { key: 'elevage', label: 'Élevage', pct: proofRate(trxElevage, docsElevage), gaps: gapCount(/elevage|avicole|animal|sante/) },
    { key: 'cultures', label: 'Cultures', pct: proofRate(trxCultures, docsCultures), gaps: gapCount(/culture|recolte|parcelle/) },
  ];
}
