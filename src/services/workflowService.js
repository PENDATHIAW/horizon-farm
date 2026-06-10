import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { buildSaleWorkflowHandlers, runNewSaleSideEffects } from '../utils/saleSideEffects';
import { financeIds } from '../utils/sideEffectIds';
import { runPurchaseSideEffects, runStockLossSideEffects } from '../utils/purchaseSideEffects';
import { runFeedingSideEffects } from '../utils/feedingSideEffects';
import { runHealthSideEffects, runBiosecuritySideEffects } from '../utils/healthSideEffects';
import { runEquipmentWorkflowSideEffects } from '../utils/equipmentSideEffects';
import { runCultureHarvestSideEffects } from '../utils/cultureSideEffects';
import { syncFinanceSideEffects } from './erpInterconnectionEngine';
import { getFinanceActivityFromSale, getFinanceCategoryFromSale } from './financeSyncService';
import { buildOpportunityClosedPatch, buildStructuredFarmImpact } from './erpInterconnectionRules';
import {
  commitWithImpactJournal,
  IMPACT_KEYS,
  markImpactNa,
  OPERATION_TYPES,
} from '../utils/workflowImpactJournal';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

const clean = (value) => String(value || '').trim().toLowerCase();

const getAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const getPaid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);

const sameEntity = (row = {}, entityId = '') =>
  String(row.entity_id || row.related_id || row.source_record_id || row.id || '') === String(entityId || '');

const openStatus = (row = {}) =>
  !['termine', 'terminé', 'done', 'traitee', 'traitée', 'annule', 'annulé', 'closed'].includes(clean(row.status || row.statut));

const hasSimilarOpen = (rows = [], entityId = '', text = '') =>
  arr(rows).some(
    (row) =>
      openStatus(row) &&
      sameEntity(row, entityId) &&
      clean(`${row.title || ''} ${row.message || ''} ${row.checklist || ''}`).includes(clean(text).slice(0, 18))
  );

const sameDay = (a, b) => String(a || '').slice(0, 10) === String(b || '').slice(0, 10);

const hasSameHealthFollowup = (rows = [], task = {}) =>
  arr(rows).some(
    (row) =>
      openStatus(row) &&
      clean(row.module_lie || row.source_module) === clean(task.module_lie || task.source_module) &&
      String(row.related_id || row.source_record_id || '') === String(task.related_id || task.source_record_id || '') &&
      sameDay(row.due_date || row.date || row.created_at, task.due_date || task.date) &&
      clean(`${row.title || ''} ${row.checklist || ''}`).includes('sanit')
  );

const paymentStatusOf = (amount, paid) => {
  if (amount > 0 && paid >= amount) return 'paye';
  if (paid > 0) return 'partiel';
  return 'non_paye';
};

const orderStatusAfterPayment = (order = {}, amount = 0, paid = 0) => {
  const current = String(order.statut_commande || order.status || '').toLowerCase();
  const delivery = String(order.statut_livraison || order.delivery_status || '').toLowerCase();
  if (current === 'annule') return 'annule';
  if (delivery === 'livre' || current === 'livre') return 'livre';
  if (paid > 0) return 'confirme';
  if (amount > 0) return current && current !== 'brouillon' ? current : 'enregistree';
  return current || 'brouillon';
};

const opportunityIdOf = (order = {}) =>
  order.opportunity_id || order.source_opportunity_id || order.converted_opportunity_id || order.sales_opportunity_id || '';

export const fieldAuto = ({ value, source, previousAuto, confidence = 0.8 }) => ({
  auto_value: value,
  final_value: value,
  manual_override: false,
  auto_source: source,
  auto_confidence: confidence,
  last_auto_value: previousAuto ?? value,
  calculated_at: now(),
});

export const finalValue = (field) => field?.manual_override ? field.final_value : field?.final_value ?? field?.auto_value;

const safeId = (prefix, existing) => {
  let id = makeId(prefix);
  const used = new Set(arr(existing).map((row) => String(row.id)));
  while (used.has(id)) id = makeId(prefix);
  return id;
};

const workflowMeta = ({ type, actions = [], saisiesUtilisateur = 1, extra = {} }) => ({
  prepared_at: now(),
  workflow_type: type,
  saisies_utilisateur: saisiesUtilisateur,
  actions_erp: actions.length,
  saisies_evitees: Math.max(0, actions.length - saisiesUtilisateur),
  ...extra,
});

