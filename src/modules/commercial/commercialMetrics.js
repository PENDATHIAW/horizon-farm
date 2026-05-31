import { fmtCurrency } from '../../utils/format';
import { paidForOrder, remainingForOrder } from '../../utils/salesStatuses';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

export const saleAmount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.estimated_amount ?? row.montant_estime);

export const isWalkInOrder = (row = {}) => !row.client_id || lower(row.client_type) === 'passage';

export const isOpenOrder = (row = {}) => !['cloture', 'clôture', 'annule', 'annulé', 'termine', 'terminé'].includes(lower(row.statut_commande || row.status || row.statut));

export const isOpportunityOpen = (row = {}) => !['fermee', 'fermée', 'closed', 'gagnee', 'gagnée', 'perdue', 'en_conversion'].includes(lower(row.status || row.statut));

/** Retrait sur place = livré côté commercial. */
export const isDelivered = (row = {}) => ['livre', 'livré', 'delivered', 'termine', 'terminé', 'recupere', 'récupéré'].includes(lower(row.delivery_status || row.statut_livraison || row.status_livraison || row.fulfillment_mode || row.status || row.statut));

export const isInvoiced = (row = {}) => row.invoice_id || row.facture_id || ['facture', 'facturé', 'invoiced', 'emise', 'émise'].includes(lower(row.invoice_status || row.facture_status || row.status_facture));

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

export function openSalesCount(orders = [], payments = []) {
  return arr(orders).filter((order) => !isSaleClosed(order, payments)).length;
}

export function buildCommercialCoherenceRows(orders = [], payments = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const rows = [];
  arr(orders).forEach((order) => {
    const total = saleAmount(order);
    if (total <= 0) return;
    const rest = remainingForOrder(order, linked);
    const name = order.client_nom || order.customer_name || order.client_label || order.client_id || 'Client';
    if (rest > 0) {
      rows.push({ id: `unpaid-${order.id}`, orderId: order.id, type: 'impaye', title: `${name} — impayé`, detail: `Reste ${fmtCurrency(rest)}`, value: rest, finding: { id: `coh-sale-unpaid-${order.id}`, module: 'commercial', severity: 'haute', auto_action: 'create_task', title: `Vente sans paiement complet : ${name}`, description: `Reste ${rest} FCFA`, recommended_action: 'Encaisser ou créer tâche de relance', confidence_score: 0.92 } });
    }
    if (!isInvoiced(order)) {
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
    const clientOrders = arr(orders).filter((order) => orderClientId(order) === id);
    const ca = clientOrders.reduce((sum, order) => sum + saleAmount(order), 0);
    const paid = clientOrders.reduce((sum, order) => sum + paidForOrder(order, linked), 0);
    const remaining = clientOrders.reduce((sum, order) => sum + remainingForOrder(order, linked), 0);
    const lastSale = clientOrders.map(saleDateOf).filter(Boolean).sort().reverse()[0] || '';
    return { client, id, name: clientNameOf(client), orders: clientOrders.length, ca, paid, remaining, lastSale };
  }).sort((a, b) => b.remaining - a.remaining || b.ca - a.ca);
  const walkInOrders = arr(orders).filter(isWalkInOrder);
  return { rows, walkInOrders };
}

/** Une ligne par vente — regroupe impayé / facture / livraison. */
export function buildSummaryTodos(orders = [], payments = [], healthFindings = []) {
  const linked = linkedPaymentsForOrders(orders, payments);
  const items = arr(orders).map((order) => {
    const total = saleAmount(order);
    if (total <= 0) return null;
    const rest = remainingForOrder(order, linked);
    const issues = [];
    if (rest > 0) issues.push('encaissement');
    if (!isInvoiced(order)) issues.push('facture');
    if (!isDelivered(order)) issues.push('livraison');
    if (!issues.length) return null;
    const client = order.client_label || order.client_name || order.client_nom || 'Client';
    const label = order.product_name || order.produit || order.id;
    const priority = (rest > 0 ? 100 : 0) + (!isDelivered(order) ? 20 : 0) + (!isInvoiced(order) ? 10 : 0) + rest;
    return {
      id: order.id,
      orderId: order.id,
      title: label,
      client,
      detail: `${client} · ${issues.map((i) => (i === 'encaissement' ? `reste ${fmtCurrency(rest)}` : i === 'facture' ? 'sans facture' : 'à livrer')).join(' · ')}`,
      issues,
      rest,
      priority,
      tab: rest > 0 ? 'Clients' : 'Ventes',
    };
  }).filter(Boolean);

  arr(healthFindings).slice(0, 2).forEach((finding) => {
    items.push({
      id: finding.id,
      orderId: null,
      title: finding.title,
      client: '',
      detail: finding.recommended_action || finding.description || '',
      issues: ['ia'],
      rest: 0,
      priority: 50,
      tab: 'Ventes',
      finding,
    });
  });

  return items.sort((a, b) => b.priority - a.priority);
}

/** Compte les ventes uniques à traiter (évite double comptage todo). */
export function uniqueTodoCount({ orders = [], payments = [], healthFindings = [] }) {
  const todos = buildSummaryTodos(orders, payments, healthFindings);
  const saleIds = new Set(todos.filter((t) => t.orderId).map((t) => t.orderId));
  const extra = todos.filter((t) => !t.orderId).length;
  return saleIds.size + extra;
}
