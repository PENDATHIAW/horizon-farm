/**
 * Workflow vente unique : Commercial > Ventes → une saisie, impacts ERP complets.
 */

import { enrichFinanceTransaction, ORIGIN_TYPES } from './financeTransactionMeta.js';
import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { runNewSaleSideEffects } from './saleSideEffects.js';
import { financeIds } from './sideEffectIds.js';
import {
  buildCommercialFarmContext,
  stampFarmIdOnCommercialRecords,
  validateCommercialSaleFarmContext,
  resolveCommercialSaleFarmId,
} from './commercialFarmScope.js';
import { validateSaleStockAvailability } from './commercialStockValidation.js';
import { emitOrgaloopEffluentSaleSideEffects } from '../services/greenpreneurs/orgaloopEffluentWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const SALE_PRODUCT_TYPES = {
  STOCK: 'stock',
  ANIMAL: 'animal',
  LOT: 'lot_avicole',
  CULTURE: 'culture',
  SERVICE: 'service',
  OTHER: 'autre',
};

export const PAYMENT_STATUS = {
  PAYE: 'paye',
  PARTIEL: 'partiel',
  CREDIT: 'non_paye',
};

const EGGS_PER_TABLET = 30;

export function buildSaleIssueKey(orderId = '', suffix = '') {
  const id = clean(orderId) || 'order';
  const tail = clean(suffix);
  return tail ? `sale:ventes:${id}:${tail}` : `sale:ventes:${id}`;
}

export function normalizeSalePaymentStatus(value = '') {
  const v = lower(value);
  if (['paye', 'paid', 'payé'].includes(v)) return PAYMENT_STATUS.PAYE;
  if (['partiel', 'partial'].includes(v)) return PAYMENT_STATUS.PARTIEL;
  return PAYMENT_STATUS.CREDIT;
}

export function resolveSourceModule(sourceType = '') {
  const t = lower(sourceType);
  if (t === 'lot_avicole') return 'avicole';
  if (t === 'animal') return 'animaux';
  if (t === 'culture') return 'cultures';
  if (t === 'stock') return 'stock';
  if (t === 'service') return 'ventes';
  return 'ventes';
}

export function deliveryStatusFromMode(mode = '') {
  const m = lower(mode);
  if (m === 'a_livrer') return 'a_livrer';
  if (m === 'livraison') return 'livre';
  return 'recupere';
}

export function orderStatusFromFulfillment(mode = '') {
  const m = lower(mode);
  if (m === 'a_livrer') return 'en_preparation';
  return m === 'livraison' ? 'livre' : 'livre';
}

/** Normalise les lignes de vente (multi-lignes ou ligne unique legacy). */
export function normalizeSaleLines(form = {}) {
  const lines = arr(form.lines).filter((line) => clean(line.product_name || line.libelle));
  if (lines.length) {
    return lines.map((line) => ({
      source_type: line.source_type || form.source_type || SALE_PRODUCT_TYPES.OTHER,
      source_id: line.source_id || form.source_id || '',
      product_name: line.product_name || line.libelle || '',
      quantity: num(line.quantity ?? line.quantite ?? 1),
      unit: line.unit || line.unite || 'unité',
      unit_price: num(line.unit_price ?? line.prix_unitaire),
      sale_kind: line.sale_kind || form.sale_kind || '',
      line_total: num(line.line_total) || num(line.quantity) * num(line.unit_price),
    }));
  }
  return [{
    source_type: form.source_type || SALE_PRODUCT_TYPES.OTHER,
    source_id: form.source_id || '',
    product_name: form.product_name || '',
    quantity: num(form.quantity),
    unit: form.unit || 'unité',
    unit_price: num(form.unit_price),
    sale_kind: form.sale_kind || '',
    line_total: num(form.quantity) * num(form.unit_price),
  }];
}

