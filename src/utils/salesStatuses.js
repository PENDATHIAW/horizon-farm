import { toNumber } from './format.js';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim().toLowerCase();
const total = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount);
const orderPaid = (order = {}) => toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
const paymentOrderId = (payment = {}) => payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id;
const INACTIVE_PAYMENT_STATUSES = new Set([
  'annule', 'annulé', 'annulee', 'annulée', 'cancelled',
  'supprime', 'supprimé', 'deleted', 'rejete', 'rejeté',
  'echoue', 'échoué', 'echouee', 'échouée', 'failed',
  'rembourse', 'remboursé', 'remboursee', 'remboursée', 'refunded',
]);
const orderedQty = (order = {}) => Math.max(1, toNumber(order.quantite_commandee ?? order.quantite ?? order.quantity ?? order.qty ?? 1));
const deliveredQty = (order = {}) => Math.max(0, toNumber(order.quantite_livree ?? order.delivered_qty ?? order.qty_delivered ?? order.livree ?? 0));

export const SALES_ORDER_STATUSES = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'enregistree', label: 'Enregistrée' },
  { value: 'confirme', label: 'Confirmée' },
  { value: 'livree_partielle', label: 'Livrée partiellement' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annule', label: 'Annulée' },
];
export const PAYMENT_STATUSES = [
  { value: 'non_paye', label: 'Non payé' },
  { value: 'partiel', label: 'Partiel' },
  { value: 'paye', label: 'Payé' },
  { value: 'rembourse', label: 'Remboursé' },
];
export const INVOICE_STATUSES = [
  { value: 'non_emise', label: 'Non émise' },
  { value: 'emise', label: 'Émise' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'avoir', label: 'Avoir' },
];
export const DELIVERY_STATUSES = [
  { value: 'a_preparer', label: 'À préparer' },
  { value: 'prete', label: 'Prête' },
  { value: 'partielle', label: 'Partielle' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annulee', label: 'Annulée' },
];

export function deliveryQuantity(order = {}) {
  const ordered = orderedQty(order);
  const delivered = Math.min(ordered, deliveredQty(order));
  return { ordered, delivered, remaining: Math.max(0, ordered - delivered), rate: ordered > 0 ? Number(((delivered / ordered) * 100).toFixed(1)) : 0 };
}

export function paidForOrder(order = {}, payments = []) {
  const paidFromPayments = arr(payments)
    .filter((payment) => String(paymentOrderId(payment) || '') === String(order.id || ''))
    .filter((payment) => !INACTIVE_PAYMENT_STATUSES.has(clean(payment.statut || payment.status)))
    .reduce((sum, payment) => sum + toNumber(payment.montant_paye ?? payment.montant ?? payment.amount), 0);
  return Math.max(orderPaid(order), paidFromPayments);
}

export function remainingForOrder(order = {}, payments = []) {
  return Math.max(0, total(order) - paidForOrder(order, payments));
}

export function normalizePaymentStatus(order = {}, payments = []) {
  const amount = total(order);
  const paid = paidForOrder(order, payments);
  if (amount <= 0) return 'non_paye';
  if (paid >= amount) return 'paye';
  if (paid > 0) return 'partiel';
  return 'non_paye';
}

export function normalizeOrderStatus(order = {}, payments = []) {
  const current = clean(order.statut_commande || order.order_status || order.status);
  const delivery = normalizeDeliveryStatus(order);
  if (['annule', 'annulée', 'annulee'].includes(current)) return 'annule';
  if (delivery === 'livree') return 'livree';
  if (delivery === 'partielle') return 'livree_partielle';
  if (normalizePaymentStatus(order, payments) !== 'non_paye') return 'confirme';
  if (total(order) > 0) return current && current !== 'brouillon' ? current : 'enregistree';
  return current || 'brouillon';
}

export function normalizeInvoiceStatus(invoiceOrOrder = {}) {
  const current = clean(invoiceOrOrder.invoice_status || invoiceOrOrder.statut_facture || invoiceOrOrder.statut || invoiceOrOrder.status);
  if (['annule', 'annulée', 'annulee'].includes(current)) return 'annulee';
  if (['avoir'].includes(current)) return 'avoir';
  if (invoiceOrOrder.invoice_id || invoiceOrOrder.facture_id || invoiceOrOrder.numero_facture || ['emise', 'émise', 'emis', 'issued'].includes(current)) return 'emise';
  return 'non_emise';
}

export function normalizeDeliveryStatus(deliveryOrOrder = {}) {
  const current = clean(deliveryOrOrder.delivery_status || deliveryOrOrder.statut_livraison || deliveryOrOrder.statut || deliveryOrOrder.status);
  if (['annule', 'annulée', 'annulee'].includes(current)) return 'annulee';
  const q = deliveryQuantity(deliveryOrOrder);
  if (q.delivered >= q.ordered && q.ordered > 0) return 'livree';
  if (q.delivered > 0 && q.remaining > 0) return 'partielle';
  if (['livre', 'livrée', 'livree'].includes(current)) return 'livree';
  if (['partiel', 'partielle', 'partial'].includes(current)) return 'partielle';
  if (['prete', 'prête', 'ready'].includes(current)) return 'prete';
  return 'a_preparer';
}

export function statusLabel(status, options) {
  return options.find((option) => option.value === status)?.label || status || '-';
}

export function enrichSalesOrderStatus(order = {}, payments = []) {
  const delivery = deliveryQuantity(order);
  const order_status = normalizeOrderStatus(order, payments);
  const payment_status = normalizePaymentStatus(order, payments);
  const invoice_status = normalizeInvoiceStatus(order);
  const delivery_status = normalizeDeliveryStatus(order);
  const paid = paidForOrder(order, payments);
  const remaining = remainingForOrder(order, payments);
  return {
    ...order,
    quantite_commandee: delivery.ordered,
    quantite_livree: delivery.delivered,
    reste_a_livrer: delivery.remaining,
    taux_livraison: delivery.rate,
    statut_commande: order_status,
    statut_paiement: payment_status,
    statut_facture: invoice_status,
    statut_livraison: delivery_status,
    montant_paye: paid,
    reste_a_payer: remaining,
    order_status_label: statusLabel(order_status, SALES_ORDER_STATUSES),
    payment_status_label: statusLabel(payment_status, PAYMENT_STATUSES),
    invoice_status_label: statusLabel(invoice_status, INVOICE_STATUSES),
    delivery_status_label: statusLabel(delivery_status, DELIVERY_STATUSES),
  };
}

export function isOpenForPayment(order = {}, payments = []) {
  return total(order) > 0 && normalizeOrderStatus(order, payments) !== 'annule' && normalizePaymentStatus(order, payments) !== 'paye' && remainingForOrder(order, payments) > 0;
}
