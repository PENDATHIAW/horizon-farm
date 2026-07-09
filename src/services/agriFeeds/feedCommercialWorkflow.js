/**
 * AGRI FEEDS — ventes progressives, réachats, feedback et signaux commerciaux.
 * Réutilise clients, sales_orders, sales_order_items, stock, finances et business_events.
 */
import { AGRI_FEEDS_ALERT_THRESHOLDS } from '../../config/agriFeeds.config.js';
import { toNumber } from '../../utils/format.js';
import { assertFinishedBatchSellable } from './feedProductionWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB = new Date()) {
  if (!dateA) return Infinity;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return Infinity;
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function getCustomerName(client = {}) {
  return client.name || client.nom || client.raison_sociale || client.phone || client.telephone || 'Client éleveur';
}

function getBatchLabel(batch = {}, formula = {}, version = {}) {
  return `${formula.name || 'Aliment AGRI FEEDS'} · ${version.version_code || batch.formula_version_id || ''} · ${batch.batch_code || batch.id}`;
}

export function resolveFeedSaleContext(payload = {}, dataMap = {}) {
  const clientId = clean(payload.client_id);
  const batchId = clean(payload.feed_finished_batch_id || payload.finished_batch_id);
  const batch = arr(dataMap.feed_finished_batches).find((b) => String(b.id) === batchId);
  const version = arr(dataMap.feed_formula_versions).find((v) => String(v.id) === String(batch?.formula_version_id));
  const formula = arr(dataMap.feed_formulas).find((f) => String(f.id) === String(version?.formula_id));
  const client = arr(dataMap.clients).find((c) => String(c.id) === clientId);
  const stock = arr(dataMap.stock || dataMap.stocks).find((s) => (
    String(s.feed_finished_batch_id || '') === batchId
    || String(s.id || '') === String(batch?.stock_id || '')
  ));
  const qualityChecks = arr(dataMap.feed_quality_checks).filter((qc) => (
    String(qc.related_type || '') === 'finished_batch'
    && String(qc.related_id || '') === batchId
    && ['accepted', 'pass', 'conforme'].includes(norm(qc.result || qc.status))
  ));
  return { client, batch, version, formula, stock, qualityChecks };
}

export function assertFeedBatchCanBeSold(batch = {}, formula = {}, dataMap = {}) {
  const base = assertFinishedBatchSellable(batch, formula);
  if (!base.ok) return base;
  if (norm(formula?.status) !== 'commercializable') {
    return { ok: false, message: 'Formule non commercialisable — vente bloquée.' };
  }
  if (norm(batch?.destination) !== 'commercial_sale') {
    return { ok: false, message: 'Lot non destiné à la vente commerciale.' };
  }
  const qcOk = arr(dataMap.feed_quality_checks).some((qc) => (
    String(qc.related_type || '') === 'finished_batch'
    && String(qc.related_id || '') === String(batch.id)
    && ['accepted', 'pass', 'conforme'].includes(norm(qc.result || qc.status))
  ));
  if (!qcOk) return { ok: false, message: 'QC minimum manquant — vente bloquée.' };
  return { ok: true };
}

export function listCommercializableFeedBatches(dataMap = {}) {
  return arr(dataMap.feed_finished_batches)
    .map((batch) => {
      const version = arr(dataMap.feed_formula_versions).find((v) => String(v.id) === String(batch.formula_version_id));
      const formula = arr(dataMap.feed_formulas).find((f) => String(f.id) === String(version?.formula_id));
      const gate = assertFeedBatchCanBeSold(batch, formula, dataMap);
      return { batch, version, formula, gate };
    })
    .filter((row) => row.gate.ok)
    .sort((a, b) => String(b.batch.production_date || '').localeCompare(String(a.batch.production_date || '')));
}