export function applyManualOverride(preview, path, value) {
  const next = structuredClone(preview);
  const parts = path.split('.');
  let cursor = next;
  parts.slice(0, -1).forEach((part) => { cursor = cursor[part]; });
  const key = parts.at(-1);
  if (cursor?.[key] && typeof cursor[key] === 'object' && 'auto_value' in cursor[key]) {
    cursor[key] = { ...cursor[key], final_value: value, manual_override: true, manual_override_at: now() };
  } else {
    cursor[key] = value;
  }
  next.workflow_meta = { ...(next.workflow_meta || {}), last_manual_edit_at: now() };
  return next;
}

export function useSuggestion(preview, path) {
  const next = structuredClone(preview);
  const parts = path.split('.');
  let cursor = next;
  parts.slice(0, -1).forEach((part) => { cursor = cursor[part]; });
  const key = parts.at(-1);
  if (cursor?.[key] && typeof cursor[key] === 'object' && 'auto_value' in cursor[key]) {
    cursor[key] = { ...cursor[key], final_value: cursor[key].auto_value, manual_override: false, suggestion_used_at: now() };
  }
  return next;
}

function saleActivity(order = {}) { return getFinanceActivityFromSale(order); }

function stockPatchAfterSale(order = {}, quantitySold) {
  const quantity = toNumber(order.quantite_disponible ?? order.stock_quantity ?? order.quantite_stock ?? order.current_count ?? order.quantite);
  if (!order.source_id && !order.product_id && !order.entity_id) return null;
  if (quantity <= 0) return null;
  return {
    id: order.source_id || order.product_id || order.entity_id,
    quantite: Math.max(0, quantity - quantitySold),
    last_movement_type: 'sortie',
    last_movement_label: 'vente',
    last_movement_qty: quantitySold,
    last_movement_at: now(),
  };
}

