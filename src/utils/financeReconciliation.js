/**
 * Rapprochement finance ↔ ventes / paiements / stock (réparation historique, anti-doublon).
 */

import { findExistingFinanceForPayment } from '../services/salesIntegrityService.js';
import { buildPaidFinanceRow, financeIds } from './saleSideEffects.js';
import {
  enrichFinanceTransaction,
  ORIGIN_TYPES,
  resolveOriginType,
} from './financeTransactionMeta.js';
import {
  financeTransactionHasStockLink,
  isStockableFinanceTransaction,
} from './stockPurchaseWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => Number(value || 0) || 0;

const amount = (row = {}) => num(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const paymentAmount = (row = {}) => num(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const paymentOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id);
const paymentDate = (row = {}) => String(row.date_paiement || row.payment_date || row.date || row.created_at || '').slice(0, 10);
const paymentMethod = (row = {}) => lower(row.moyen_paiement || row.mode_paiement || row.payment_method || row.method);
const isCancelledPayment = (row = {}) => ['annule', 'annulé', 'annulee', 'cancelled', 'rejete', 'rejeté'].includes(lower(row.statut || row.status));

const isIncomeTx = (row = {}) => ['entree', 'entrée', 'income', 'recette'].includes(lower(row.type || row.nature || row.transaction_type));
const isSaleFinance = (row = {}) => {
  const text = lower(`${row.module_lie || ''} ${row.source_module || ''} ${row.categorie || ''} ${row.libelle || ''}`);
  return isIncomeTx(row) && (text.includes('vente') || text.includes('encaissement') || text.includes('client') || clean(row.order_id || row.vente_id));
};

export function buildFinanceReconciliationRows({
  transactions = [],
  payments = [],
  salesOrders = [],
  stocks = [],
} = {}) {
  const rows = [];
  const txList = arr(transactions);
  const payList = arr(payments).filter((p) => !isCancelledPayment(p));

  payList.forEach((payment) => {
    const orderId = paymentOrderId(payment);
    const payId = clean(payment.id);
    const amt = paymentAmount(payment);
    if (!orderId || amt <= 0) return;

    const finance = findExistingFinanceForPayment({
      orderId,
      paymentId: payId,
      amount: amt,
      transactions: txList,
      date: paymentDate(payment),
      method: paymentMethod(payment),
    });

    if (!finance) {
      const order = arr(salesOrders).find((o) => clean(o.id) === orderId);
      rows.push({
        id: `recon-pay-${payId}`,
        kind: 'payment_without_finance',
        title: `Paiement sans ligne finance · ${orderId}`,
        detail: `${amt} FCFA · ${paymentDate(payment) || '—'}`,
        payment,
        order: order || { id: orderId },
        canCreate: true,
      });
    }
  });

  txList.forEach((trx) => {
    const val = amount(trx);
    if (val <= 0) return;

    if (isSaleFinance(trx) && resolveOriginType(trx) !== ORIGIN_TYPES.MANUAL) {
      const orderId = clean(trx.order_id || trx.vente_id || trx.related_id || trx.source_record_id);
      const payId = clean(trx.payment_id);
      const hasPayment = payId
        ? payList.some((p) => clean(p.id) === payId)
        : payList.some((p) => paymentOrderId(p) === orderId && Math.abs(paymentAmount(p) - val) < 1);

      if (orderId && !hasPayment) {
        rows.push({
          id: `recon-fin-${trx.id}`,
          kind: 'finance_without_payment',
          title: `Recette finance sans paiement vente · ${trx.libelle || trx.id}`,
          detail: `${val} FCFA · commande ${orderId}`,
          transaction: trx,
          orderId,
          canLink: true,
        });
      }
    }

    if (!isIncomeTx(trx) && isStockableFinanceTransaction(trx) && !financeTransactionHasStockLink(trx, stocks)) {
      rows.push({
        id: `recon-stock-${trx.id}`,
        kind: 'stockable_without_stock',
        title: `Dépense stockable sans entrée stock · ${trx.libelle || trx.id}`,
        detail: `${val} FCFA`,
        transaction: trx,
        redirectModule: 'achats_stock',
        redirectTab: 'Stock',
      });
    }
  });

  return rows;
}

/** Proposition de ligne finance pour un paiement orphelin (vérifie doublon). */
export function buildFinanceFromPaymentRepair({
  payment = {},
  order = {},
  transactions = [],
} = {}) {
  const orderId = paymentOrderId(payment);
  const payId = clean(payment.id);
  const amt = paymentAmount(payment);
  const date = paymentDate(payment);
  const method = paymentMethod(payment);

  const existing = findExistingFinanceForPayment({
    orderId,
    paymentId: payId,
    amount: amt,
    transactions,
    date,
    method,
  });
  if (existing) return { duplicate: true, existing };

  const row = buildPaidFinanceRow({
    orderId,
    clientId: order.client_id || payment.client_id || '',
    clientLabel: order.client_nom || order.customer_name || order.client_label || 'Client',
    amount: amt,
    date,
    paymentId: payId,
    paymentMethod: method || 'especes',
    invoiceId: order.invoice_id || payment.invoice_id || '',
    order,
    remaining: 0,
  });

  return {
    duplicate: false,
    row: enrichFinanceTransaction(row, {
      origin_type: ORIGIN_TYPES.WORKFLOW,
      created_from: 'finance_reconciliation',
      issue_key: `finance:ventes:${orderId}:payment:${payId}`,
    }),
  };
}

/** Vérifie qu’une création rapprochement ne dupliquera pas une ligne existante. */
export function reconciliationWouldDuplicate(kind = '', ctx = {}) {
  if (kind === 'payment_without_finance') {
    const { payment, transactions = [] } = ctx;
    const existing = findExistingFinanceForPayment({
      orderId: paymentOrderId(payment),
      paymentId: clean(payment?.id),
      amount: paymentAmount(payment),
      transactions,
      date: paymentDate(payment),
      method: paymentMethod(payment),
    });
    return Boolean(existing);
  }
  if (kind === 'finance_without_payment') {
    const payId = clean(ctx.transaction?.payment_id);
    if (!payId) return false;
    return arr(ctx.payments).some((p) => clean(p.id) === payId);
  }
  return false;
}

/**
 * Workflow rapprochement — crée la ligne finance manquante pour un paiement existant.
 * Seule voie d'écriture autorisée pour les brouillons IA de rapprochement.
 */
export async function commitFinanceReconciliationRepair({
  payment = {},
  order = {},
  sale = {},
  transactions = [],
  handlers = {},
} = {}) {
  const resolvedOrder = order?.id ? order : sale;
  if (reconciliationWouldDuplicate('payment_without_finance', { payment, transactions })) {
    return { skipped: true, reason: 'duplicate', ok: false };
  }
  const built = buildFinanceFromPaymentRepair({
    payment,
    order: resolvedOrder,
    transactions,
  });
  if (built.duplicate) {
    return { skipped: true, reason: 'duplicate', existing: built.existing, ok: false };
  }
  if (!built.row) {
    return { skipped: true, reason: 'invalid', ok: false };
  }
  if (!handlers.onCreateFinanceTransaction) {
    return { skipped: true, reason: 'no_handler', ok: false };
  }
  await handlers.onCreateFinanceTransaction(built.row);
  return { ok: true, financeId: built.row.id, paymentId: clean(payment.id) };
}

export { financeIds };
