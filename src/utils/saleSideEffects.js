import { syncFinanceSideEffects, closeOpportunityForOrder, syncSaleTraceFromOrder, resolveSaleTasksOnPayment } from '../services/erpInterconnectionEngine';
import { getFinanceActivityFromSale, getFinanceCategoryFromSale } from '../services/financeSyncService';
import { buildClientReminderFollowUp, buildClientSalesSummary, resolveClientReminderFollowUp } from './clientWorkflows';
import { buildClientReceivablePatch } from './recordSalePayment';
import { buildReverseSaleSourcePatch, buildSaleSourcePatch } from './salesWorkflows';
import { remainingForOrder } from './salesStatuses';
import { financeIds } from './sideEffectIds';
import { enrichFinanceWithOrderFarmId } from './commercialFarmScope.js';
import { isStockableSourceType } from './commercialStockValidation.js';
import { planStockMovementFromSaleLine } from './stockMovementBridge.js';
import { makeId } from './ids';
import { toNumber } from './format';

export { financeIds };

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => toNumber(value);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

/** Ligne finance créance liée à une commande. */
export function findReceivableFinanceForOrder(orderId = '', transactions = []) {
  const target = clean(orderId);
  return arr(transactions).find((trx) => {
    const linked = clean(trx.order_id || trx.sale_id || trx.related_id || trx.source_record_id || trx.vente_id);
    if (linked !== target) return false;
    const category = lower(`${trx.categorie || ''} ${trx.libelle || ''}`);
    const status = lower(trx.statut || trx.status || '');
    return (category.includes('creance') || category.includes('créance') || clean(trx.id) === financeIds.receivable(target))
      && ['impaye', 'impayé', 'partiel', 'a_payer', 'unpaid'].includes(status);
  }) || null;
}

export function buildPaidFinanceRow({
  orderId,
  clientId = '',
  clientLabel = 'Client',
  amount = 0,
  date = '',
  paymentId = '',
  paymentMethod = 'especes',
  invoiceId = '',
  order = {},
  remaining = 0,
  farmId = null,
} = {}) {
  const value = num(amount);
  if (value <= 0) return null;
  return enrichFinanceWithOrderFarmId({
    id: financeIds.paid(orderId, paymentId),
    type: 'entree',
    libelle: `${remaining > 0 ? 'Acompte' : 'Encaissement'} ${orderId} - ${clientLabel}`,
    montant: value,
    amount: value,
    date: date || today(),
    categorie: getFinanceCategoryFromSale(order),
    activite: getFinanceActivityFromSale(order),
    module_lie: 'ventes',
    related_id: orderId,
    vente_id: orderId,
    order_id: orderId,
    client_id: clientId,
    statut: remaining > 0 ? 'partiel' : 'paye',
    source_module: 'ventes',
    source_record_id: orderId,
    invoice_id: invoiceId || '',
    payment_id: paymentId || '',
    moyen_paiement: paymentMethod,
    transaction_origin: 'automatique',
    side_effects_managed: true,
    created_from: 'sale_side_effects',
  }, order, farmId);
}

export function buildReceivableFinanceRow({
  orderId,
  clientId = '',
  clientLabel = 'Client',
  amount = 0,
  date = '',
  order = {},
  farmId = null,
} = {}) {
  const value = num(amount);
  if (value <= 0) return null;
  return enrichFinanceWithOrderFarmId({
    id: financeIds.receivable(orderId),
    type: 'entree',
    libelle: `Créance client ${orderId} - ${clientLabel}`,
    montant: value,
    amount: value,
    date: date || today(),
    categorie: 'Creance client',
    activite: getFinanceActivityFromSale(order),
    module_lie: 'ventes',
    related_id: orderId,
    vente_id: orderId,
    order_id: orderId,
    client_id: clientId,
    statut: 'impaye',
    reste_a_payer: value,
    source_module: 'ventes',
    source_record_id: orderId,
    transaction_origin: 'automatique',
    side_effects_managed: true,
    created_from: 'sale_side_effects',
  }, order, farmId);
}