export function prepareSaleWorkflow(payload = {}, context = {}) {
  const order = payload.order || payload;
  const amount = getAmount(order);
  const alreadyPaid = getPaid(order);
  const remainingBeforePayment = Math.max(0, amount - alreadyPaid);
  const suggestedPayment = toNumber(order.nouveau_paiement ?? order.payment_amount ?? order.montant_a_encaisser) || remainingBeforePayment || amount;
  const nextPaid = Math.min(amount || alreadyPaid + suggestedPayment, alreadyPaid + suggestedPayment);
  const nextRemaining = Math.max(0, amount - nextPaid);
  const nextPaymentStatus = paymentStatusOf(amount, nextPaid);
  const nextOrderStatus = orderStatusAfterPayment(order, amount, nextPaid);
  const activity = saleActivity(order);
  const invoiceId = order.invoice_id || safeId('FAC', context.invoices);
  const paymentId = order.payment_id || safeId('PAI', context.payments);
  const transactionId = order.transaction_id || financeIds.paid(order.id || 'NEW', paymentId);
  const eventId = safeId('EVT', context.events);
  const documentId = safeId('DOC', context.documents);
  const client = arr(context.clients).find((candidate) => candidate.id === order.client_id);
  const source = `vente.${order.id || 'nouvelle'}`;
  const quantitySold = toNumber(order.quantite ?? order.quantity ?? 1) || 1;
  const oppId = opportunityIdOf(order);

  const actions = [
    { id: 'update_order', module: 'ventes', type: 'update', label: 'Mettre à jour la commande' },
    { id: 'create_invoice', module: 'documents', type: 'create', label: 'Créer facture/reçu' },
    suggestedPayment > 0 ? { id: 'create_payment', module: 'paiements', type: 'create', label: 'Créer paiement' } : null,
    suggestedPayment > 0 ? { id: 'create_finance', module: 'finances', type: 'create', label: 'Créer transaction finance' } : null,
    oppId ? { id: 'close_opportunity', module: 'ventes', type: 'update', label: 'Fermer opportunité convertie' } : null,
    client ? { id: 'update_client', module: 'clients', type: 'update', label: 'Mettre à jour client' } : null,
    { id: 'update_source_asset', module: activity, type: 'update', label: 'Mettre à jour stock/animal/lot/culture' },
    { id: 'create_trace', module: 'tracabilite', type: 'create', label: 'Créer événement traçabilité' },
    nextRemaining > 0 ? { id: 'create_alert', module: 'alertes', type: 'create', label: 'Créer alerte créance' } : null,
  ].filter(Boolean);

  return {
    workflow_type: 'sale',
    workflow_id: safeId('WF', context.workflows),
    workflow_meta: workflowMeta({ type: 'sale', actions, extra: { source } }),
    badges: { price: order.prix_vente_manual_override ? 'Modifié' : 'Auto', amount: order.montant_manual_override ? 'Modifié' : 'Auto' },
    source_order: order,
    fields: {
      amount: fieldAuto({ value: amount, source: 'vente.montant_total', previousAuto: order.montant_last_auto_value }),
      already_paid: fieldAuto({ value: alreadyPaid, source: 'vente.montant_paye' }),
      payment_to_record: fieldAuto({ value: suggestedPayment, source: 'reste_a_payer', confidence: 0.9 }),
      remaining_after_payment: fieldAuto({ value: nextRemaining, source: 'amount - already_paid - payment' }),
      activity: fieldAuto({ value: activity, source: 'vente.source_type' }),
      category: fieldAuto({ value: getFinanceCategoryFromSale(order), source: 'financeSyncService.category' }),
    },
    records: {
      order_patch: {
        statut_commande: nextOrderStatus,
        statut_paiement: nextPaymentStatus,
        montant_paye: nextPaid,
        reste_a_payer: nextRemaining,
        invoice_id: invoiceId,
        payment_id: paymentId,
        transaction_id: transactionId,
        workflow_id: null,
        secured_at: now(),
      },
      opportunity_patch: oppId ? buildOpportunityClosedPatch({ id: oppId }, order) : null,
      invoice: {
        id: invoiceId,
        order_id: order.id,
        sale_id: order.id,
        client_id: order.client_id || '',
        date: today(),
        date_emission: today(),
        total_amount: amount,
        montant_total: amount,
        statut_facture: 'emise',
        invoice_status: 'emise',
        statut: 'emise',
        statut_paiement: nextPaymentStatus,
        source_module: 'ventes',
        source_record_id: order.id,
      },
      payment: {
        id: paymentId,
        order_id: order.id,
        sale_id: order.id,
        invoice_id: invoiceId,
        client_id: order.client_id || '',
        date: today(),
        date_paiement: today(),
        montant: suggestedPayment,
        montant_paye: suggestedPayment,
        amount: suggestedPayment,
        statut: 'paye',
        moyen_paiement: order.moyen_paiement || order.mode_paiement || 'Cash',
        mode_paiement: order.mode_paiement || order.moyen_paiement || 'Cash',
        source_module: 'ventes',
        source_record_id: order.id,
        source_type: order.source_type || order.type_vente || order.product_type,
        source_id: order.source_id || order.product_id || order.entity_id,
      },
      finance: {
        id: transactionId,
        type: 'entree',
        libelle: `Encaissement ${order.product_name || order.libelle || order.id}`,
        montant: suggestedPayment,
        amount: suggestedPayment,
        date: today(),
        categorie: getFinanceCategoryFromSale(order),
        module_lie: 'ventes',
        related_id: order.id,
        order_id: order.id,
        sale_id: order.id,
        activite: activity,
        client_id: order.client_id || '',
        statut: 'paye',
        source_module: 'ventes',
        source_record_id: order.id,
        source_type: order.source_type || order.type_vente || order.product_type,
        source_id: order.source_id || order.product_id || order.entity_id,
        invoice_id: invoiceId,
        payment_id: paymentId,
        business_plan_id: order.business_plan_id || null,
        investment_id: order.investment_id || null,
      },
      source_patch: stockPatchAfterSale(order, quantitySold),
      client_patch: client ? { dernier_achat: today(), total_achats: toNumber(client.total_achats) + amount, creances: Math.max(0, toNumber(client.creances) + nextRemaining) } : null,
      trace: {
        id: eventId,
        event_type: 'vente_complete',
        module_source: 'ventes',
        entity_type: 'sales_order',
        entity_id: order.id,
        title: 'Vente complète',
        description: `${order.product_name || order.id} - ${amount}`,
        event_date: today(),
        severity: 'info',
        linked_transaction_id: transactionId,
        linked_sale_id: order.id,
        linked_document_id: documentId,
        linked_opportunity_id: oppId || '',
        saisies_evitees: Math.max(0, actions.length - 1),
      },
      document: {
        id: documentId,
        title: `Facture ${order.product_name || order.id}`,
        titre: `Facture ${order.product_name || order.id}`,
        type: 'facture_vente',
        document_category: 'facture',
        module_source: 'ventes',
        module_lie: 'ventes',
        entity_type: 'invoice',
        entity_id: invoiceId,
        invoice_id: invoiceId,
        order_id: order.id,
        sale_id: order.id,
        related_id: invoiceId,
        transaction_id: transactionId,
        montant: amount,
        notes: `Généré par workflow vente ${order.id}`,
      },
      alert: nextRemaining > 0 ? {
        id: safeId('ALT', context.alerts),
        title: 'Créance client à suivre',
        message: `${order.product_name || order.id}: ${nextRemaining}`,
        module_source: 'ventes',
        entity_id: order.id,
        severity: 'warning',
        status: 'nouvelle',
        action_recommandee: 'Relancer le client ou enregistrer un nouveau paiement',
      } : null,
    },
    actions,
  };
}

