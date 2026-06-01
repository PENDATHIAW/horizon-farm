import { fmtCurrency } from '../../utils/format.js';
import { paidForOrder, remainingForOrder } from '../../utils/salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

export const saleAmount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.estimated_amount ?? row.montant_estime);

export const isWalkInOrder = (row = {}) => !row.client_id || lower(row.client_type) === 'passage';

/** Facture requise pour le suivi Résumé (comptoir / sans facture volontaire = non). */
export function invoiceRequired(order = {}) {
  if (order.facture_emise === false) return false;
  if (order.sans_facture === true || order.no_invoice === true) return false;
  const mode = lower(order.fulfillment_mode || order.mode_vente || order.mode_livraison || '');
  if (['comptoir', 'passage', 'walkin', 'walk_in'].includes(mode)) return false;
  return true;
}

export const isOpenOrder = (row = {}) => !['cloture', 'clôture', 'annule', 'annulé', 'termine', 'terminé'].includes(lower(row.statut_commande || row.status || row.statut));

export const isOpportunityOpen = (row = {}) => !['fermee', 'fermée', 'closed', 'gagnee', 'gagnée', 'perdue', 'en_conversion'].includes(lower(row.status || row.statut));

/** Retrait sur place = livré côté commercial. */
export const isDelivered = (row = {}) => {
  const status = lower(row.delivery_status || row.statut_livraison || row.status_livraison || row.fulfillment_mode || row.mode_livraison || row.status || row.statut);
  if (['livre', 'livré', 'livree', 'delivered', 'termine', 'terminé', 'recupere', 'récupéré', 'recupéré', 'pickup', 'retrait'].includes(status)) return true;
  if (['cloture', 'clôture', 'livre'].includes(lower(row.statut_commande || row.order_status))) return true;
  const ordered = Math.max(0, n(row.quantite_commandee ?? row.quantite ?? row.quantity ?? row.qty ?? 0));
  const delivered = Math.max(0, n(row.quantite_livree ?? row.delivered_qty ?? row.qty_delivered ?? row.livree ?? 0));
  return ordered > 0 && delivered >= ordered;
};

export const isInvoiced = (row = {}) => {
  if (!invoiceRequired(row)) return true;
  return Boolean(
    row.invoice_id
    || row.facture_id
    || row.numero_facture
    || ['facture', 'facturé', 'invoiced', 'emise', 'émise', 'emise'].includes(lower(row.invoice_status || row.facture_status || row.status_facture || row.statut_facture)),
  );
};

export const isCancelledPayment = (payment = {}) => ['annule', 'annulé', 'annulee', 'cancelled', 'supprime', 'supprimé', 'deleted', 'rejete', 'rejeté'].includes(lower(payment.statut || payment.status));

export function activePayments(payments = [], orderIds = null) {
  const ids = orderIds ? new Set(arr(orderIds).map(String)) : null;
  return arr(payments).filter((payment) => {
    if (isCancelledPayment(payment)) return false;
    if (!ids) return true;
    const linked = String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
    return linked && ids.has(linked);
  });
}

export function linkedPaymentsForOrders(orders = [], payments = []) {
  const orderIds = arr(orders).map((row) => row.id).filter(Boolean);
  return activePayments(payments, orderIds);
}

export function enrichOrdersWithDeliveries(orders = [], deliveries = []) {
  const byOrder = new Map();
  arr(deliveries).forEach((row) => {
    const id = String(row.order_id || row.sale_id || row.source_record_id || '');
    if (id) byOrder.set(id, row);
  });

  return arr(orders).map((order) => {
    if (isDelivered(order)) return order;
    const delivery = byOrder.get(String(order.id));
    if (!delivery) return order;

    const recordStatus = lower(delivery.statut || delivery.status || '');
    const mode = lower(delivery.mode_livraison || delivery.fulfillment_mode || '');
    let commercial = '';
    if (['livree', 'livre', 'livré', 'delivered'].includes(recordStatus) || mode === 'livraison') commercial = 'livre';
    else if (['recupere', 'récupéré', 'pickup', 'retrait'].includes(recordStatus) || ['recupere', 'récupéré', 'pickup', 'retrait'].includes(mode)) commercial = 'recupere';
    else if (mode) commercial = mode;

    if (!commercial) return order;
    return {
      ...order,
      statut_livraison: commercial,
      delivery_status: commercial,
      status_livraison: commercial,
      fulfillment_mode: order.fulfillment_mode || commercial,
    };
  });
}