export function computeSaleAmounts(form = {}) {
  const lines = normalizeSaleLines(form);
  const productTotal = lines.reduce((sum, line) => sum + num(line.line_total), 0);
  const deliveryFee = ['livraison', 'a_livrer'].includes(lower(form.fulfillment_mode))
    ? Math.max(0, num(form.delivery_fee))
    : 0;
  const grandTotal = productTotal + deliveryFee;
  const paymentStatus = normalizeSalePaymentStatus(form.payment_status);
  let paid = 0;
  if (paymentStatus === PAYMENT_STATUS.PAYE) paid = grandTotal;
  else if (paymentStatus === PAYMENT_STATUS.PARTIEL) paid = Math.min(grandTotal, Math.max(0, num(form.paid_amount)));
  const remaining = Math.max(0, grandTotal - paid);
  return { lines, productTotal, deliveryFee, grandTotal, paid, remaining, paymentStatus };
}

export function validateCommercialSaleForm(form = {}, options = {}) {
  const { lines, grandTotal, paid, remaining, paymentStatus } = computeSaleAmounts(form);
  if (!lines.length || !lines.some((l) => clean(l.product_name))) {
    return 'Au moins une ligne de vente est obligatoire.';
  }
  if (lines.some((l) => l.quantity <= 0)) return 'Quantité invalide sur une ligne.';
  if (lines.some((l) => l.unit_price <= 0) && form.source_type !== SALE_PRODUCT_TYPES.SERVICE) {
    return 'Prix unitaire obligatoire.';
  }
  if (!clean(form.client_id)) return 'Client ou client de passage obligatoire.';
  if (!form.date) return 'Date obligatoire.';
  if (grandTotal <= 0) return 'Montant total invalide.';
  if (paymentStatus === PAYMENT_STATUS.PARTIEL && (paid <= 0 || paid >= grandTotal)) {
    return 'Paiement partiel : montant payé entre 0 et le total.';
  }
  if (options.walkInOnlyPaid && form.client_id === 'client_passage' && paymentStatus !== PAYMENT_STATUS.PAYE) {
    return 'Client de passage : vente payée totalement uniquement.';
  }

  const farmContext = options.farmContext || buildCommercialFarmContext(
    options.farmScope,
    options.accessibleFarms,
    options.activeFarm,
    { forceFilter: options.filteringEnabled === true },
  );
  const farmCheck = validateCommercialSaleFarmContext(farmContext, options.farm_id || form.farm_id);
  if (!farmCheck.ok) return farmCheck.message;

  const stockError = validateSaleStockAvailability(form, {
    stocks: options.stocks || [],
    lots: options.lots || [],
    cultures: options.cultures || [],
    animaux: options.animaux || [],
  }, {
    warnOnUnknownAvailability: options.warnOnUnknownAvailability === true,
    strictSourceRequired: options.strictSourceRequired === true,
  });
  if (stockError) return stockError;

  return '';
}