export function prepareFeedSaleOrder(payload = {}, dataMap = {}) {
  const { client, batch, version, formula, stock } = resolveFeedSaleContext(payload, dataMap);
  if (!client) return { ok: false, error: 'Client éleveur obligatoire.' };
  if (!batch) return { ok: false, error: 'Lot AGRI FEEDS introuvable.' };

  const gate = assertFeedBatchCanBeSold(batch, formula, dataMap);
  if (!gate.ok) return { ok: false, error: gate.message };

  const quantity = toNumber(payload.quantity_kg ?? payload.quantity);
  if (quantity <= 0) return { ok: false, error: 'Quantité vendue obligatoire.' };
  if (quantity > toNumber(batch.quantity_available)) {
    return { ok: false, error: 'Stock produit fini insuffisant pour cette vente.' };
  }

  const unitCost = toNumber(batch.unit_cost || stock?.prixUnit || batch.real_cost_per_kg);
  const unitPrice = toNumber(payload.unit_price || payload.price_per_kg || unitCost);
  if (unitPrice <= 0) return { ok: false, error: 'Prix de vente obligatoire.' };
  const total = quantity * unitPrice;
  const paidAmount = Math.min(total, Math.max(0, toNumber(payload.paid_amount)));
  const remaining = Math.max(0, total - paidAmount);
  const saleDate = clean(payload.order_date) || today();
  const orderId = clean(payload.id) || makeId('CMD');
  const itemId = makeId('CMDI');
  const margin = (unitPrice - unitCost) * quantity;
  const customerName = getCustomerName(client);
  const label = getBatchLabel(batch, formula, version);
  const nextBatchQty = Math.max(0, toNumber(batch.quantity_available) - quantity);

  const saleOrder = {
    id: orderId,
    order_number: clean(payload.order_number) || `AF-${saleDate.replace(/-/g, '')}-${orderId.slice(-4)}`,
    client_id: client.id,
    client_name: customerName,
    order_date: saleDate,
    delivery_date: clean(payload.delivery_date) || saleDate,
    source_type: 'agri_feeds',
    module_source: 'agri_feeds',
    statut: 'confirmee',
    status: 'confirmed',
    payment_status: remaining > 0 ? (paidAmount > 0 ? 'partial' : 'unpaid') : 'paid',
    montant_total: total,
    total_amount: total,
    paid_amount: paidAmount,
    reste_a_payer: remaining,
    remaining,
    notes: clean(payload.notes),
    metadata: {
      feed_finished_batch_id: batch.id,
      formula_version_id: version?.id || batch.formula_version_id,
      formula_id: formula?.id || null,
      created_from: 'agri_feeds_commercial_workflow',
    },
  };

  const orderItem = {
    id: itemId,
    order_id: orderId,
    product_name: label,
    source_type: 'feed_finished_batch',
    source_id: batch.id,
    feed_finished_batch_id: batch.id,
    formula_version_id: version?.id || batch.formula_version_id,
    quantity,
    quantity_kg: quantity,
    unit_price: unitPrice,
    unit_cost: unitCost,
    amount: total,
    margin,
  };

  const finishedBatchPatch = {
    id: batch.id,
    quantity_available: nextBatchQty,
    last_sale_date: saleDate,
  };

  const stockPatch = stock ? {
    id: stock.id,
    quantite: Math.max(0, toNumber(stock.quantite) - quantity),
  } : null;

  const movement = stock ? {
    id: makeId('STKMVT'),
    stock_id: stock.id,
    movement_type: 'sortie_vente_agri_feeds',
    quantity,
    movement_date: saleDate,
    metadata: {
      sales_order_id: orderId,
      feed_finished_batch_id: batch.id,
      created_from: 'agri_feeds_commercial_workflow',
    },
  } : null;

  const financeTransaction = paidAmount > 0 ? {
    id: makeId('TRX'),
    type: 'recette',
    categorie: 'vente_agri_feeds',
    montant: paidAmount,
    date: saleDate,
    description: `Vente AGRI FEEDS — ${customerName}`,
    source_type: 'sales_order',
    source_id: orderId,
    module_source: 'agri_feeds',
  } : null;

  const clientPatch = {
    id: client.id,
    last_purchase_date: saleDate,
    preferred_product: formula?.name || client.preferred_product || '',
    usual_volume: Math.max(toNumber(client.usual_volume), quantity),
    repeat_purchase_score: toNumber(client.repeat_purchase_score) + 1,
    customer_type: client.customer_type || 'other',
    credit_status: remaining > 0 ? 'credit_ouvert' : (client.credit_status || 'ok'),
  };

  const lowStockAlert = nextBatchQty <= AGRI_FEEDS_ALERT_THRESHOLDS.finished_stock_critical_kg ? {
    title: `Stock AGRI FEEDS bas — ${batch.batch_code || batch.id}`,
    message: `Il reste ${Math.round(nextBatchQty)} kg après la vente à ${customerName}.`,
    severity: 'moyenne',
    module_source: 'agri_feeds',
    entity_id: batch.id,
    action_recommandee: 'Planifier une nouvelle production ou limiter les ventes sur ce lot.',
    created_from: 'agri_feeds_commercial_workflow',
  } : null;

  const businessEvent = {
    event_type: 'agri_feeds_vente',
    module_source: 'agri_feeds',
    entity_type: 'sales_order',
    entity_id: orderId,
    title: `Vente AGRI FEEDS — ${customerName}`,
    description: `${quantity} kg · ${Math.round(unitPrice)} FCFA/kg · marge estimée ${Math.round(margin)} FCFA`,
    amount: total,
    event_date: saleDate,
    severity: remaining > 0 ? 'moyenne' : 'info',
  };

  return {
    ok: true,
    saleOrder,
    orderItem,
    finishedBatchPatch,
    stockPatch,
    movement,
    financeTransaction,
    clientPatch,
    businessEvent,
    alert: lowStockAlert,
    metrics: { quantity, unitCost, unitPrice, total, paidAmount, remaining, margin, nextBatchQty },
    formula,
    version,
    batch,
    client,
  };
}