export function buildReceivableAlertRow({ orderId, clientLabel = 'Client', amount = 0, productName = 'Vente', farmId = null } = {}) {
  const value = num(amount);
  if (value <= 0) return null;
  return {
    id: financeIds.alert(orderId),
    title: 'Créance client à suivre',
    message: `${productName} · ${clientLabel} · reste ${value.toLocaleString('fr-FR')} FCFA`,
    module_source: 'ventes',
    entity_type: 'commande',
    entity_id: orderId,
    related_id: orderId,
    severity: 'warning',
    status: 'nouvelle',
    action_recommandee: 'Encaisser ou relancer le client depuis Commercial',
    alert_dedupe_key: `creance-vente-${orderId}`,
    side_effects_managed: true,
    ...(farmId ? { farm_id: farmId } : {}),
  };
}

function resolveSourceRow(sourceType, sourceId, { stocks = [], lots = [], cultures = [], animaux = [] } = {}) {
  if (!sourceId || sourceType === 'autre') return null;
  if (sourceType === 'stock') return arr(stocks).find((row) => String(row.id) === String(sourceId)) || null;
  if (sourceType === 'lot_avicole') return arr(lots).find((row) => String(row.id) === String(sourceId)) || null;
  if (sourceType === 'culture') return arr(cultures).find((row) => String(row.id) === String(sourceId)) || null;
  if (sourceType === 'animal') return arr(animaux).find((row) => String(row.id) === String(sourceId)) || null;
  return null;
}

/** Décrémente stock / lot / animal / culture vendu. Si vente stock liée à une culture, met aussi à jour la fiche culture. */
export async function applySourceImpactFromSale({
  handlers = {},
  sourceType,
  sourceId,
  quantity = 0,
  total = 0,
  date = '',
  orderId = '',
  clientId = '',
  saleKind = '',
  stocks = [],
  lots = [],
  cultures = [],
  animaux = [],
} = {}) {
  const sourceRow = resolveSourceRow(sourceType, sourceId, { stocks, lots, cultures, animaux });
  const patchPlan = buildSaleSourcePatch({
    sourceType,
    sourceRow: sourceRow || { id: sourceId },
    quantity,
    total,
    date,
    orderId,
    clientId,
    saleKind,
  });
  if (!patchPlan?.id) return null;

  if (patchPlan.module === 'stock') {
    await handlers.onUpdateStock?.(patchPlan.id, patchPlan.patch);
    const cultureId = sourceRow?.culture_id || (String(sourceRow?.source_module || '').includes('culture') ? sourceRow?.source_id || sourceRow?.related_id : null);
    if (cultureId) {
      const cultureRow = arr(cultures).find((row) => String(row.id) === String(cultureId)) || { id: cultureId };
      const culturePlan = buildSaleSourcePatch({
        sourceType: 'culture',
        sourceRow: cultureRow,
        quantity,
        total,
        date,
        orderId,
        clientId,
        saleKind,
      });
      if (culturePlan?.id) await handlers.onUpdateCulture?.(culturePlan.id, culturePlan.patch);
    }
  }
  if (patchPlan.module === 'lot_avicole') await handlers.onUpdateLot?.(patchPlan.id, patchPlan.patch);
  if (patchPlan.module === 'animal') await handlers.onUpdateAnimal?.(patchPlan.id, patchPlan.patch);
  if (patchPlan.module === 'culture') await handlers.onUpdateCulture?.(patchPlan.id, patchPlan.patch);
  return patchPlan;
}