export function buildCommercialSaleRecords({
  form = {},
  orderId = '',
  invoiceId = '',
  paymentId = '',
  clientLabel = 'Client',
  selectedMeta = null,
  farmId = null,
  lineMetaBySource = null,
} = {}) {
  const id = orderId || makeId('CMD');
  const issueKey = buildSaleIssueKey(id);
  const { lines, productTotal, deliveryFee, grandTotal, paid, remaining, paymentStatus } = computeSaleAmounts(form);
  const primary = lines[0] || {};
  const realClientId = form.client_id === 'client_passage' ? '' : form.client_id;
  const isEggSale = primary.sale_kind === 'oeufs_tablettes' || primary.unit === 'tablette';
  const invId = form.invoice_issued ? (invoiceId || makeId('FAC')) : '';
  const payId = paid > 0 ? (paymentId || makeId('PAY')) : '';
  const sourceModule = resolveSourceModule(primary.source_type);

  const order = {
    id,
    date: form.date || today(),
    client_id: realClientId,
    client_type: form.client_id === 'client_passage' ? 'passage' : 'client',
    client_label: clientLabel,
    type_document: 'commande',
    statut_commande: orderStatusFromFulfillment(form.fulfillment_mode),
    statut_livraison: deliveryStatusFromMode(form.fulfillment_mode),
    fulfillment_mode: form.fulfillment_mode,
    statut_paiement: paymentStatus,
    montant_ht: productTotal,
    frais_livraison: deliveryFee,
    delivery_fee: deliveryFee,
    montant_total: grandTotal,
    montant_paye: paid,
    reste_a_payer: remaining,
    moyen_paiement: paid > 0 ? form.payment_method : '',
    payment_method: paid > 0 ? form.payment_method : '',
    invoice_id: invId,
    invoice_status: form.invoice_issued ? 'emise' : 'non_emise',
    facture_emise: form.invoice_issued,
    source_type: primary.source_type,
    source_module: sourceModule,
    source_id: primary.source_id || null,
    product_name: lines.length === 1 ? primary.product_name : `Commande ${lines.length} lignes`,
    source_label: primary.product_name,
    quantity: primary.quantity,
    unit: primary.unit,
    unite: primary.unit,
    sale_kind: primary.sale_kind || primary.source_type,
    eggs_per_unit: isEggSale ? EGGS_PER_TABLET : undefined,
    eggs_quantity: isEggSale ? primary.quantity * EGGS_PER_TABLET : undefined,
    unit_price: primary.unit_price,
    line_count: lines.length,
    notes: form.notes || null,
    opportunity_id: form.opportunity_id || '',
    converted_opportunity_id: form.opportunity_id || '',
    canal: clean(form.canal || form.channel || ''),
    channel: clean(form.canal || form.channel || ''),
    marketplace: clean(form.marketplace || ''),
    created_from: 'commercial_sale_workflow',
    side_effects_managed: true,
    issue_key: issueKey,
    source_record_id: id,
  };

  const metaForLine = (line) => {
    const key = `${line.source_type || ''}:${line.source_id || ''}`;
    if (lineMetaBySource?.[key]) return lineMetaBySource[key];
    if (lines.length === 1 && selectedMeta) return selectedMeta;
    return null;
  };

  const items = lines.map((line, index) => {
    const meta = metaForLine(line);
    return {
      id: makeId('CMDI'),
      order_id: id,
      source_type: line.source_type,
      source_module: resolveSourceModule(line.source_type),
      source_id: line.source_id || null,
      source_record_id: id,
      product_name: line.product_name,
      quantity: line.quantity,
      unit: line.unit,
      unite: line.unit,
      unit_price: line.unit_price,
      total: line.line_total,
      line_total: line.line_total,
      sale_kind: line.sale_kind || line.source_type,
      line_index: index + 1,
      issue_key: `${issueKey}:line:${index + 1}`,
      available_quantity_snapshot: meta?.qty ?? null,
      source_impact_applied: false,
      side_effects_managed: true,
      created_from: 'commercial_sale_workflow',
    };
  });

  const delivery = {
    id: makeId('LIV'),
    order_id: id,
    sale_id: id,
    source_module: 'ventes',
    source_record_id: id,
    issue_key: `${issueKey}:delivery`,
    date_livraison: form.date || today(),
    date_prevue: form.delivery_planned_date || form.date || today(),
    date_livraison_prevue: form.delivery_planned_date || form.date || today(),
    statut: deliveryStatusFromMode(form.fulfillment_mode),
    status: deliveryStatusFromMode(form.fulfillment_mode),
    delivery_status: deliveryStatusFromMode(form.fulfillment_mode),
    mode_livraison: form.fulfillment_mode,
    fulfillment_mode: form.fulfillment_mode,
    frais_livraison: deliveryFee,
    delivery_fee: deliveryFee,
    livraison_gratuite: deliveryFee === 0 && ['livraison', 'a_livrer'].includes(lower(form.fulfillment_mode)),
    destinataire: clientLabel,
    client_id: realClientId,
    adresse_livraison: form.delivery_address || form.adresse_livraison || '',
    contact_livraison: form.delivery_contact || form.contact_livraison || '',
    livreur: form.delivery_driver || form.livreur || '',
    responsable_livraison: form.delivery_driver || form.livreur || '',
    commentaire_livraison: form.delivery_comment || form.notes || '',
    notes: form.fulfillment_mode === 'a_livrer' ? (form.delivery_comment || form.notes || 'Livraison à planifier.') : (form.notes || ''),
    side_effects_managed: true,
    created_from: 'commercial_sale_workflow',
  };

  const invoice = invId ? {
    id: invId,
    order_id: id,
    sale_id: id,
    source_module: 'ventes',
    source_record_id: id,
    issue_key: `${issueKey}:invoice`,
    numero_facture: `FAC-${id.slice(-6)}`,
    date_facture: form.date || today(),
    montant_total: grandTotal,
    statut: 'emise',
    invoice_status: 'emise',
    side_effects_managed: true,
    created_from: 'commercial_sale_workflow',
  } : null;

  const document = invId ? {
    id: makeId('DOC'),
    title: `Facture FAC-${id.slice(-6)}`,
    document_category: 'facture',
    module_source: 'ventes',
    entity_type: 'commande',
    entity_id: id,
    related_id: id,
    invoice_id: invId,
    order_id: id,
    sale_id: id,
    source_module: 'ventes',
    source_record_id: id,
    issue_key: `${issueKey}:document`,
    status: 'emise',
    amount: grandTotal,
    transaction_id: paid > 0 ? financeIds.paid(id, payId) : '',
    side_effects_managed: true,
    created_from: 'commercial_sale_workflow',
  } : null;

  const payment = paid > 0 ? {
    id: payId,
    order_id: id,
    sale_id: id,
    source_record_id: id,
    source_module: 'ventes',
    issue_key: `${issueKey}:payment:${payId}`,
    client_id: realClientId,
    invoice_id: invId,
    date_paiement: form.date || today(),
    date: form.date || today(),
    montant: paid,
    montant_paye: paid,
    amount: paid,
    moyen_paiement: form.payment_method,
    mode_paiement: form.payment_method,
    statut: 'paye',
    side_effects_managed: true,
    created_from: 'commercial_sale_workflow',
  } : null;

  const businessEvent = {
    id: makeId('EVT'),
    event_type: 'vente_commercial_workflow',
    module_source: 'ventes',
    entity_type: 'commande',
    entity_id: id,
    source_module: 'ventes',
    source_record_id: id,
    issue_key: `${issueKey}:event`,
    title: `Vente ${order.product_name} - ${grandTotal}`,
    description: `${clientLabel} · ${paymentStatus}`,
    amount: grandTotal,
    event_date: form.date || today(),
    linked_sale_id: id,
    linked_invoice_id: invId || null,
    linked_transaction_id: payId || null,
    source_type: primary.source_type,
    source_id: primary.source_id || '',
    sale_kind: primary.sale_kind,
    severity: 'info',
    side_effects_managed: true,
    created_from: 'commercial_sale_workflow',
  };

  const records = {
    order,
    items,
    delivery,
    invoice,
    document,
    payment,
    businessEvent,
    issueKey,
    paid,
    remaining,
    primaryLine: primary,
    farmId: farmId || null,
  };

  return stampFarmIdOnCommercialRecords(records, farmId);
}