export async function commitFeedSaleOrder(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Vente AGRI FEEDS invalide.');
  const results = {};
  if (handlers.onCreateSaleOrder) results.saleOrder = await handlers.onCreateSaleOrder(preview.saleOrder);
  if (handlers.onCreateSaleOrderItem) results.orderItem = await handlers.onCreateSaleOrderItem(preview.orderItem);
  if (handlers.onUpdateFinishedBatch) {
    results.finishedBatch = await handlers.onUpdateFinishedBatch(preview.finishedBatchPatch.id, preview.finishedBatchPatch);
  }
  if (handlers.onUpdateStock && preview.stockPatch) {
    results.stock = await handlers.onUpdateStock(preview.stockPatch.id, preview.stockPatch);
  }
  if (handlers.onCreateStockMovement && preview.movement) {
    results.movement = await handlers.onCreateStockMovement(preview.movement);
  }
  if (handlers.onCreateFinanceTransaction && preview.financeTransaction) {
    results.finance = await handlers.onCreateFinanceTransaction(preview.financeTransaction);
  }
  if (handlers.onUpdateClient) {
    results.client = await handlers.onUpdateClient(preview.clientPatch.id, preview.clientPatch);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    results.businessEvent = await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  if (handlers.onCreateAlert && preview.alert) {
    results.alert = await handlers.onCreateAlert(preview.alert);
  }
  return results;
}

export function computeAgriFeedsCommercialKpis(dataMap = {}, { now = new Date() } = {}) {
  const orders = arr(dataMap.sales_orders)
    .filter((o) => norm(o.module_source || o.source_type) === 'agri_feeds');
  const items = arr(dataMap.sales_order_items).filter((i) => String(i.source_type || '') === 'feed_finished_batch');
  const clients = arr(dataMap.clients);
  const monthKey = now.toISOString().slice(0, 7);
  const monthOrders = orders.filter((o) => String(o.order_date || o.date || '').startsWith(monthKey));
  const revenueMonth = monthOrders.reduce((sum, o) => sum + toNumber(o.montant_total || o.total_amount), 0);
  const marginMonth = items.reduce((sum, i) => sum + toNumber(i.margin), 0);
  const agriClientIds = new Set(orders.map((o) => String(o.client_id || '')).filter(Boolean));
  const repeatClients = clients.filter((c) => toNumber(c.repeat_purchase_score) >= 2 || orders.filter((o) => String(o.client_id) === String(c.id)).length >= 2);
  const receivables = orders.reduce((sum, o) => sum + Math.max(0, toNumber(o.reste_a_payer ?? o.remaining)), 0);
  const clientsToRelance = buildRepurchaseSuggestions(dataMap, { now });
  return {
    orders_count: orders.length,
    revenue_month: revenueMonth,
    margin_month: marginMonth,
    agri_clients_count: agriClientIds.size,
    repeat_clients_count: repeatClients.length,
    repeat_rate: agriClientIds.size ? (repeatClients.length / agriClientIds.size) * 100 : 0,
    receivables,
    clients_to_follow: clientsToRelance.length,
    clientsToRelance,
  };
}

export function buildRepurchaseSuggestions(dataMap = {}, { now = new Date(), delayDays = AGRI_FEEDS_ALERT_THRESHOLDS.repurchase_delay_days } = {}) {
  const orders = arr(dataMap.sales_orders)
    .filter((o) => norm(o.module_source || o.source_type) === 'agri_feeds')
    .sort((a, b) => String(b.order_date || '').localeCompare(String(a.order_date || '')));
  const clients = arr(dataMap.clients);
  return clients
    .map((client) => {
      const customerOrders = orders.filter((o) => String(o.client_id) === String(client.id));
      const lastOrder = customerOrders[0];
      const lastDate = client.last_purchase_date || lastOrder?.order_date;
      const days = daysBetween(lastDate, now);
      const usualVolume = toNumber(client.usual_volume || lastOrder?.metadata?.quantity_kg);
      const shouldRelance = customerOrders.length > 0 && days >= delayDays;
      return {
        client,
        lastOrder,
        last_purchase_date: lastDate,
        days_since_purchase: days,
        usual_volume: usualVolume,
        shouldRelance,
        reason: shouldRelance
          ? `${getCustomerName(client)} n’a pas racheté depuis ${days} jours.`
          : 'Cycle encore normal.',
      };
    })
    .filter((row) => row.shouldRelance)
    .sort((a, b) => b.days_since_purchase - a.days_since_purchase);
}

export function prepareCustomerFeedback(payload = {}, dataMap = {}) {
  const { client, batch, version, formula } = resolveFeedSaleContext(payload, dataMap);
  if (!client) return { ok: false, error: 'Client obligatoire pour enregistrer le retour.' };
  const feedbackDate = clean(payload.feedback_date) || today();
  const satisfactionScore = toNumber(payload.satisfaction_score, 0);
  const complaintType = clean(payload.complaint_type);
  const hasComplaint = Boolean(complaintType) || satisfactionScore > 0 && satisfactionScore <= 2;
  const customerName = getCustomerName(client);
  const description = clean(payload.notes) || clean(payload.feedback) || 'Retour client AGRI FEEDS.';
  const event = {
    id: makeId('EVT'),
    event_type: hasComplaint ? 'agri_feeds_reclamation_client' : 'agri_feeds_retour_client',
    module_source: 'agri_feeds',
    entity_type: 'feed_finished_batch',
    entity_id: batch?.id || payload.feed_finished_batch_id || null,
    title: hasComplaint ? `Réclamation AGRI FEEDS — ${customerName}` : `Retour AGRI FEEDS — ${customerName}`,
    description: `${formula?.name || 'Formule'} ${version?.version_code || ''} · ${description}`,
    event_date: feedbackDate,
    severity: hasComplaint ? 'haute' : 'info',
    metadata: {
      client_id: client.id,
      feed_finished_batch_id: batch?.id || null,
      formula_version_id: version?.id || null,
      complaint_type: complaintType || null,
      satisfaction_score: satisfactionScore || null,
      repurchase_intention: payload.repurchase_intention || null,
      created_from: 'agri_feeds_commercial_workflow',
    },
  };
  const alert = hasComplaint ? {
    title: `Réclamation AGRI FEEDS — ${customerName}`,
    message: description,
    severity: 'haute',
    module_source: 'agri_feeds',
    entity_id: batch?.id || null,
    action_recommandee: 'Vérifier le lot, rappeler le client et documenter l’action corrective.',
    created_from: 'agri_feeds_commercial_workflow',
  } : null;
  return { ok: true, event, alert };
}

export async function commitCustomerFeedback(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Retour client invalide.');
  const results = {};
  if (handlers.onCreateBusinessEvent) results.event = await handlers.onCreateBusinessEvent(preview.event);
  if (handlers.onCreateAlert && preview.alert) results.alert = await handlers.onCreateAlert(preview.alert);
  return results;
}

export function buildAgriFeedsCommercialDecisionCards(dataMap = {}) {
  const kpis = computeAgriFeedsCommercialKpis(dataMap);
  const sellable = listCommercializableFeedBatches(dataMap);
  const cards = [];
  if (!sellable.length) {
    cards.push({
      level: 'warning',
      title: 'Aucun lot commercialisable',
      message: 'La vente progressive reste bloquée tant qu’aucun lot issu d’une formule validée et contrôlée n’est disponible.',
      action: 'Clôturer un essai, valider humainement la formule puis produire un lot destiné à la vente.',
    });
  }
  if (kpis.clientsToRelance.length) {
    cards.push({
      level: 'info',
      title: 'Clients à relancer',
      message: `${kpis.clientsToRelance.length} client(s) régulier(s) dépassent le délai de réachat attendu.`,
      action: 'Prioriser la relance WhatsApp ou téléphone.',
    });
  }
  if (kpis.receivables > 0) {
    cards.push({
      level: 'warning',
      title: 'Créances AGRI FEEDS',
      message: `${Math.round(kpis.receivables)} FCFA restent à encaisser sur les ventes AGRI FEEDS.`,
      action: 'Suivre les paiements avant d’élargir la vente progressive.',
    });
  }
  return cards;
}