/** Impact stock sur toutes les lignes commande (idempotent par ligne). */
export async function applySourceImpactFromSaleLines({
  handlers = {},
  orderItems = [],
  order = {},
  orderId = '',
  date = '',
  clientId = '',
  stocks = [],
  lots = [],
  cultures = [],
  animaux = [],
} = {}) {
  const applied = [];
  const skipped = [];

  for (const item of arr(orderItems)) {
    if (item.source_impact_applied === true) {
      skipped.push(item.id);
      continue;
    }

    const sourceType = item.source_type;
    const sourceId = item.source_id;
    if (!isStockableSourceType(sourceType) || !sourceId) {
      skipped.push(item.id);
      continue;
    }

    const patchPlan = await applySourceImpactFromSale({
      handlers,
      sourceType,
      sourceId,
      quantity: num(item.quantity),
      total: num(item.line_total ?? item.total),
      date,
      orderId,
      clientId,
      saleKind: item.sale_kind,
      stocks,
      lots,
      cultures,
      animaux,
    });

    if (patchPlan?.id) {
      applied.push(item.id);
      const movementPlan = planStockMovementFromSaleLine({ orderItem: item, order, patchPlan });
      if (handlers.onUpdateItem && item.id) {
        await handlers.onUpdateItem(item.id, {
          source_impact_applied: true,
          source_impact_at: new Date().toISOString(),
          stock_movement_planned: movementPlan.movement,
          stock_movement_ready: movementPlan.ready,
          stock_movement_note: movementPlan.note,
        });
      }
    }
  }

  return { applied, skipped };
}

/** Restitue stock / lot / animal / culture après suppression vente. */
export async function reverseSourceImpactFromSale({
  handlers = {},
  order = {},
  stocks = [],
  lots = [],
  cultures = [],
  animaux = [],
} = {}) {
  const sourceType = order.source_type;
  const sourceId = order.source_id;
  const quantity = num(order.quantity ?? order.quantite);
  const total = num(order.montant_ht ?? order.montant_total) - num(order.frais_livraison ?? order.delivery_fee);
  const sourceRow = resolveSourceRow(sourceType, sourceId, { stocks, lots, cultures, animaux });
  const patchPlan = buildReverseSaleSourcePatch({ sourceType, sourceRow: sourceRow || { id: sourceId }, quantity, total });
  if (!patchPlan?.id) return null;

  if (patchPlan.module === 'stock') await handlers.onUpdateStock?.(patchPlan.id, patchPlan.patch);
  if (patchPlan.module === 'lot_avicole') await handlers.onUpdateLot?.(patchPlan.id, patchPlan.patch);
  if (patchPlan.module === 'animal') await handlers.onUpdateAnimal?.(patchPlan.id, patchPlan.patch);
  if (patchPlan.module === 'culture') await handlers.onUpdateCulture?.(patchPlan.id, patchPlan.patch);
  return patchPlan;
}

async function applyClientReminderIfNeeded({ clientId, clients, salesOrders, payments, handlers, alertes = [] }) {
  if (!clientId) return null;
  const client = arr(clients).find((row) => String(row.id) === String(clientId));
  if (!client) return null;
  const summary = buildClientSalesSummary(client, salesOrders, payments);
  const followUp = buildClientReminderFollowUp(client, summary);
  if (!followUp) return null;

  const alertExists = arr(alertes).some((row) => clean(row.alert_dedupe_key || row.id) === clean(followUp.key) || clean(row.linked_task_id) === clean(followUp.task.id));
  const taskExists = arr(handlers.existingTasks || []).some((row) => clean(row.task_dedupe_key || row.routine_key) === clean(followUp.key));

  if (!taskExists) await handlers.onCreateTask?.(followUp.task);
  if (!alertExists) await handlers.onCreateAlert?.(followUp.alert);
  return followUp;
}

/** Met à jour le client (créances, totaux, dernière commande). */
export async function syncClientFromSale({
  clientId,
  clients = [],
  salesOrders = [],
  payments = [],
  date = '',
  handlers = {},
  alertes = [],
} = {}) {
  if (!clientId) return null;
  const patch = buildClientReceivablePatch(clientId, { clients, salesOrders, payments });
  if (!patch) return null;
  const payload = {
    ...patch,
    dernier_achat: date || today(),
    derniere_commande: date || today(),
    last_order_date: date || today(),
  };
  await handlers.onUpdateClient?.(clientId, payload);
  const client = arr(clients).find((row) => String(row.id) === String(clientId));
  const summary = buildClientSalesSummary(client || { id: clientId }, salesOrders, payments);
  if (num(patch.reste_a_payer) > 0) {
    await applyClientReminderIfNeeded({ clientId, clients, salesOrders, payments, handlers, alertes });
  } else if (client) {
    await resolveClientReminderFollowUp({
      client,
      summary,
      tasks: handlers.existingTasks || [],
      alertes,
      handlers,
    });
  }
  return payload;
}

