import { paidForOrder, remainingForOrder } from '../utils/salesStatuses.js';
import { linkedPaymentsForOrders, saleAmount } from '../modules/commercial/commercialMetrics.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amount = (row = {}) => saleAmount(row) || num(row.montant_total ?? row.total_ttc ?? row.total_amount ?? row.total ?? row.amount ?? row.montant ?? 0);
const paymentAmount = (row = {}) => num(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const paymentOrderId = (row = {}) => row.order_id || row.sale_id || row.source_record_id || row.related_id;

function clientName(client = {}) {
  return client.nom || client.name || client.raison_sociale || client.full_name || client.id || 'Client';
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function orderDate(order = {}) {
  return order.date || order.created_at || order.date_commande || '';
}

function frequencyLabelFromInterval(days) {
  if (days == null) return 'Prospect';
  if (days <= 7) return 'Hebdomadaire';
  if (days <= 14) return 'Bi-hebdomadaire';
  if (days <= 28) return 'Mensuelle';
  if (days <= 60) return 'Bimestrielle';
  if (days <= 120) return 'Trimestrielle';
  return 'Occasionnelle';
}

/** Fréquence d'achat à partir de l'historique commandes (dates). */
export function computePurchaseFrequency(orders = []) {
  const dates = arr(orders)
    .map((order) => orderDate(order))
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);

  const orderCount = dates.length;
  if (!orderCount) {
    return {
      orderCount: 0,
      averageIntervalDays: null,
      ordersPerMonth: 0,
      frequencyLabel: 'Prospect',
      isDueForReorder: false,
      daysOverdue: 0,
    };
  }

  if (orderCount === 1) {
    const inactivityDays = daysSince(dates[0]);
    const overdue = inactivityDays !== null && inactivityDays > 30 ? inactivityDays - 30 : 0;
    return {
      orderCount: 1,
      averageIntervalDays: null,
      ordersPerMonth: 0,
      frequencyLabel: 'Première commande',
      isDueForReorder: overdue > 0,
      daysOverdue: overdue,
    };
  }

  const intervals = [];
  for (let index = 1; index < dates.length; index += 1) {
    intervals.push(Math.max(1, Math.round((dates[index] - dates[index - 1]) / 86400000)));
  }
  const averageIntervalDays = Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length);
  const lastOrderDate = dates[dates.length - 1];
  const inactivityDays = daysSince(lastOrderDate);
  const ordersPerMonth = averageIntervalDays > 0 ? Math.round((30 / averageIntervalDays) * 10) / 10 : 0;
  const threshold = Math.max(7, Math.round(averageIntervalDays * 0.85));
  const isDueForReorder = inactivityDays !== null && inactivityDays >= threshold;
  const daysOverdue = isDueForReorder ? inactivityDays - threshold : 0;

  return {
    orderCount,
    averageIntervalDays,
    ordersPerMonth,
    frequencyLabel: frequencyLabelFromInterval(averageIntervalDays),
    isDueForReorder,
    daysOverdue,
    lastOrderDate,
  };
}

function clientChannel(client = {}) {
  const raw = norm(`${client.type || ''} ${client.type_client || ''} ${client.segment || ''} ${client.categorie || ''} ${client.nom || ''} ${client.notes || ''} ${client.prefs || ''}`);
  if (raw.includes('boucher')) return 'Boucher';
  if (raw.includes('restaurant')) return 'Restaurant';
  if (raw.includes('hotel')) return 'Hôtel';
  if (raw.includes('patisserie')) return 'Pâtisserie';
  if (raw.includes('boutique')) return 'Boutique';
  if (raw.includes('dahira')) return 'Dahira';
  if (raw.includes('foirail')) return 'Foirail';
  if (raw.includes('revendeur')) return 'Revendeur';
  if (raw.includes('consommateur') || raw.includes('particulier')) return 'Consommateur direct';
  if (raw.includes('touba') || raw.includes('bernde') || raw.includes('berndé')) return 'Touba / Berndé';
  return client.type || client.type_client || 'À qualifier';
}

function matchClientOrders(client = {}, salesOrders = []) {
  const id = String(client.id || '');
  const name = norm(clientName(client));
  return arr(salesOrders).filter((order) => {
    const status = norm(order.statut || order.status || order.statut_commande || '');
    if (['annule', 'annulee', 'cancelled'].includes(status)) return false;
    return String(order.client_id || '') === id || norm(order.client_nom || order.client_name || '').includes(name);
  });
}

