import { toNumber } from '../utils/format';
import { paidForOrder, remainingForOrder, normalizePaymentStatus, normalizeOrderStatus, normalizeDeliveryStatus, normalizeInvoiceStatus } from '../utils/salesStatuses';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const orderTotal = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const paymentOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
const isCancelledPayment = (row = {}) => ['annule', 'annulé', 'annulee', 'cancelled', 'rejete', 'rejeté'].includes(lower(row.statut || row.status));
const financePaymentId = (row = {}) => clean(row.payment_id || row.paiement_id || row.source_payment_id);
const financeOrderId = (row = {}) => clean(row.related_id || row.source_record_id || row.order_id || row.sale_id || row.commande_id);
const financeAmount = (row = {}) => toNumber(row.montant ?? row.amount);
const financeIsSaleCash = (row = {}) => lower(`${row.type || ''} ${row.module_lie || ''} ${row.source_module || ''}`).includes('entree') || lower(`${row.type || ''} ${row.module_lie || ''} ${row.source_module || ''}`).includes('vente');

export function findExistingPayment({ orderId, amount, payments = [], paymentId = '' }) {
  const targetOrder = clean(orderId);
  const targetAmount = toNumber(amount);
  return arr(payments).find((payment) => {
    if (isCancelledPayment(payment)) return false;
    if (paymentId && clean(payment.id) === clean(paymentId)) return true;
    if (paymentOrderId(payment) !== targetOrder) return false;
    return Math.abs(paymentAmount(payment) - targetAmount) < 1;
  }) || null;
}

export function findExistingFinanceForPayment({ orderId, paymentId, amount, transactions = [] }) {
  const targetPayment = clean(paymentId);
  const targetOrder = clean(orderId);
  const targetAmount = toNumber(amount);
  return arr(transactions).find((trx) => {
    if (!financeIsSaleCash(trx)) return false;
    if (targetPayment && financePaymentId(trx) === targetPayment) return true;
    if (targetOrder && financeOrderId(trx) === targetOrder && Math.abs(financeAmount(trx) - targetAmount) < 1) return true;
    return false;
  }) || null;
}

export function capPaymentToRemaining(order = {}, payments = [], requested = 0) {
  const remaining = remainingForOrder(order, payments);
  return Math.max(0, Math.min(toNumber(requested), remaining));
}

export function buildCoherentOrderPatch(order = {}, payments = [], extraPatch = {}) {
  const paid = paidForOrder(order, payments);
  const remaining = remainingForOrder(order, payments);
  const paymentStatus = normalizePaymentStatus({ ...order, montant_paye: paid }, payments);
  const orderStatus = normalizeOrderStatus({ ...order, montant_paye: paid }, payments);
  const deliveryStatus = normalizeDeliveryStatus(order);
  const invoiceStatus = normalizeInvoiceStatus(order);
  return {
    ...extraPatch,
    montant_paye: paid,
    reste_a_payer: remaining,
    statut_paiement: paymentStatus,
    payment_status: paymentStatus,
    statut_commande: orderStatus,
    order_status: orderStatus,
    statut_livraison: deliveryStatus,
    delivery_status: deliveryStatus,
    statut_facture: invoiceStatus,
    invoice_status: invoiceStatus,
    relance_active: remaining > 0,
    statut_relance: remaining > 0 ? (order.statut_relance || 'a_relancer') : 'solde',
    creance: remaining,
  };
}

export function analyzeSalesIntegrity({ orders = [], payments = [], transactions = [], invoices = [] }) {
  return arr(orders).map((order) => {
    const id = clean(order.id);
    const orderPayments = arr(payments).filter((payment) => paymentOrderId(payment) === id && !isCancelledPayment(payment));
    const paid = orderPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
    const total = orderTotal(order);
    const financeForPayments = orderPayments.map((payment) => ({ payment, finance: findExistingFinanceForPayment({ orderId: id, paymentId: payment.id, amount: paymentAmount(payment), transactions }) }));
    const duplicatePayments = orderPayments.filter((payment, index) => orderPayments.findIndex((candidate) => Math.abs(paymentAmount(candidate) - paymentAmount(payment)) < 1 && String(candidate.date_paiement || candidate.date || '').slice(0, 10) === String(payment.date_paiement || payment.date || '').slice(0, 10)) !== index);
    const missingFinance = financeForPayments.filter((item) => !item.finance);
    const overpaid = total > 0 && paid > total + 1;
    const soldButRelance = remainingForOrder(order, payments) <= 0 && ['a_relancer', 'relance', 'en_relance'].includes(lower(order.statut_relance || order.relance_status || order.status_relance));
    const invoiceOrder = arr(invoices).filter((invoice) => clean(invoice.order_id || invoice.sale_id || invoice.source_record_id || invoice.related_id) === id);
    return { order, total, paid, remaining: Math.max(0, total - paid), duplicatePayments, missingFinance, overpaid, soldButRelance, invoiceCount: invoiceOrder.length };
  });
}
