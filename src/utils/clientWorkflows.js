import { toNumber } from './format';
import { makeId } from './ids';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export const clientName = (client = {}) => client.nom || client.name || client.raison_sociale || client.id || 'Client';
export const clientReceivableKey = (client = {}) => `client_receivable:${client.id}`;
export const saleTotal = (sale = {}) => toNumber(sale.montant_total || sale.total || sale.total_amount || sale.amount || (toNumber(sale.quantity || sale.quantite) * toNumber(sale.unit_price || sale.prix_unitaire)));
export const paymentValue = (payment = {}) => toNumber(payment.montant || payment.amount || payment.montant_paye || payment.paid_amount);
export const paymentOrderId = (payment = {}) => String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || payment.commande_id || '');
const paymentClientId = (payment = {}) => lower(payment.client_id || payment.customer_id || payment.client || payment.client_label || payment.client_name);

function clientKeys(client = {}) {
  return [client.id, client.name, client.nom, client.client_label, client.phone, client.telephone, client.tel, client.whatsapp]
    .map((value) => lower(value))
    .filter(Boolean);
}

function saleClientKeys(sale = {}) {
  return [sale.client_id, sale.clientId, sale.client_label, sale.client_name, sale.customer_name, sale.telephone, sale.phone]
    .map((value) => lower(value))
    .filter(Boolean);
}

export function saleBelongsToClient(sale = {}, client = {}) {
  const cKeys = clientKeys(client);
  const sKeys = saleClientKeys(sale);
  return cKeys.some((key) => sKeys.includes(key));
}

export function paidForSale(sale = {}, payments = []) {
  const linked = arr(payments)
    .filter((payment) => paymentOrderId(payment) === String(sale.id))
    .reduce((sum, payment) => sum + paymentValue(payment), 0);
  return Math.max(toNumber(sale.montant_paye || sale.paid_amount || sale.amount_paid), linked);
}

export function buildClientSalesSummary(client = {}, salesOrders = [], payments = []) {
  const orders = arr(salesOrders).filter((order) => saleBelongsToClient(order, client) && !['annule', 'annulé', 'cancelled'].includes(lower(order.statut || order.status || order.statut_commande)));
  const orderIds = new Set(orders.map((order) => String(order.id)).filter(Boolean));
  const clientIds = clientKeys(client);
  const clientPayments = arr(payments).filter((payment) => {
    const orderId = paymentOrderId(payment);
    return (orderId && orderIds.has(orderId)) || clientIds.includes(paymentClientId(payment));
  });
  const enrichedOrders = orders.map((order) => {
    const total = saleTotal(order);
    const paid = Math.min(total, paidForSale(order, payments));
    const remaining = Math.max(0, total - paid);
    return { ...order, total, paid, remaining, paymentStatus: remaining <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye' };
  });
  const totalAchete = enrichedOrders.reduce((sum, order) => sum + order.total, 0);
  const totalPaye = enrichedOrders.reduce((sum, order) => sum + order.paid, 0);
  const resteAPayer = enrichedOrders.reduce((sum, order) => sum + order.remaining, 0);
  return {
    orders: enrichedOrders,
    openOrders: enrichedOrders.filter((order) => order.remaining > 0),
    clientPayments,
    totalAchete,
    totalPaye,
    resteAPayer,
    averageBasket: enrichedOrders.length ? totalAchete / enrichedOrders.length : 0,
    derniereCommandeVente: enrichedOrders
      .map((order) => order.date || order.created_at || order.order_date || order.sale_date)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
    status: resteAPayer > 0 ? 'a_relancer' : totalAchete > 0 ? 'a_jour' : (client.statut || 'prospect'),
  };
}

export function normalizeClientFromSales(client = {}, salesOrders = [], payments = []) {
  const summary = buildClientSalesSummary(client, salesOrders, payments);
  return {
    ...client,
    total_ventes: summary.totalAchete,
    total_paye: summary.totalPaye,
    creance_reelle: summary.resteAPayer,
    reste_a_payer: summary.resteAPayer,
    dette: summary.resteAPayer,
    statut: summary.status,
    status: summary.status,
    relance_requise: summary.resteAPayer > 0,
    relance_reason: summary.resteAPayer > 0 ? `Reste à encaisser: ${summary.resteAPayer}` : '',
  };
}

export function canDeleteClient(client = {}, salesOrders = []) {
  return !arr(salesOrders).some((sale) => saleBelongsToClient(sale, client));
}

export function buildClientReminderFollowUp(client = {}, summary = buildClientSalesSummary(client)) {
  if (toNumber(summary.resteAPayer) <= 0) return null;
  const key = clientReceivableKey(client);
  const taskId = makeId('TSK');
  const message = `Reste à encaisser ${summary.resteAPayer} FCFA pour ${clientName(client)}.`;
  return {
    key,
    task: {
      id: taskId,
      title: `Relancer ${clientName(client)}`,
      module_lie: 'clients',
      related_id: client.id,
      due_date: today(),
      priority: 'haute',
      status: 'a_faire',
      source_module: 'clients',
      source_record_id: client.id,
      task_dedupe_key: key,
      action_key: key,
      notes: message,
    },
    alert: {
      id: makeId('ALT'),
      title: `Client à relancer: ${clientName(client)}`,
      message,
      module_source: 'clients',
      entity_type: 'client',
      entity_id: client.id,
      severity: 'warning',
      status: 'nouvelle',
      action_recommandee: 'Contacter le client puis enregistrer le paiement.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'relance_client_preparee',
      module_source: 'clients',
      entity_type: 'client',
      entity_id: client.id,
      title: `Relance client ${clientName(client)}`,
      description: message,
      event_date: today(),
      severity: 'warning',
      linked_task_id: taskId,
      amount: summary.resteAPayer,
    },
  };
}