/** Solde la créance finance quand la vente est encaissée. */
export async function syncReceivableAfterPayment({
  sale = {},
  payments = [],
  transactions = [],
  handlers = {},
  alertes = [],
} = {}) {
  const remaining = remainingForOrder(sale, payments);
  const receivable = findReceivableFinanceForOrder(sale.id, transactions);
  if (receivable?.id && handlers.onUpdateFinanceTransaction) {
    try {
      await handlers.onUpdateFinanceTransaction(receivable.id, {
        statut: remaining <= 0 ? 'paye' : 'partiel',
        reste_a_payer: Math.max(0, remaining),
      });
    } catch (error) {
      console.warn('syncReceivableAfterPayment finance', error?.message || error);
    }
  }
  if (remaining <= 0 && handlers.onUpdateAlert) {
    const alertId = financeIds.alert(sale.id);
    const alertExists = arr(alertes).some((row) => clean(row.id) === clean(alertId));
    if (alertExists) {
      try {
        await handlers.onUpdateAlert(alertId, { status: 'resolue', statut: 'resolue' });
      } catch (error) {
        console.warn('syncReceivableAfterPayment alert', error?.message || error);
      }
    }
  }
  return { remaining, receivableId: receivable?.id || null };
}

/** Tâche de livraison si la vente est « à livrer ». */
export async function ensureDeliveryTask({
  orderId,
  productName = 'Vente',
  clientLabel = 'Client',
  date = '',
  fulfillmentMode = '',
  tasks = [],
  handlers = {},
  farmId = null,
} = {}) {
  const mode = lower(fulfillmentMode);
  if (mode !== 'a_livrer' && mode !== 'a livrer') return null;
  const existing = arr(tasks).find((task) => clean(task.related_id || task.order_id || task.entity_id) === clean(orderId));
  if (existing?.id) return existing;
  const task = {
    id: makeId('TSK'),
    title: `Livrer ${productName} → ${clientLabel}`,
    module_lie: 'ventes',
    related_id: orderId,
    entity_id: orderId,
    entity_type: 'commande',
    due_date: date || today(),
    priority: 'normale',
    status: 'a_faire',
    routine_key: `livraison-vente-${orderId}`,
    checklist: 'Préparer le produit; confirmer adresse/téléphone; marquer livré dans Commercial.',
    ...(farmId ? { farm_id: farmId } : {}),
  };
  await handlers.onCreateTask?.(task);
  return task;
}

/**
 * Effets automatiques après création d'une vente (1 saisie → N modules).
 * Finance · Client · Stock/Élevage · Tâche livraison · Alerte créance
 */
/** Mappe les handlers workflow (onUpdateSourceAsset) vers le pipeline unifié. */
export function buildSaleWorkflowHandlers(handlers = {}, context = {}) {
  const mapSource = (activity, id, patch) => {
    if (handlers.onUpdateSourceAsset) return handlers.onUpdateSourceAsset(activity, id, patch);
    if (handlers.onUpdateStock && (activity === 'stock' || String(activity).includes('stock'))) return handlers.onUpdateStock(id, patch);
    if (handlers.onUpdateLot && (String(activity).includes('avicole') || String(activity).includes('lot'))) return handlers.onUpdateLot(id, patch);
    if (handlers.onUpdateAnimal && (activity === 'animaux' || String(activity).includes('animal'))) return handlers.onUpdateAnimal(id, patch);
    if (handlers.onUpdateCulture && (activity === 'cultures' || String(activity).includes('culture'))) return handlers.onUpdateCulture(id, patch);
    return null;
  };

  return {
    ...handlers,
    onUpdateStock: handlers.onUpdateStock || ((id, patch) => mapSource('stock', id, patch)),
    onUpdateLot: handlers.onUpdateLot || ((id, patch) => mapSource('avicole', id, patch)),
    onUpdateAnimal: handlers.onUpdateAnimal || ((id, patch) => mapSource('animaux', id, patch)),
    onUpdateCulture: handlers.onUpdateCulture || ((id, patch) => mapSource('cultures', id, patch)),
    opportunities: context.opportunities || handlers.opportunities || [],
    existingTraces: context.traces || context.tracabilite || handlers.existingTraces || [],
  };
}

