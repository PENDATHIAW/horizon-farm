/**
 * Commercial V2 — workflow Devis → Commande → Facture.
 * Réutilise sales_orders (type_document = devis) sans impact stock au stade devis.
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import {
  buildCommercialSaleRecords,
  computeSaleAmounts,
  normalizeSaleLines,
  prepareCommercialSaleCommit,
  validateCommercialSaleForm,
} from './commercialSaleWorkflow.js';
import { runNewSaleSideEffects } from './saleSideEffects.js';
import { stampFarmIdOnCommercialRecords } from './commercialFarmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const QUOTE_STATUSES = {
  DRAFT: 'brouillon',
  SENT: 'envoye',
  ACCEPTED: 'accepte',
  REFUSED: 'refuse',
  CONVERTED: 'converti',
};

export const QUOTE_STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  converti: 'Converti',
};

export function isQuoteOrder(order = {}) {
  return lower(order.type_document || order.document_type || order.type) === 'devis';
}

export function quoteStatusOf(order = {}) {
  return lower(order.quote_status || order.statut_devis || order.statut_commande || QUOTE_STATUSES.DRAFT);
}

export function isQuoteOpen(order = {}) {
  if (!isQuoteOrder(order)) return false;
  return ![QUOTE_STATUSES.REFUSED, QUOTE_STATUSES.CONVERTED].includes(quoteStatusOf(order));
}

export function buildQuoteRecords({
  form = {},
  orderId = '',
  clientLabel = 'Client',
  selectedMeta = null,
  farmId = null,
  quoteStatus = QUOTE_STATUSES.DRAFT,
} = {}) {
  const creditForm = {
    ...form,
    payment_status: 'non_paye',
    paid_amount: 0,
    invoice_issued: false,
  };
  const base = buildCommercialSaleRecords({
    form: creditForm,
    orderId: orderId || makeId('DEV'),
    clientLabel,
    selectedMeta,
    farmId,
  });

  const status = quoteStatus || QUOTE_STATUSES.DRAFT;
  const order = {
    ...base.order,
    type_document: 'devis',
    document_type: 'devis',
    quote_status: status,
    statut_devis: status,
    statut_commande: status,
    statut_paiement: 'non_paye',
    montant_paye: 0,
    reste_a_payer: base.order.montant_total,
    converted_from_quote_id: '',
    quote_sent_at: status === QUOTE_STATUSES.SENT ? now() : null,
    side_effects_managed: true,
    stock_impact_applied: false,
    created_from: 'commercial_quote_workflow',
  };

  return stampFarmIdOnCommercialRecords({
    ...base,
    order,
    delivery: null,
    invoice: null,
    document: null,
    payment: null,
    paid: 0,
    remaining: base.order.montant_total,
    isQuote: true,
  }, farmId);
}

export function validateQuoteForm(form = {}, options = {}) {
  const msg = validateCommercialSaleForm(
    { ...form, payment_status: 'non_paye', invoice_issued: false },
    { ...options, walkInOnlyPaid: false },
  );
  if (msg) return msg;
  if (form.client_id === 'client_passage') return 'Un devis nécessite un client identifié.';
  return '';
}

/** Persiste un devis sans impact stock ni finance. */
export async function commitCommercialQuote(records, handlers = {}) {
  const { onCreateOrder, onCreateItem, onCreateBusinessEvent, onRefreshWorkflow } = handlers;
  await onCreateOrder?.(records.order);
  for (const item of arr(records.items)) {
    await onCreateItem?.(item);
  }
  if (records.businessEvent) {
    await onCreateBusinessEvent?.({
      ...records.businessEvent,
      event_type: 'devis_commercial',
      title: `Devis ${records.order.product_name}`,
      description: `Statut: ${quoteStatusOf(records.order)}`,
    });
  }
  await onRefreshWorkflow?.();
  return { orderId: records.order.id, quoteId: records.order.id };
}

export function prepareCommercialQuoteCommit(options = {}) {
  const farmResult = prepareCommercialSaleCommit({
    ...options,
    form: { ...options.form, payment_status: 'non_paye', invoice_issued: false },
  });
  const records = buildQuoteRecords({
    form: options.form,
    orderId: options.orderId,
    clientLabel: options.clientLabel,
    selectedMeta: options.selectedMeta,
    farmId: farmResult.farmId,
    quoteStatus: options.quoteStatus || QUOTE_STATUSES.DRAFT,
  });
  return { records, farmContext: farmResult.farmContext, farmId: farmResult.farmId };
}

