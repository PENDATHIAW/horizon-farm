/**
 * Rapprochement intelligent — suggestions uniquement ; sync via recordSalePayment / services finance.
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const toNum = (value) => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function amountOf(row = {}) {
  return toNum(row.montant ?? row.amount ?? row.montant_total ?? row.total);
}

function paymentMatchesTransaction(payment = {}, transaction = {}, tolerance = 1) {
  const pa = amountOf(payment);
  const ta = amountOf(transaction);
  if (!pa || !ta) return false;
  return Math.abs(pa - ta) <= tolerance;
}

/**
 * Détecte paiements sans écriture finance correspondante (lecture seule).
 */
export function findUnmatchedPayments(payments = [], transactions = []) {
  const txs = arr(transactions);
  const financeIds = new Set(txs.map((t) => clean(t.payment_id || t.source_payment_id)).filter(Boolean));

  return arr(payments).filter((p) => {
    const id = clean(p.id);
    if (!id) return false;
    if (financeIds.has(id)) return false;
    const linked = txs.some((t) => clean(t.related_id) === id || clean(t.source_record_id) === id);
    return !linked;
  });
}

/**
 * Propose un brouillon de rapprochement (encaissement workflow) — pas de création finance directe.
 */
export function proposeReconciliationDraft({
  payment = {},
  sale = {},
  transactions = [],
  clients = [],
  salesOrders = [],
} = {}) {
  const amount = amountOf(payment);
  const saleId = clean(sale.id || payment.sale_id || payment.order_id);
  const missing = [];
  if (!saleId) missing.push('sale_id');
  if (!amount) missing.push('amount');

  const candidateTx = arr(transactions).find((t) => paymentMatchesTransaction(payment, t));
  const ambiguous = arr(transactions).filter((t) => paymentMatchesTransaction(payment, t)).length > 1;

  const warnings = [];
  if (ambiguous) {
    warnings.push('Plusieurs écritures possibles : choisissez la bonne avant validation.');
  }
  if (!candidateTx && amount > 0) {
    warnings.push('Aucune écriture finance exacte ; l\'encaissement passera par recordSalePayment.');
  }

  return createAiActionDraft({
    intent: 'payment_reconciliation',
    confidence: ambiguous ? 0.42 : missing.length ? 0.5 : candidateTx ? 0.9 : 0.72,
    source: AI_DRAFT_SOURCES.RECONCILIATION,
    draft: {
      payment,
      sale: { ...sale, id: saleId },
      requestedAmount: amount,
      paymentMethod: payment.mode || payment.payment_method || 'especes',
      paymentDate: payment.date || payment.paid_at,
      context: { transactions, clients, salesOrders },
      suggested_transaction_id: candidateTx?.id || null,
    },
    target_workflow: TARGET_WORKFLOWS.SALE_PAYMENT,
    required_validation: true,
    missing_fields: missing,
    warnings,
    confirmation_required: ambiguous || missing.length > 0,
    status: ambiguous ? 'needs_confirmation' : missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}

/**
 * Liste de brouillons rapprochement pour paiements orphelins (max N).
 */
export function proposeReconciliationDraftsForOrphans({
  payments = [],
  transactions = [],
  sales = [],
  limit = 5,
} = {}) {
  const unmatched = findUnmatchedPayments(payments, transactions);
  const salesById = new Map(arr(sales).map((s) => [clean(s.id), s]));

  return unmatched.slice(0, limit).map((payment) => {
    const saleId = clean(payment.sale_id || payment.order_id);
    return proposeReconciliationDraft({
      payment,
      sale: salesById.get(saleId) || { id: saleId },
      transactions,
    });
  });
}