export function enrichOrdersWithInvoices(orders = [], invoices = []) {
  const byOrder = new Map();
  arr(invoices).forEach((row) => {
    const id = String(row.order_id || row.sale_id || row.source_record_id || '');
    if (id) byOrder.set(id, row);
  });

  return arr(orders).map((order) => {
    if (isInvoiced(order)) return order;
    const invoice = byOrder.get(String(order.id));
    if (!invoice) return order;
    return {
      ...order,
      invoice_id: invoice.id,
      facture_id: invoice.id,
      numero_facture: invoice.numero_facture || invoice.number,
      invoice_status: invoice.invoice_status || invoice.statut || 'emise',
      statut_facture: invoice.statut_facture || invoice.statut || 'emise',
      facture_emise: true,
    };
  });
}

export function enrichCommercialOrders(orders = [], { deliveries = [], invoices = [] } = {}) {
  return enrichOrdersWithInvoices(enrichOrdersWithDeliveries(orders, deliveries), invoices);
}

/** Vente clôturée = payée + livrée (ou statut terminal). */
export function isSaleClosed(order = {}, payments = []) {
  if (['cloture', 'clôture', 'annule', 'annulé'].includes(lower(order.statut_commande || order.status))) return true;
  const linked = linkedPaymentsForOrders([order], payments);
  return remainingForOrder(order, linked) <= 0 && isDelivered(order);
}

/** Encaissé lié aux commandes (évite double comptage montant_paye + lignes paiement). */
export function collectedFromOrders(orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  return arr(orders).reduce((sum, order) => sum + paidForOrder(order, linked), 0);
}

export function receivableFromOrders(orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  return arr(orders).reduce((sum, order) => sum + remainingForOrder(order, linked), 0);
}

export function isPaymentClosed(order = {}, payments = []) {
  const linked = linkedPaymentsForOrders([order], payments);
  return remainingForOrder(order, linked) <= 0;
}

export function openSalesCount(orders = [], payments = []) {
  return arr(orders).filter((order) => !isSaleClosed(order, payments)).length;
}

export function openPaymentCount(orders = [], payments = []) {
  return arr(orders).filter((order) => isPaymentClosed(order, payments) === false && saleAmount(order) > 0).length;
}

export function buildCommercialCoherenceRows(orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const rows = [];
  arr(orders).forEach((order) => {
    const total = saleAmount(order);
    if (total <= 0 || isSaleClosed(order, linked)) return;
    const rest = remainingForOrder(order, linked);
    const name = order.client_nom || order.customer_name || order.client_label || order.client_id || 'Client';
    if (rest > 0) {
      rows.push({ id: `unpaid-${order.id}`, orderId: order.id, type: 'impaye', title: `${name} — impayé`, detail: `Reste ${fmtCurrency(rest)}`, value: rest, finding: { id: `coh-sale-unpaid-${order.id}`, module: 'commercial', severity: 'haute', auto_action: 'create_task', title: `Vente sans paiement complet : ${name}`, description: `Reste ${rest} FCFA`, recommended_action: 'Encaisser ou créer tâche de relance', confidence_score: 0.92 } });
    }
    if (invoiceRequired(order) && !isInvoiced(order)) {
      rows.push({ id: `noinv-${order.id}`, orderId: order.id, type: 'facture', title: `Vente ${order.id} sans facture`, detail: name, finding: { id: `coh-sale-no-invoice-${order.id}`, module: 'commercial', severity: 'moyenne', auto_action: 'create_alert', title: `Vente sans facture : ${order.id}`, description: 'Facture non émise', recommended_action: 'Créer facture manquante', confidence_score: 0.88 } });
    }
    if (!isDelivered(order)) {
      rows.push({ id: `nodel-${order.id}`, orderId: order.id, type: 'livraison', title: `Vente ${order.id} sans livraison`, detail: name, finding: { id: `coh-sale-no-delivery-${order.id}`, module: 'commercial', severity: 'moyenne', auto_action: 'create_task', title: `Vente sans livraison : ${order.id}`, description: 'Livraison non confirmée', recommended_action: 'Mettre à jour le statut livraison', confidence_score: 0.85 } });
    }
  });
  return rows;
}

