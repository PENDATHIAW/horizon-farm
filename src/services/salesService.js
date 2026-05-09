import { createSupabaseCrudService } from './baseSupabaseService';
import { syncPaymentToFinance, syncSalesOrderToFinance } from './financeSyncService';

const rawSalesOrdersService = createSupabaseCrudService('sales_orders');
const rawInvoicesService = createSupabaseCrudService('invoices');
const rawPaymentsService = createSupabaseCrudService('payments');

const toNumber = (value) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const paidStatus = (total, paid) => {
  if (total > 0 && paid >= total) return 'paye';
  if (paid > 0) return 'partiel';
  return 'non_paye';
};
const normalizeOrderStatus = (order = {}) => {
  const total = toNumber(order.montant_total ?? order.total_amount ?? order.total);
  const paid = toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
  const payment = paidStatus(total, paid);
  const currentOrderStatus = String(order.statut_commande || order.status || '').toLowerCase();
  const currentDeliveryStatus = String(order.statut_livraison || order.delivery_status || '').toLowerCase();
  let orderStatus = currentOrderStatus || 'enregistree';

  if (currentOrderStatus === 'annule') orderStatus = 'annule';
  else if (currentDeliveryStatus === 'livre') orderStatus = 'livre';
  else if (paid > 0 && ['brouillon', '', 'draft'].includes(currentOrderStatus)) orderStatus = 'confirme';
  else if (!currentOrderStatus || currentOrderStatus === 'brouillon') orderStatus = total > 0 ? 'enregistree' : 'brouillon';

  return {
    ...order,
    statut_commande: orderStatus,
    statut_paiement: payment,
    montant_paye: paid,
    reste_a_payer: Math.max(0, total - paid),
  };
};

const normalizeInvoicePayload = (invoice = {}) => {
  const rawInvoiceStatus = String(invoice.statut_facture || invoice.invoice_status || invoice.statut || '').toLowerCase();
  const paymentLike = ['paye', 'payé', 'partiel', 'non_paye', 'impaye', 'impayé'];
  let statutFacture = rawInvoiceStatus;
  if (!statutFacture || paymentLike.includes(statutFacture)) statutFacture = invoice.date_envoi || invoice.sent_at ? 'envoyee' : 'emise';
  if (statutFacture === 'émise') statutFacture = 'emise';
  if (statutFacture === 'envoyée') statutFacture = 'envoyee';
  if (statutFacture === 'annulée') statutFacture = 'annulee';

  return {
    ...invoice,
    statut_facture: statutFacture,
    invoice_status: statutFacture,
    statut: statutFacture,
    date_emission: invoice.date_emission || invoice.date || today(),
  };
};

const normalizePaymentPayload = (payment = {}) => {
  const amount = toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount);
  const date = payment.date_paiement || payment.date || payment.paid_at || today();
  return {
    ...payment,
    montant_paye: amount,
    montant: payment.montant ?? amount,
    amount: payment.amount ?? amount,
    date_paiement: date,
    date: payment.date || date,
    statut: payment.statut || 'paye',
  };
};

const refreshOrderPaymentStatus = async (orderId) => {
  if (!orderId) return null;
  try {
    const orders = await rawSalesOrdersService.getAll();
    const order = orders.find((row) => String(row.id) === String(orderId));
    if (!order) return null;
    const payments = await rawPaymentsService.getAll();
    const totalPaid = payments
      .filter((payment) => String(payment.order_id || payment.sale_id || payment.source_record_id || '') === String(orderId))
      .filter((payment) => String(payment.statut || 'paye') !== 'annule')
      .reduce((sum, payment) => sum + toNumber(payment.montant_paye ?? payment.montant ?? payment.amount), 0);
    const total = toNumber(order.montant_total ?? order.total_amount ?? order.total);
    const patch = normalizeOrderStatus({ ...order, montant_paye: Math.min(total || totalPaid, totalPaid) });
    return await rawSalesOrdersService.update(orderId, patch);
  } catch (error) {
    console.warn('Mise a jour statut commande impossible', error.message);
    return null;
  }
};

export const salesOrdersService = {
  ...rawSalesOrdersService,
  async create(payload) {
    const order = await rawSalesOrdersService.create(normalizeOrderStatus(payload));
    await syncSalesOrderToFinance(order || payload);
    return order;
  },
  async update(id, payload) {
    const order = await rawSalesOrdersService.update(id, normalizeOrderStatus({ ...payload, id }));
    await syncSalesOrderToFinance(order || { ...payload, id });
    return order;
  },
};

export const salesOrderItemsService = createSupabaseCrudService('sales_order_items');
export const deliveriesService = createSupabaseCrudService('deliveries');

export const invoicesService = {
  ...rawInvoicesService,
  async create(payload) {
    return rawInvoicesService.create(normalizeInvoicePayload(payload));
  },
  async update(id, payload) {
    return rawInvoicesService.update(id, normalizeInvoicePayload({ ...payload, id }));
  },
};

export const paymentsService = {
  ...rawPaymentsService,
  async create(payload) {
    const normalized = normalizePaymentPayload(payload);
    const payment = await rawPaymentsService.create(normalized);
    await syncPaymentToFinance(payment || normalized);
    await refreshOrderPaymentStatus(normalized.order_id || normalized.sale_id || normalized.source_record_id);
    return payment;
  },
  async update(id, payload) {
    const normalized = normalizePaymentPayload({ ...payload, id });
    const payment = await rawPaymentsService.update(id, normalized);
    await syncPaymentToFinance(payment || normalized);
    await refreshOrderPaymentStatus(normalized.order_id || normalized.sale_id || normalized.source_record_id);
    return payment;
  },
};

export const salesOpportunitiesService = createSupabaseCrudService('sales_opportunities');