export async function runNewSaleSideEffects({
  order = {},
  orderId = '',
  orderItems = [],
  form = {},
  paid = 0,
  remaining = 0,
  paymentId = '',
  invoiceId = '',
  productName = '',
  clientLabel = 'Client',
  realClientId = '',
  farmId = null,
  selected = null,
  stocks = [],
  lots = [],
  cultures = [],
  animaux = [],
  clients = [],
  salesOrders = [],
  payments = [],
  transactions = [],
  tasks = [],
  alertes = [],
  handlers = {},
  skipSourceImpact = false,
} = {}) {
  const date = form.date || order.date || today();
  const resolvedFarmId = farmId || order.farm_id || null;
  const lines = arr(orderItems).length
    ? orderItems
    : [{
      source_type: form.source_type || order.source_type,
      source_id: form.source_id || order.source_id,
      quantity: num(form.quantity ?? order.quantity),
      line_total: num(order.montant_ht ?? order.montant_total) - num(order.frais_livraison ?? order.delivery_fee),
      sale_kind: selected?.sale_kind || order.sale_kind,
      source_impact_applied: order.source_impact_applied === true,
    }];

  if (!skipSourceImpact) {
    const impact = await applySourceImpactFromSaleLines({
      handlers,
      orderItems: lines,
      order,
      orderId,
      date,
      clientId: realClientId,
      stocks,
      lots,
      cultures,
      animaux,
    });
    if (handlers.onUpdateOrder && orderId && impact.applied.length > 0) {
      await handlers.onUpdateOrder(orderId, {
        source_impact_applied: true,
        source_impact_lines: impact.applied.length,
      });
    }
  }

  if (paid > 0 && paymentId) {
    const paidFinance = buildPaidFinanceRow({
      orderId,
      clientId: realClientId,
      clientLabel,
      amount: paid,
      date,
      paymentId,
      paymentMethod: form.payment_method || order.moyen_paiement,
      invoiceId,
      order,
      remaining,
      farmId: resolvedFarmId,
    });
    if (paidFinance) {
      const existingPaid = arr(transactions).find((row) => clean(row.id) === clean(paidFinance.id));
      if (!existingPaid) await handlers.onCreateFinanceTransaction?.(paidFinance);
      await syncFinanceSideEffects(existingPaid || paidFinance, { handlers });
    }
  }

  if (remaining > 0) {
    const receivableFinance = buildReceivableFinanceRow({
      orderId,
      clientId: realClientId,
      clientLabel,
      amount: remaining,
      date,
      order,
      farmId: resolvedFarmId,
    });
    if (receivableFinance) {
      const existingReceivable = arr(transactions).find((row) => clean(row.id) === clean(receivableFinance.id));
      if (!existingReceivable) await handlers.onCreateFinanceTransaction?.(receivableFinance);
      await syncFinanceSideEffects(existingReceivable || receivableFinance, { handlers });
    }

    const alertRow = buildReceivableAlertRow({
      orderId,
      clientLabel,
      amount: remaining,
      productName: productName || order.product_name,
      farmId: resolvedFarmId,
    });
    const alertExists = arr(alertes).some((row) => clean(row.alert_dedupe_key) === clean(alertRow?.alert_dedupe_key));
    if (alertRow && !alertExists) await handlers.onCreateAlert?.(alertRow);
  }

  const nextPayments = paid > 0 && paymentId
    ? [...arr(payments), { id: paymentId, order_id: orderId, sale_id: orderId, client_id: realClientId, montant: paid, amount: paid, montant_paye: paid }]
    : arr(payments);
  const nextOrders = [...arr(salesOrders).filter((row) => String(row.id) !== String(orderId)), order];

  await syncClientFromSale({
    clientId: realClientId,
    clients,
    salesOrders: nextOrders,
    payments: nextPayments,
    date,
    handlers: { ...handlers, existingTasks: tasks },
    alertes,
  });

  await ensureDeliveryTask({
    orderId,
    productName: productName || order.product_name,
    clientLabel,
    date,
    fulfillmentMode: form.fulfillment_mode || order.fulfillment_mode,
    tasks,
    handlers,
    farmId: resolvedFarmId,
  });

  await closeOpportunityForOrder(order, handlers.opportunities || [], handlers);
  await syncSaleTraceFromOrder(order, { clientLabel, handlers, existingTraces: handlers.existingTraces || [] });

  return { paidFinance: paid > 0, receivableFinance: remaining > 0, clientSynced: Boolean(realClientId) };
}