/** Met à jour le statut devis (envoyé, accepté, refusé). */
export async function updateQuoteStatus(quote = {}, nextStatus = '', handlers = {}) {
  const status = lower(nextStatus);
  if (!isQuoteOrder(quote)) throw new Error('Document non devis.');
  const patch = {
    quote_status: status,
    statut_devis: status,
    statut_commande: status,
    quote_sent_at: status === QUOTE_STATUSES.SENT ? now() : quote.quote_sent_at,
    quote_accepted_at: status === QUOTE_STATUSES.ACCEPTED ? now() : quote.quote_accepted_at,
    quote_refused_at: status === QUOTE_STATUSES.REFUSED ? now() : quote.quote_refused_at,
  };
  await handlers.onUpdateOrder?.(quote.id, patch);
  return { ...quote, ...patch };
}

/** Convertit un devis accepté en commande validée avec impacts ERP. */
export async function convertQuoteToOrder({
  quote = {},
  items = [],
  form = {},
  handlers = {},
  context = {},
} = {}) {
  if (!isQuoteOrder(quote)) throw new Error('Seul un devis peut être converti.');
  if (quoteStatusOf(quote) === QUOTE_STATUSES.CONVERTED) {
    return { skipped: true, reason: 'already_converted', orderId: quote.converted_order_id || quote.id };
  }

  const lines = normalizeSaleLines(form.lines?.length ? form : {
    ...form,
    source_type: quote.source_type,
    source_id: quote.source_id,
    product_name: quote.product_name,
    quantity: quote.quantity,
    unit: quote.unit,
    unit_price: quote.unit_price,
  });

  const saleForm = {
    ...form,
    date: form.date || quote.date || today(),
    client_id: quote.client_id,
    lines,
    payment_status: form.payment_status || quote.statut_paiement || 'non_paye',
    invoice_issued: form.invoice_issued ?? Boolean(quote.invoice_id),
    fulfillment_mode: form.fulfillment_mode || quote.fulfillment_mode || 'recupere',
  };

  const { records } = prepareCommercialSaleCommit({
    form: saleForm,
    orderId: quote.id,
    clientLabel: quote.client_label || context.clientLabel || 'Client',
    farmScope: context.farmScope,
    accessibleFarms: context.accessibleFarms,
    activeFarm: context.activeFarm,
    explicitFarmId: quote.farm_id,
  });

  const orderPatch = {
    ...records.order,
    type_document: 'commande',
    document_type: 'commande',
    quote_status: QUOTE_STATUSES.CONVERTED,
    statut_devis: QUOTE_STATUSES.CONVERTED,
    converted_from_quote_id: quote.id,
    converted_at: now(),
    quote_converted_at: now(),
  };

  await handlers.onUpdateOrder?.(quote.id, orderPatch);

  if (records.delivery) await handlers.onCreateDelivery?.(records.delivery);
  if (records.invoice) await handlers.onCreateInvoice?.(records.invoice);
  if (records.document) await handlers.onCreateDocument?.(records.document);
  if (records.payment) await handlers.onCreatePayment?.(records.payment);

  await runNewSaleSideEffects({
    order: { ...quote, ...orderPatch },
    orderId: quote.id,
    orderItems: items.length ? items : records.items,
    form: saleForm,
    paid: records.paid,
    remaining: records.remaining,
    paymentId: records.payment?.id || '',
    invoiceId: records.invoice?.id || '',
    productName: orderPatch.product_name,
    clientLabel: context.clientLabel || quote.client_label || 'Client',
    realClientId: quote.client_id,
    farmId: quote.farm_id || records.farmId,
    stocks: context.stocks || [],
    lots: context.lots || [],
    cultures: context.cultures || [],
    animaux: context.animaux || [],
    clients: context.clients || [],
    salesOrders: context.salesOrders || [],
    payments: context.payments || [],
    transactions: context.transactions || [],
    tasks: context.tasks || [],
    alertes: context.alertes || [],
    handlers: context.sideEffectHandlers || handlers,
  });

  if (records.businessEvent) {
    await handlers.onCreateBusinessEvent?.({
      ...records.businessEvent,
      event_type: 'devis_converti_commande',
      title: `Devis converti · ${quote.id}`,
    });
  }

  await handlers.onRefreshWorkflow?.();
  return { orderId: quote.id, converted: true };
}
