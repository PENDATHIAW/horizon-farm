import { createSupabaseCrudService } from './baseSupabaseService';
import { syncPaymentToFinance, syncSalesOrderToFinance } from './financeSyncService';
import { documentsService } from './documentsService';
import { makeId } from '../utils/ids';

const rawSalesOrdersService = createSupabaseCrudService('sales_orders');
const rawInvoicesService = createSupabaseCrudService('invoices');
const rawPaymentsService = createSupabaseCrudService('payments');
const rawSalesOpportunitiesService = createSupabaseCrudService('sales_opportunities');

const toNumber = (value) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

const paidStatus = (total, paid) => {
  if (total > 0 && paid >= total) return 'paye';
  if (paid > 0) return 'partiel';
  return 'non_paye';
};

const opportunityClosed = (opp = {}) => /converti|convertie|ferme|fermée|cloture|clôture|commande/.test(lower(opp.status || opp.statut || opp.etat));

/** Évite les doublons finance quand saleSideEffects gère déjà la vente. */
const sideEffectsManaged = (row = {}) => row.side_effects_managed === true
  || ['vente_terrain_guidee', 'record_sale_payment', 'sale_side_effects'].includes(lower(row.created_from));

const opportunityMatchesOrder = (opp = {}, order = {}) => {
  const oppId = clean(opp.id);
  const sourceId = clean(opp.source_id || opp.related_id || opp.entity_id);
  const sourceModule = lower(opp.source_module || opp.created_from || opp.module_source);
  const orderSourceId = clean(order.source_id || order.related_id || order.entity_id);
  const orderSourceModule = lower(order.source_module || order.created_from || order.module_source);
  return clean(order.opportunity_id) === oppId
    || clean(order.source_opportunity_id) === oppId
    || clean(order.converted_opportunity_id) === oppId
    || (sourceId && orderSourceId === sourceId && (!sourceModule || !orderSourceModule || sourceModule === orderSourceModule));
};

const normalizeOrderStatus = (order = {}) => {
  const total = toNumber(order.montant_total ?? order.total_amount ?? order.total);
  const paid = toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
  const payment = paidStatus(total, paid);
  const currentOrderStatus = lower(order.statut_commande || order.status);
  const currentDeliveryStatus = lower(order.statut_livraison || order.delivery_status);
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
  const rawInvoiceStatus = lower(invoice.statut_facture || invoice.invoice_status || invoice.statut);
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

const closeLinkedOpportunity = async (order = {}) => {
  try {
    const opportunities = await rawSalesOpportunitiesService.getAll();
    const linked = opportunities.find((opp) => opportunityMatchesOrder(opp, order));
    if (!linked || opportunityClosed(linked)) return null;
    return await rawSalesOpportunitiesService.update(linked.id, {
      status: 'convertie',
      statut: 'convertie',
      etat: 'convertie',
      converted_order_id: order.id,
      source_order_id: order.id,
      converted_at: linked.converted_at || now(),
      updated_at: now(),
    });
  } catch (error) {
    console.warn('Fermeture opportunite liee impossible', error.message);
    return null;
  }
};

const documentExistsForInvoice = async (invoice = {}) => {
  try {
    const docs = await documentsService.getAll();
    const invoiceId = clean(invoice.id);
    const orderId = clean(invoice.order_id || invoice.sale_id || invoice.source_record_id || invoice.related_id);
    return docs.find((doc) => clean(doc.invoice_id) === invoiceId
      || clean(doc.related_id || doc.entity_id) === invoiceId
      || (orderId && clean(doc.order_id || doc.sale_id || doc.related_id) === orderId));
  } catch (error) {
    console.warn('Verification document facture impossible', error.message);
    return null;
  }
};

const syncInvoiceToDocument = async (invoice = {}) => {
  if (!invoice?.id) return null;
  try {
    const existing = await documentExistsForInvoice(invoice);
    const orderId = clean(invoice.order_id || invoice.sale_id || invoice.source_record_id || invoice.related_id);
    const amount = toNumber(invoice.montant_total ?? invoice.total_amount ?? invoice.total ?? invoice.amount);
    const payload = {
      id: existing?.id || `DOC-FAC-${invoice.id || makeId('DOC')}`,
      title: `Facture ${invoice.numero_facture || invoice.numero || invoice.id}`,
      titre: `Facture ${invoice.numero_facture || invoice.numero || invoice.id}`,
      type: 'facture_vente',
      document_category: 'facture',
      module_lie: 'ventes',
      module_source: 'ventes',
      entity_type: 'invoice',
      entity_id: invoice.id,
      invoice_id: invoice.id,
      order_id: orderId || null,
      sale_id: orderId || null,
      related_id: invoice.id,
      montant: amount,
      date: invoice.date_emission || invoice.date || today(),
      statut: 'genere',
      status: 'genere',
      description: `Document facture généré automatiquement pour la vente ${orderId || invoice.id}`,
      generated_from_invoice_at: now(),
    };
    if (existing?.id) return await documentsService.update(existing.id, payload);
    return await documentsService.create(payload);
  } catch (error) {
    console.warn('Document facture non synchronise', error.message);
    return null;
  }
};

export const salesOrdersService = {
  ...rawSalesOrdersService,
  async create(payload) {
    const order = await rawSalesOrdersService.create(normalizeOrderStatus(payload));
    if (!sideEffectsManaged(order || payload)) await syncSalesOrderToFinance(order || payload);
    await closeLinkedOpportunity(order || payload);
    return order;
  },
  async update(id, payload) {
    const order = await rawSalesOrdersService.update(id, normalizeOrderStatus({ ...payload, id }));
    if (!sideEffectsManaged(order || { ...payload, id })) await syncSalesOrderToFinance(order || { ...payload, id });
    await closeLinkedOpportunity(order || { ...payload, id });
    return order;
  },
};

export const salesOrderItemsService = createSupabaseCrudService('sales_order_items');
export const deliveriesService = createSupabaseCrudService('deliveries');

export const invoicesService = {
  ...rawInvoicesService,
  async create(payload) {
    const normalized = normalizeInvoicePayload(payload);
    const invoice = await rawInvoicesService.create(normalized);
    await syncInvoiceToDocument(invoice || normalized);
    return invoice;
  },
  async update(id, payload) {
    const normalized = normalizeInvoicePayload({ ...payload, id });
    const invoice = await rawInvoicesService.update(id, normalized);
    await syncInvoiceToDocument(invoice || normalized);
    return invoice;
  },
};

export const paymentsService = {
  ...rawPaymentsService,
  async create(payload) {
    const normalized = normalizePaymentPayload(payload);
    const payment = await rawPaymentsService.create(normalized);
    if (!sideEffectsManaged(normalized)) await syncPaymentToFinance(payment || normalized);
    await refreshOrderPaymentStatus(normalized.order_id || normalized.sale_id || normalized.source_record_id);
    return payment;
  },
  async update(id, payload) {
    const normalized = normalizePaymentPayload({ ...payload, id });
    const payment = await rawPaymentsService.update(id, normalized);
    if (!sideEffectsManaged(normalized)) await syncPaymentToFinance(payment || normalized);
    await refreshOrderPaymentStatus(normalized.order_id || normalized.sale_id || normalized.source_record_id);
    return payment;
  },
};

export const salesOpportunitiesService = rawSalesOpportunitiesService;