/** Effets après encaissement partiel/total sur vente existante. */
export async function runPaymentSideEffects({
  sale = {},
  payments = [],
  transactions = [],
  clients = [],
  salesOrders = [],
  alertes = [],
  tasks = [],
  handlers = {},
} = {}) {
  try {
    await syncReceivableAfterPayment({ sale, payments, transactions, handlers, alertes });
  } catch (error) {
    console.warn('syncReceivableAfterPayment', error?.message || error);
  }
  if (sale.client_id) {
    try {
      await syncClientFromSale({
        clientId: sale.client_id,
        clients,
        salesOrders,
        payments,
        date: today(),
        handlers: { ...handlers, existingTasks: tasks },
        alertes,
      });
    } catch (error) {
      console.warn('syncClientFromSale', error?.message || error);
    }
  }
  try {
    await resolveSaleTasksOnPayment({ sale, payments, tasks, handlers });
  } catch (error) {
    console.warn('resolveSaleTasksOnPayment', error?.message || error);
  }
  const lastPayment = arr(payments).filter((row) => clean(row.order_id || row.sale_id) === clean(sale.id)).slice(-1)[0];
  if (lastPayment) {
    const financeRow = arr(transactions).find((row) => clean(row.payment_id) === clean(lastPayment.id))
      || { id: financeIds.paid(sale.id, lastPayment.id), montant: lastPayment.montant, type: 'entree', categorie: 'Vente', module_lie: 'ventes', date: lastPayment.date_paiement || today(), libelle: `Encaissement ${sale.id}` };
    try {
      await syncFinanceSideEffects(financeRow, { handlers });
    } catch (error) {
      console.warn('syncFinanceSideEffects', error?.message || error);
    }
  }
}

/** Clôture les tâches de livraison liées à une vente. */
export async function resolveSaleTasksOnDelivery({ sale = {}, tasks = [], handlers = {} } = {}) {
  if (!handlers.onUpdateTask || !sale?.id) return null;
  const target = clean(sale.id);
  const related = arr(tasks).filter((task) => {
    const linked = clean(task.related_id || task.order_id || task.entity_id || task.source_record_id);
    const routine = lower(task.routine_key || '');
    return linked === target || routine.includes(`livraison-vente-${target}`);
  });
  await Promise.allSettled(related.map((task) => handlers.onUpdateTask(task.id, {
    status: 'termine',
    statut: 'termine',
    completed_at: new Date().toISOString(),
  })));
  return related.length;
}

/** Effets après changement de livraison depuis le modal vente. */
export async function runDeliverySideEffects({
  sale = {},
  deliveryStatus = '',
  productName = '',
  clientLabel = 'Client',
  tasks = [],
  handlers = {},
} = {}) {
  if (lower(deliveryStatus) === 'livre' || lower(deliveryStatus) === 'recupere') return null;
  return ensureDeliveryTask({
    orderId: sale.id,
    productName: productName || sale.product_name,
    clientLabel,
    date: sale.date || sale.date_commande || today(),
    fulfillmentMode: deliveryStatus || sale.fulfillment_mode,
    tasks,
    handlers,
  });
}