export async function commitSaleWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const amount = toNumber(finalValue(p.fields.amount));
  const alreadyPaid = toNumber(finalValue(p.fields.already_paid));
  const paymentToRecord = toNumber(finalValue(p.fields.payment_to_record || p.fields.paid));
  const nextPaid = Math.min(amount || alreadyPaid + paymentToRecord, alreadyPaid + paymentToRecord);
  const remaining = Math.max(0, amount - nextPaid);
  const records = p.records;
  const order = p.source_order || {};
  const orderId = order.id;
  const ctx = handlers.context || {};
  const paymentId = records.payment?.id || order.payment_id;
  const invoiceId = records.invoice?.id || order.invoice_id;

  records.order_patch = {
    ...records.order_patch,
    montant_paye: nextPaid,
    reste_a_payer: remaining,
    statut_paiement: paymentStatusOf(amount, nextPaid),
    statut_commande: orderStatusAfterPayment(order, amount, nextPaid),
    workflow_id: p.workflow_id,
    invoice_id: invoiceId,
    side_effects_managed: true,
  };
  records.invoice = {
    ...records.invoice,
    total_amount: amount,
    montant_total: amount,
    statut_facture: 'emise',
    invoice_status: 'emise',
    statut: 'emise',
    statut_paiement: records.order_patch.statut_paiement,
  };
  records.payment = {
    ...records.payment,
    id: paymentId,
    montant: paymentToRecord,
    montant_paye: paymentToRecord,
    amount: paymentToRecord,
    date_paiement: records.payment.date_paiement || today(),
    side_effects_managed: true,
    created_from: 'sale_workflow',
  };
  records.document = {
    ...records.document,
    montant: amount,
    invoice_id: invoiceId,
    order_id: orderId || records.document.order_id,
    transaction_id: paymentToRecord > 0 ? financeIds.paid(orderId, paymentId) : records.document.transaction_id,
  };

  await handlers.onCreateInvoice?.(records.invoice);
  if (paymentToRecord > 0) await handlers.onCreatePayment?.(records.payment);
  if (orderId) await handlers.onUpdateOrder?.(orderId, records.order_patch);
  await handlers.onCreateDocument?.(records.document);

  const updatedOrder = { ...order, ...records.order_patch };
  const clientRow = arr(ctx.clients).find((candidate) => candidate.id === order.client_id);
  const clientLabel = clientRow?.nom || clientRow?.name || order.client_label || 'Client';
  const skipSourceImpact = order.side_effects_managed === true || order.source_impact_applied === true;

  await runNewSaleSideEffects({
    order: updatedOrder,
    orderId,
    form: {
      source_type: order.source_type,
      source_id: order.source_id,
      quantity: order.quantite ?? order.quantity,
      payment_method: records.payment.moyen_paiement || records.payment.mode_paiement,
      fulfillment_mode: order.fulfillment_mode || order.statut_livraison,
      date: records.payment.date_paiement || order.date || today(),
    },
    paid: paymentToRecord,
    remaining,
    paymentId,
    invoiceId,
    productName: order.product_name || order.libelle,
    clientLabel,
    realClientId: order.client_id,
    stocks: ctx.stocks || [],
    lots: ctx.lots || [],
    cultures: ctx.cultures || [],
    animaux: ctx.animaux || [],
    clients: ctx.clients || [],
    salesOrders: ctx.salesOrders || ctx.sales_orders || [],
    payments: paymentToRecord > 0 ? [...arr(ctx.payments), records.payment] : arr(ctx.payments),
    transactions: ctx.transactions || [],
    tasks: ctx.tasks || [],
    alertes: ctx.alertes || [],
    handlers: buildSaleWorkflowHandlers(handlers, ctx),
    skipSourceImpact,
  });

  if (records.trace && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({
      ...records.trace,
      linked_transaction_id: paymentToRecord > 0 ? financeIds.paid(orderId, paymentId) : records.trace.linked_transaction_id,
      linked_invoice_id: invoiceId,
    });
  }

  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function preparePurchaseWorkflow(payload = {}, context = {}) {
  const amount = toNumber(payload.montant ?? payload.amount ?? toNumber(payload.quantite) * toNumber(payload.prix_unitaire));
  const actions = ['stock', 'finance', 'document', 'trace'];
  return {
    workflow_type: 'purchase',
    workflow_id: safeId('WF', context.workflows),
    fields: { amount: fieldAuto({ value: amount, source: 'achat.quantite*prix' }) },
    records: {
      stock_patch: payload,
      finance: { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Achat ${payload.produit || payload.libelle || ''}`.trim(), montant: amount, amount, date: today(), categorie: 'Stock', module_lie: 'stock', fournisseur_id: payload.fournisseur_id || '', source_module: 'stock' },
      document: { id: safeId('DOC', context.documents), title: `Justificatif achat ${payload.produit || ''}`, document_category: 'facture', module_source: 'stock' },
      trace: { id: safeId('EVT', context.events), event_type: 'achat_stock', module_source: 'stock', event_date: today() },
    },
    workflow_meta: workflowMeta({ type: 'purchase', actions }),
  };
}

export async function commitPurchaseWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const stockPatch = p.records.stock_patch || {};
  const amount = toNumber(finalValue(p.fields?.amount) || stockPatch.montant);
  const ctx = handlers.context || {};
  const movementRef = p.workflow_id || String(stockPatch.last_movement_at || '').slice(0, 10) || today();

  await handlers.onCreateOrUpdateStock?.({ ...stockPatch, side_effects_managed: true });

  await runPurchaseSideEffects({
    stockPatch,
    stockRow: ctx.stocks?.find?.((row) => String(row.id) === String(stockPatch.id)) || stockPatch,
    amount,
    movementRef,
    date: stockPatch.last_movement_at?.slice?.(0, 10) || today(),
    transactions: ctx.transactions || [],
    tasks: ctx.tasks || [],
    alertes: ctx.alertes || [],
    handlers: {
      ...handlers,
      existingDocuments: ctx.documents || [],
    },
    skipDocument: Boolean(p.records.document?.id),
  });

  if (p.records.document?.id) await handlers.onCreateDocument?.({ ...p.records.document, side_effects_managed: true });
  if (p.records.trace) await handlers.onCreateBusinessEvent?.({ ...p.records.trace, side_effects_managed: true });

  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareFeedingWorkflow(payload = {}, context = {}) {
  const amount = toNumber(payload.montant_total ?? toNumber(payload.quantite) * toNumber(payload.prix_unitaire));
  return {
    workflow_type: 'feeding',
    workflow_id: safeId('WF', context.workflows),
    fields: { cost: fieldAuto({ value: amount, source: 'stock.prix_unitaire*quantite' }) },
    records: {
      alimentation: payload,
      stock_movement: { stock_id: payload.stock_id, qty: toNumber(payload.quantite), type: 'sortie' },
      finance: amount > 0 ? {
        id: safeId('TRX', context.transactions),
        type: 'sortie',
        libelle: `Alimentation ${payload.animal_id || payload.lot_id || payload.stock_id || ''}`.trim(),
        montant: amount,
        amount,
        date: payload.date || today(),
        categorie: 'Alimentation',
        activite: payload.lot_id ? 'avicole' : 'animaux',
        module_lie: 'alimentation',
        source_module: 'alimentation',
        source_record_id: payload.id || '',
        related_id: payload.animal_id || payload.lot_id || payload.stock_id || '',
      } : null,
      trace: { id: safeId('EVT', context.events), event_type: 'alimentation', module_source: 'stock', event_date: today() },
    },
    workflow_meta: workflowMeta({ type: 'feeding', actions: ['alimentation', 'stock', amount > 0 ? 'finance' : null, 'trace'].filter(Boolean) }),
  };
}

export async function commitFeedingWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const ctx = handlers.context || {};
  const log = p.records.alimentation || {};
  const stock = ctx.stocks?.find?.((row) => String(row.id) === String(log.stock_id)) || { id: log.stock_id };

  await runFeedingSideEffects({
    log,
    stock,
    stockMovement: p.records.stock_movement,
    amount: toNumber(finalValue(p.fields?.cost) || log.montant_total),
    transactions: ctx.transactions || [],
    businessEvents: ctx.businessEvents || [],
    handlers: {
      ...handlers,
      existingStockMovements: handlers.existingStockMovements || ctx.stockMovements || [],
    },
  });

  if (p.records.trace && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({ ...p.records.trace, side_effects_managed: true });
  }

  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareHealthWorkflow(payload = {}, context = {}) {
  const cost = toNumber(payload.cout || payload.montant || payload.amount);
  const structuredImpact = buildStructuredFarmImpact({ ...payload, cout: cost });
  const actions = ['health', payload.stock_id ? 'stock' : null, cost > 0 ? 'finance' : null, 'impact', 'task', 'trace'].filter(Boolean);
  return {
    workflow_type: 'health',
    workflow_id: safeId('WF', context.workflows),
    fields: { cost: fieldAuto({ value: cost, source: 'sante.cout' }) },
    records: {
      health_patch: { ...payload, ...structuredImpact, statut: 'fait', effectuee: payload.effectuee || today() },
      stock_movement: payload.stock_id ? { stock_id: payload.stock_id, qty: toNumber(payload.quantite_stock || 1), type: 'sortie' } : null,
      finance: cost > 0 ? {
        id: safeId('TRX', context.transactions),
        type: 'sortie',
        libelle: `Soin/Vaccin ${payload.nom || payload.id}`,
        montant: cost,
        amount: cost,
        date: payload.date || today(),
        categorie: 'Sante',
        activite: payload.lot_id ? 'avicole' : 'animaux',
        module_lie: 'sante',
        related_id: payload.id,
        source_module: 'sante',
        source_record_id: payload.id,
        impact_category: structuredImpact.impact_category,
        impact_level: structuredImpact.impact_level,
      } : null,
      task: { id: safeId('TSK', context.tasks), title: `Suivi santé ${payload.nom || payload.id}`, module_lie: 'sante', related_id: payload.id, due_date: today(), status: 'a_faire' },
      trace: {
        id: safeId('EVT', context.events),
        event_type: 'sante',
        module_source: 'sante',
        event_date: today(),
        entity_id: payload.id,
        title: `Intervention santé ${payload.nom || payload.id}`,
        ...structuredImpact,
      },
    },
    workflow_meta: workflowMeta({ type: 'health', actions }),
  };
}

export async function commitHealthWorkflow(preview, handlers = {}) {
  return commitWithImpactJournal({
    operationType: OPERATION_TYPES.SOIN_VACCIN,
    issueKey: preview.workflow_id,
    handlers,
    run: async (tracked, journal) => {
      const p = structuredClone(preview);
      const ctx = handlers.context || {};
      const health = p.records.health_patch || {};
      const cost = toNumber(finalValue(p.fields?.cost) || health.cout);
      await runHealthSideEffects({ health, healthPatch: p.records.health_patch, stockMovement: p.records.stock_movement, cost, tasks: ctx.tasks || [], transactions: ctx.transactions || [], handlers: tracked });
      if (!p.records.stock_movement?.stock_id) markImpactNa(journal, IMPACT_KEYS.STOCK_MOVEMENT, 'Aucun produit stock consommé');
      if (cost <= 0) markImpactNa(journal, IMPACT_KEYS.FINANCE, 'Intervention sans coût');
      return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
    },
  });
}

export function prepareBiosecurityWorkflow(payload = {}, context = {}) {
  const risk = String(payload.risk_level || payload.severity || payload.sanitary_risk_level || 'warning').toLowerCase();
  const eventType = payload.event_type || payload.trigger || 'biosécurité';
  const entityId = payload.entity_id || payload.related_id || payload.id;
  const taskId = safeId('TSK', context.tasks);
  const alertId = safeId('ALT', context.alerts);
  const eventId = safeId('EVT', context.events);
  const documentId = payload.document_url || payload.proof_url ? safeId('DOC', context.documents) : null;
  const stockQty = toNumber(payload.desinfectant_qty || payload.quantite_desinfectant || payload.stock_qty);
  const actions = ['alert', 'task', stockQty > 0 && payload.stock_id ? 'stock' : null, documentId ? 'document' : null, 'trace'].filter(Boolean);
  const dedupeKey = `${payload.module_source || 'sante'}:${payload.entity_type || 'sanitary_event'}:${entityId}:${eventType}`;
  return {
    workflow_type: 'biosecurity',
    workflow_id: safeId('WF', context.workflows),
    dedupe_context: { alerts: arr(context.alerts), tasks: arr(context.tasks) },
    fields: {
      risk_level: fieldAuto({ value: risk === 'urgence' || risk === 'critique' ? risk : 'warning', source: 'biosafety.risk' }),
      protocol: fieldAuto({ value: payload.protocol || payload.cleaning_protocol || 'Nettoyage, désinfection et contrôle sanitaire', source: 'biosafety.protocol' }),
      next_control_date: fieldAuto({ value: payload.next_control_date || today(), source: 'biosafety.next_control' }),
    },
    records: {
      alert: { id: alertId, title: payload.title || 'Risque sanitaire à traiter', message: payload.message || payload.description || 'Action sanitaire à suivre.', module_source: payload.module_source || 'sante', entity_type: payload.entity_type || 'sanitary_event', entity_id: entityId, severity: risk === 'urgence' || risk === 'critique' ? risk : 'warning', status: 'nouvelle', action_recommandee: payload.action_recommandee || 'Appliquer le protocole et documenter le résultat.', workflow_id: null, alert_dedupe_key: dedupeKey },
      task: { id: taskId, title: payload.task_title || `Suivi sanitaire — ${eventType}`, module_lie: payload.module_source || 'sante', related_id: entityId, due_date: payload.due_date || payload.next_control_date || today(), priority: risk === 'urgence' || risk === 'critique' ? 'critique' : 'haute', status: 'a_faire', checklist: payload.checklist || 'Isoler si nécessaire; Nettoyer; Désinfecter; Contrôler eau/aliment; Documenter', source_module: 'sante', source_record_id: entityId, linked_alert_id: alertId, task_dedupe_key: dedupeKey },
      stock_movement: stockQty > 0 && payload.stock_id ? { stock_id: payload.stock_id, qty: stockQty, type: 'sortie', reason: 'désinfection / biosécurité' } : null,
      document: documentId ? { id: documentId, title: payload.document_title || `Preuve sanitaire ${entityId || ''}`.trim(), document_category: 'sanitaire', module_source: 'sante', entity_type: payload.entity_type || 'sanitary_event', entity_id: entityId, file_url: payload.document_url || payload.proof_url } : null,
      trace: { id: eventId, event_type: 'biosécurité', module_source: payload.module_source || 'sante', entity_type: payload.entity_type || 'sanitary_event', entity_id: entityId, title: payload.title || 'Action sanitaire', description: payload.message || payload.description || 'Workflow sanitaire préparé.', event_date: today(), severity: risk === 'urgence' || risk === 'critique' ? risk : 'warning', linked_document_id: documentId, linked_alert_id: alertId, linked_task_id: taskId, event_dedupe_key: dedupeKey },
    },
    workflow_meta: workflowMeta({ type: 'biosecurity', actions, extra: { trigger: eventType, dedupe_key: dedupeKey } }),
    actions,
  };
}

export async function commitBiosecurityWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const riskLevel = finalValue(p.fields.risk_level);
  const protocol = finalValue(p.fields.protocol);
  const nextControlDate = finalValue(p.fields.next_control_date);
  p.records.alert = { ...p.records.alert, severity: riskLevel, workflow_id: p.workflow_id };
  p.records.task = { ...p.records.task, checklist: protocol, due_date: nextControlDate };
  const dedupeText = p.workflow_meta?.dedupe_key || p.records.alert.alert_dedupe_key || p.records.task.task_dedupe_key || p.records.alert.title;
  const existingAlerts = arr(handlers.alerts || handlers.existingAlerts || p.dedupe_context?.alerts);
  const existingTasks = arr(handlers.tasks || handlers.existingTasks || p.dedupe_context?.tasks);
  const skipAlert = existingAlerts.some((alert) => openStatus(alert) && (alert.alert_dedupe_key === p.records.alert.alert_dedupe_key || hasSimilarOpen([alert], p.records.alert.entity_id, dedupeText)));
  const skipTask = existingTasks.some((task) => openStatus(task) && (task.task_dedupe_key === p.records.task.task_dedupe_key || hasSameHealthFollowup([task], p.records.task) || hasSimilarOpen([task], p.records.task.related_id, dedupeText)));

  await runBiosecuritySideEffects({
    alert: p.records.alert,
    task: p.records.task,
    stockMovement: p.records.stock_movement,
    document: p.records.document,
    trace: p.records.trace,
    alertes: existingAlerts,
    tasks: existingTasks,
    handlers,
    skipAlert,
    skipTask,
  });

  return { ok: true, skipped_alert: skipAlert, skipped_task: skipTask, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareHarvestWorkflow(payload = {}, context = {}) {
  return {
    workflow_type: 'harvest',
    workflow_id: safeId('WF', context.workflows),
    records: {
      culture_patch: payload,
      stock: { id: safeId('STK', context.stocks), produit: payload.produit || payload.culture || 'Récolte', categorie: 'recolte', quantite: toNumber(payload.quantite), unite: payload.unite || 'kg', activite_liee: 'cultures' },
      trace: { id: safeId('EVT', context.events), event_type: 'recolte', module_source: 'cultures', event_date: today() },
    },
    workflow_meta: workflowMeta({ type: 'harvest', actions: ['culture', 'stock', 'trace'] }),
  };
}

export async function commitHarvestWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const ctx = handlers.context || {};
  const culturePatch = p.records.culture_patch || {};

  await runCultureHarvestSideEffects({
    before: ctx.beforeCulture || {},
    after: culturePatch,
    stocks: ctx.stocks || [],
    opportunities: ctx.opportunities || [],
    transactions: ctx.transactions || [],
    handlers,
  });

  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareInvestmentExecutionWorkflow(payload = {}, context = {}) {
  return {
    workflow_type: 'investment_execution',
    workflow_id: safeId('WF', context.workflows),
    records: {
      investment_patch: { ...payload, statut: 'effectif' },
      finance: { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Investissement ${payload.designation || payload.nom || payload.id}`, montant: toNumber(payload.total ?? payload.montant), amount: toNumber(payload.total ?? payload.montant), date: today(), categorie: 'Investissements', module_lie: 'investissements', source_module: 'investissements', source_record_id: payload.id },
      document: { id: safeId('DOC', context.documents), title: `Preuve investissement ${payload.designation || payload.id}`, document_category: 'facture', module_source: 'investissements', entity_id: payload.id },
      trace: { id: safeId('EVT', context.events), event_type: 'investissement_effectif', module_source: 'investissements', event_date: today() },
    },
    workflow_meta: workflowMeta({ type: 'investment_execution', actions: ['investment', 'finance', 'document', 'trace'] }),
  };
}