/** Prépare records + farm_id avant persistance. */
export function prepareCommercialSaleCommit({
  form = {},
  orderId = '',
  clientLabel = 'Client',
  selectedMeta = null,
  farmScope = {},
  accessibleFarms = [],
  activeFarm = null,
  explicitFarmId = '',
} = {}) {
  const farmContext = buildCommercialFarmContext(farmScope, accessibleFarms, activeFarm);
  const requestedFarmId = clean(explicitFarmId || form.farm_id);

  if (farmContext.filteringEnabled) {
    const farmCheck = validateCommercialSaleFarmContext(farmContext, requestedFarmId);
    if (!farmCheck.ok) {
      throw new Error(farmCheck.message);
    }
    const records = buildCommercialSaleRecords({
      form,
      orderId,
      clientLabel,
      selectedMeta,
      farmId: farmCheck.farmId,
    });
    return { records, farmContext, farmId: farmCheck.farmId };
  }

  const farmId = requestedFarmId || resolveCommercialSaleFarmId(farmContext) || null;
  const records = buildCommercialSaleRecords({
    form,
    orderId,
    clientLabel,
    selectedMeta,
    farmId,
  });
  return { records, farmContext, farmId };
}

/** Persiste commande + lignes + livraison + facture + paiement puis effets métier. */
export async function commitCommercialSale(records, handlers = {}, context = {}) {
  const {
    onCreateOrder,
    onCreateItem,
    onCreateDelivery,
    onCreateInvoice,
    onCreateDocument,
    onCreatePayment,
    onCreateBusinessEvent,
    onRefreshWorkflow,
  } = handlers;

  const farmId = records.farmId || records.order?.farm_id || null;

  await onCreateOrder?.(records.order);
  for (const item of records.items) {
    // eslint-disable-next-line no-await-in-loop
    await onCreateItem?.(item);
  }
  await onCreateDelivery?.(records.delivery);
  if (records.invoice) await onCreateInvoice?.(records.invoice);
  if (records.document) await onCreateDocument?.(records.document);
  if (records.payment) await onCreatePayment?.(records.payment);

  const form = context.form || {};
  const clientLabel = context.clientLabel || records.order.client_label || 'Client';

  await runNewSaleSideEffects({
    order: records.order,
    orderId: records.order.id,
    orderItems: records.items || [],
    form: {
      ...form,
      lines: normalizeSaleLines(form),
      source_type: records.primaryLine.source_type,
      source_id: records.primaryLine.source_id,
      quantity: records.primaryLine.quantity,
      payment_method: form.payment_method || records.order.moyen_paiement,
      fulfillment_mode: form.fulfillment_mode || records.order.fulfillment_mode,
      date: records.order.date,
    },
    paid: records.paid,
    remaining: records.remaining,
    paymentId: records.payment?.id || '',
    invoiceId: records.invoice?.id || '',
    productName: records.order.product_name,
    clientLabel,
    realClientId: records.order.client_id,
    farmId,
    selected: context.selected,
    stocks: context.stocks || [],
    lots: context.lots || [],
    cultures: context.cultures || [],
    animaux: context.animaux || [],
    clients: context.clients || [],
    salesOrders: [...arr(context.salesOrders), records.order],
    payments: records.payment
      ? [...arr(context.payments), records.payment]
      : arr(context.payments),
    transactions: context.transactions || [],
    tasks: context.tasks || [],
    alertes: context.alertes || [],
    handlers: context.sideEffectHandlers || handlers,
  });

  if (records.businessEvent) {
    await onCreateBusinessEvent?.(records.businessEvent);
  }

  await emitOrgaloopEffluentSaleSideEffects({
    order: records.order,
    items: records.items,
    form,
    handlers: { onCreateBusinessEvent, onRefreshBusinessEvents: handlers.onRefreshBusinessEvents || context.sideEffectHandlers?.onRefreshBusinessEvents },
    context: {
      businessEvents: context.businessEvents || context.business_events,
      ...context,
    },
  });

  const oppId = clean(form.opportunity_id || records.order?.converted_opportunity_id || records.order?.opportunity_id);
  const updateOpp = handlers.onUpdateOpportunity || context.sideEffectHandlers?.onUpdateOpportunity;
  if (oppId && updateOpp && !oppId.startsWith('auto-opp-')) {
    await updateOpp(oppId, {
      status: 'gagnee',
      statut: 'gagnee',
      converted_order_id: records.order.id,
      order_id: records.order.id,
      converted_at: now(),
      montant_final: records.order.montant_total,
      closed_at: now(),
    });
  }

  await onRefreshWorkflow?.();
  return { orderId: records.order.id, issueKey: records.issueKey };
}