function matchPayments(client = {}, orders = [], payments = []) {
  const orderIds = new Set(orders.map((order) => String(order.id || '')));
  const id = String(client.id || '');
  const name = norm(clientName(client));
  return arr(payments).filter((payment) => {
    const status = norm(payment.statut || payment.status || 'paye');
    if (['annule', 'annulee', 'cancelled', 'rejete', 'rejetee'].includes(status)) return false;
    return orderIds.has(String(paymentOrderId(payment) || '')) || String(payment.client_id || '') === id || norm(payment.client_nom || payment.client_name || '').includes(name);
  });
}

export function buildClientSegment(client = {}, dataMap = {}) {
  const orders = matchClientOrders(client, dataMap.sales_orders || dataMap.salesOrders || []);
  const allPayments = dataMap.payments || [];
  const linked = linkedPaymentsForOrders(orders, allPayments);
  const payments = matchPayments(client, orders, allPayments);
  const ca = orders.reduce((sum, order) => sum + amount(order), 0);
  const paidTotal = orders.reduce((sum, order) => sum + paidForOrder(order, linked), 0);
  const receivable = orders.reduce((sum, order) => sum + remainingForOrder(order, linked), 0);
  const lastOrder = [...orders].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))[0];
  const lastOrderDate = lastOrder?.date || lastOrder?.created_at || client.derniereCommande || client.derniere_commande;
  const inactivityDays = daysSince(lastOrderDate);
  const orderCount = orders.length;
  const purchaseFrequency = computePurchaseFrequency(orders);
  const averageBasket = orderCount ? ca / orderCount : 0;
  const paymentRate = ca > 0 ? Math.round((paidTotal / ca) * 100) : 0;
  const channel = clientChannel(client);

  let segment = 'Prospect';
  if (receivable > 0 && paymentRate < 70) segment = 'À risque paiement';
  else if (receivable > 0) segment = 'À relancer';
  else if (ca >= 1000000 || orderCount >= 8) segment = 'VIP / Gros acheteur';
  else if (ca > 0 && paymentRate >= 95) segment = 'Bon payeur';
  else if (inactivityDays !== null && inactivityDays > 60 && ca > 0) segment = 'Dormant';

  const loyaltyScore = Math.max(0, Math.min(100,
    (ca >= 1000000 ? 28 : ca >= 300000 ? 18 : ca > 0 ? 10 : 0) +
    Math.min(20, orderCount * 3) +
    Math.min(20, purchaseFrequency.ordersPerMonth * 6) +
    Math.min(25, paymentRate / 4) +
    (inactivityDays === null ? 5 : inactivityDays <= 30 ? 18 : inactivityDays <= 60 ? 10 : 0) -
    (receivable > 0 ? 12 : 0) -
    (purchaseFrequency.isDueForReorder ? 8 : 0)
  ));

  const action = (() => {
    if (segment === 'À risque paiement') return 'Bloquer le crédit, relancer paiement et proposer paiement partiel.';
    if (segment === 'À relancer') return 'Relancer la créance et proposer une nouvelle commande après paiement.';
    if (segment === 'VIP / Gros acheteur') return 'Sécuriser précommandes, tarifs préférentiels et appels avant pics.';
    if (segment === 'Bon payeur') return purchaseFrequency.isDueForReorder
      ? 'Client régulier en retard de commande : proposer renouvellement maintenant.'
      : 'Fidéliser avec offre récurrente et priorité disponibilité.';
    if (segment === 'Dormant') return 'Réactiver avec message personnalisé et offre de retour.';
    return 'Qualifier besoin, canal, volume et période d’achat.';
  })();

  return {
    id: client.id,
    name: clientName(client),
    channel,
    segment,
    ca,
    paid: paidTotal,
    receivable,
    orderCount,
    averageBasket,
    paymentRate,
    lastOrderDate,
    inactivityDays,
    ...purchaseFrequency,
    loyaltyScore: Math.round(loyaltyScore),
    action,
  };
}

export function buildClientSegmentation(rows = [], dataMap = {}) {
  const segments = arr(rows).map((client) => buildClientSegment(client, dataMap));
  const bySegment = segments.reduce((acc, row) => {
    acc[row.segment] = acc[row.segment] || [];
    acc[row.segment].push(row);
    return acc;
  }, {});
  const byChannel = segments.reduce((acc, row) => {
    acc[row.channel] = acc[row.channel] || [];
    acc[row.channel].push(row);
    return acc;
  }, {});
  return {
    segments,
    bySegment,
    byChannel,
    totals: {
      clients: segments.length,
      vip: (bySegment['VIP / Gros acheteur'] || []).length,
      receivableClients: segments.filter((row) => row.receivable > 0).length,
      dormant: (bySegment.Dormant || []).length,
      prospects: (bySegment.Prospect || []).length,
      ca: segments.reduce((sum, row) => sum + row.ca, 0),
      receivables: segments.reduce((sum, row) => sum + row.receivable, 0),
    },
  };
}

export default buildClientSegmentation;