export async function commitInvestmentExecutionWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const investment = p.records.investment_patch || {};
  const finance = p.records.finance || {};

  await handlers.onUpdateInvestment?.(investment.id, { ...investment, side_effects_managed: true });
  if (finance?.id) {
    const financeRow = { ...finance, id: financeIds.investment(investment.id), side_effects_managed: true, created_from: 'investment_workflow' };
    await handlers.onCreateFinanceTransaction?.(financeRow);
    await syncFinanceSideEffects(financeRow, { handlers, document: p.records.document });
  }
  if (p.records.document) await handlers.onCreateDocument?.({ ...p.records.document, side_effects_managed: true });
  if (p.records.trace) await handlers.onCreateBusinessEvent?.({ ...p.records.trace, side_effects_managed: true });

  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareEquipmentWorkflow(payload = {}, context = {}) {
  const repairCost = toNumber(payload.cout_reparation);
  const actions = ['equipment', 'task', 'alert', repairCost > 0 ? 'finance' : null].filter(Boolean);
  return {
    workflow_type: 'equipment',
    workflow_id: safeId('WF', context.workflows),
    records: {
      equipment_patch: payload,
      task: { id: safeId('TSK', context.tasks), title: `Intervention équipement ${payload.nom || payload.id}`, module_lie: 'equipements', related_id: payload.id, due_date: today(), priority: 'haute', status: 'a_faire' },
      alert: { id: safeId('ALT', context.alerts), title: 'Panne équipement', message: payload.nom || payload.id, module_source: 'equipements', entity_id: payload.id, severity: 'warning', status: 'nouvelle' },
      finance: repairCost > 0 ? { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Réparation ${payload.nom || payload.id}`, montant: repairCost, amount: repairCost, date: today(), categorie: 'Equipements', module_lie: 'equipements', source_module: 'equipements', source_record_id: payload.id } : null,
    },
    workflow_meta: workflowMeta({ type: 'equipment', actions }),
  };
}

export async function commitEquipmentWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const ctx = handlers.context || {};
  const equipmentPatch = p.records.equipment_patch || {};

  await runEquipmentWorkflowSideEffects({
    equipment: equipmentPatch,
    equipmentPatch,
    repairCost: toNumber(equipmentPatch.cout_reparation),
    tasks: ctx.tasks || [],
    alertes: ctx.alertes || [],
    transactions: ctx.transactions || [],
    handlers,
  });

  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareAlertActionWorkflow(payload = {}, context = {}) {
  return {
    workflow_type: 'alert_action',
    workflow_id: safeId('WF', context.workflows),
    records: {
      task: { id: safeId('TSK', context.tasks), title: payload.title || payload.message || 'Action alerte', module_lie: payload.module_source || payload.module || 'alertes', related_id: payload.entity_id || payload.id, due_date: today(), priority: payload.severity === 'critical' || payload.severity === 'critique' ? 'critique' : 'haute', status: 'a_faire', source_module: 'alertes', source_record_id: payload.id },
      alert_patch: { status: 'prise_en_charge', task_created_at: now() },
    },
    workflow_meta: workflowMeta({ type: 'alert_action', actions: ['task', 'alert'] }),
  };
}

export async function commitAlertActionWorkflow(preview, handlers = {}) {
  await handlers.onCreateTask?.(preview.records.task);
  await handlers.onUpdateAlert?.(preview.records.task.source_record_id, preview.records.alert_patch);
  return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 };
}

export function calculateAvoidedInputs(events = []) {
  return arr(events).reduce((sum, event) => sum + toNumber(event.saisies_evitees), 0);
}