/** Finance depuis paiement (rapprochement) avec anti-doublon. */
export function buildFinanceRowForSalePayment({ payment = {}, order = {} } = {}) {
  const orderId = clean(payment.order_id || payment.sale_id || order.id);
  const payId = clean(payment.id);
  const amt = num(payment.montant ?? payment.amount ?? payment.montant_paye);
  const farmId = order.farm_id || payment.farm_id || null;
  return enrichFinanceTransaction({
    id: financeIds.paid(orderId, payId),
    type: 'entree',
    libelle: `Encaissement ${order.product_name || orderId}`,
    montant: amt,
    amount: amt,
    date: String(payment.date_paiement || payment.date || today()).slice(0, 10),
    categorie: 'Vente',
    module_lie: 'ventes',
    related_id: orderId,
    order_id: orderId,
    sale_id: orderId,
    client_id: order.client_id || payment.client_id || '',
    statut: 'paye',
    source_module: 'ventes',
    source_record_id: orderId,
    payment_id: payId,
    moyen_paiement: payment.moyen_paiement || payment.mode_paiement || 'especes',
    transaction_origin: 'automatique',
    side_effects_managed: true,
    created_from: 'commercial_sale_repair',
    issue_key: buildSaleIssueKey(orderId, `payment:${payId}`),
    ...(farmId ? { farm_id: farmId } : {}),
  }, { origin_type: ORIGIN_TYPES.WORKFLOW });
}
