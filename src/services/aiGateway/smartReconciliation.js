/**
 * Rapprochement intelligent — suggestions uniquement ; sync via recordSalePayment / services finance.
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';
import { reconciliationWouldDuplicate } from '../../utils/financeReconciliation.js';

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
  const hasExistingPayment = Boolean(clean(payment.id));
  const targetWorkflow = hasExistingPayment
    ? TARGET_WORKFLOWS.FINANCE_RECONCILIATION
    : TARGET_WORKFLOWS.SALE_PAYMENT;

  const warnings = [];
  if (ambiguous) {
    warnings.push('Plusieurs écritures possibles : choisissez la bonne avant validation.');
  }
  if (!candidateTx && amount > 0 && !hasExistingPayment) {
    warnings.push('Aucune écriture finance exacte ; l\'encaissement passera par recordSalePayment.');
  }
  if (hasExistingPayment && reconciliationWouldDuplicate('payment_without_finance', { payment, transactions })) {
    warnings.push('Une ligne finance existe déjà pour ce paiement.');
  }

  return createAiActionDraft({
    intent: 'payment_reconciliation',
    confidence: ambiguous ? 0.42 : missing.length ? 0.5 : candidateTx ? 0.9 : hasExistingPayment ? 0.88 : 0.72,
    source: AI_DRAFT_SOURCES.RECONCILIATION,
    draft: {
      payment,
      sale: { ...sale, id: saleId },
      order: { ...sale, id: saleId },
      requestedAmount: amount,
      paymentMethod: payment.mode || payment.payment_method || payment.moyen_paiement || 'especes',
      paymentDate: payment.date || payment.paid_at || payment.date_paiement,
      context: { transactions, clients, salesOrders },
      suggested_transaction_id: candidateTx?.id || null,
      recon_row_kind: 'payment_without_finance',
    },
    target_workflow: targetWorkflow,
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

/**
 * Propose un brouillon IA à partir d'une ligne d'écart rapprochement (lecture seule).
 */
export function proposeReconciliationDraftFromRow(row = {}, context = {}) {
  const transactions = arr(context.transactions);
  const salesOrders = arr(context.salesOrders);

  if (row.kind === 'payment_without_finance') {
    const draft = proposeReconciliationDraft({
      payment: row.payment,
      sale: row.order,
      transactions,
      salesOrders,
    });
    return {
      ...draft,
      draft: {
        ...draft.draft,
        recon_row_id: row.id,
        recon_row_kind: row.kind,
      },
    };
  }

  if (row.kind === 'finance_without_payment') {
    return createAiActionDraft({
      intent: 'finance_without_payment',
      confidence: 0.7,
      source: AI_DRAFT_SOURCES.RECONCILIATION,
      draft: {
        transaction: row.transaction,
        orderId: row.orderId,
        recon_row_id: row.id,
        recon_row_kind: row.kind,
        recommended_action: 'Ouvrir Commercial pour lier ou enregistrer le paiement vente.',
      },
      target_workflow: TARGET_WORKFLOWS.OPEN_FORM,
      required_validation: true,
      warnings: ['Aucune écriture finance automatique — redirection vers Commercial.'],
      status: 'awaiting_validation',
    });
  }

  if (row.kind === 'stockable_without_stock') {
    return createAiActionDraft({
      intent: 'stockable_without_stock',
      confidence: 0.74,
      source: AI_DRAFT_SOURCES.RECONCILIATION,
      draft: {
        transaction: row.transaction,
        recon_row_id: row.id,
        recon_row_kind: row.kind,
        recommended_action: 'Passer par Achats & Stock → réception achat (formulaire prérempli).',
      },
      target_workflow: TARGET_WORKFLOWS.OPEN_FORM,
      required_validation: true,
      warnings: ['La dépense stockable doit créer une entrée stock via le workflow achat.'],
      status: 'awaiting_validation',
    });
  }

  return null;
}

/**
 * Brouillons IA pour les écarts rapprochement visibles (max N).
 */
export function proposeReconciliationDraftsFromRows({
  rows = [],
  transactions = [],
  salesOrders = [],
  limit = 8,
} = {}) {
  return arr(rows)
    .slice(0, limit)
    .map((row) => proposeReconciliationDraftFromRow(row, { transactions, salesOrders }))
    .filter(Boolean);
}