export function aggregateClientReceivables(orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const map = {};
  arr(orders).forEach((order) => {
    const rest = remainingForOrder(order, linked);
    if (rest <= 0) return;
    const clientId = String(order.client_id || order.customer_id || '').trim();
    const key = clientId || `name:${order.client_nom || order.customer_name || order.client_label || 'Client'}`;
    const name = order.client_nom || order.customer_name || order.client_label || clientId || 'Client';
    if (!map[key]) map[key] = { name, total: 0, orders: [], clientId: clientId || null };
    map[key].total += rest;
    map[key].orders.push(order.id);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

/** Top clients par client_id (fallback nom si passage). */
export function buildTopClients(orders = [], clients = [], limit = 5) {
  const namesById = {};
  arr(clients).forEach((client) => {
    namesById[String(client.id)] = client.nom || client.name || client.raison_sociale || client.id;
  });
  const totals = {};
  const labels = {};
  arr(orders).forEach((order) => {
    const amount = saleAmount(order);
    if (amount <= 0) return;
    const clientId = String(order.client_id || order.customer_id || '').trim();
    const key = clientId || `walkin:${String(order.client_nom || order.customer_name || order.client_label || 'passage').toLowerCase()}`;
    totals[key] = (totals[key] || 0) + amount;
    labels[key] = clientId
      ? (namesById[clientId] || order.client_nom || order.customer_name || clientId)
      : (order.client_nom || order.customer_name || 'Client passage');
  });
  return Object.entries(totals)
    .map(([key, total]) => ({ id: key, name: labels[key], total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function clientsWithReceivableCount(orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const ids = new Set();
  arr(orders).forEach((order) => {
    if (remainingForOrder(order, linked) <= 0) return;
    const clientId = String(order.client_id || order.customer_id || '').trim();
    ids.add(clientId || `name:${order.client_nom || order.customer_name || order.client_label || order.id}`);
  });
  return ids.size;
}

const cleanStr = (value = '') => String(value || '').trim();
const orderClientId = (row = {}) => cleanStr(row.client_id || row.customer_id || row.client);
const saleDateOf = (row = {}) => cleanStr(row.date || row.date_vente || row.order_date || row.created_at).slice(0, 10);
const clientNameOf = (client = {}) => cleanStr(client.nom || client.name || client.raison_sociale || client.id || 'Client');

/** Ledger client : CA, payé, reste — source unique salesStatuses. */
export function buildClientLedger(clients = [], orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const rows = arr(clients).map((client) => {
    const id = cleanStr(client.id);
    const clientOrders = arr(orders).filter((order) => saleBelongsToClient(order, client));
    const ca = clientOrders.reduce((sum, order) => sum + saleAmount(order), 0);
    const paid = clientOrders.reduce((sum, order) => sum + paidForOrder(order, linked), 0);
    const remaining = clientOrders.reduce((sum, order) => sum + remainingForOrder(order, linked), 0);
    const lastSale = clientOrders.map(saleDateOf).filter(Boolean).sort().reverse()[0] || '';
    return { client, id, name: clientNameOf(client), orders: clientOrders.length, ca, paid, remaining, lastSale };
  }).sort((a, b) => b.remaining - a.remaining || b.ca - a.ca);
  const walkInOrders = arr(orders).filter(isWalkInOrder);
  return { rows, walkInOrders };
}

/** Une ligne par vente — uniquement les blocages réels (pas les ventes clôturées). */
export function buildSummaryTodos(orders = [], payments = [], _healthFindings = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const items = arr(orders).map((order) => {
    const total = saleAmount(order);
    if (total <= 0) return null;
    if (isSaleClosed(order, linked)) return null;

    const rest = remainingForOrder(order, linked);
    const issues = [];
    if (rest > 0) issues.push('encaissement');
    if (!isDelivered(order)) issues.push('livraison');
    if (invoiceRequired(order) && !isInvoiced(order)) issues.push('facture');
    if (!issues.length) return null;

    const client = order.client_label || order.client_name || order.client_nom || 'Client';
    const label = order.product_name || order.produit || order.id;
    const priority = (rest > 0 ? 100 : 0) + (!isDelivered(order) ? 20 : 0) + (!isInvoiced(order) ? 10 : 0) + rest;
    return {
      id: order.id,
      orderId: order.id,
      title: issues.includes('facture') && issues.length === 1 ? `Facture absente : ${order.id}` : label,
      client,
      detail: `${client} · ${issues.map((i) => (i === 'encaissement' ? `reste ${fmtCurrency(rest)}` : i === 'facture' ? 'sans facture' : 'à livrer')).join(' · ')}`,
      issues,
      rest,
      priority,
      tab: rest > 0 ? 'Clients' : 'Ventes',
    };
  }).filter(Boolean);

  return items.sort((a, b) => b.priority - a.priority);
}

/** Compte les ventes uniques à traiter (évite double comptage todo). */
export function uniqueTodoCount({ orders = [], payments = [], healthFindings = [] }) {
  const todos = buildSummaryTodos(orders, payments, healthFindings);
  const saleIds = new Set(todos.filter((t) => t.orderId).map((t) => t.orderId));
  const extra = todos.filter((t) => !t.orderId).length;
  return saleIds.size + extra;
}
