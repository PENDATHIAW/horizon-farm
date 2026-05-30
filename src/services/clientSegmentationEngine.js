const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total_amount ?? row.total ?? row.amount ?? row.montant ?? 0);
const paid = (row = {}) => num(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? 0);
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
  const payments = matchPayments(client, orders, dataMap.payments || []);
  const ca = orders.reduce((sum, order) => sum + amount(order), 0);
  const paidFromOrders = orders.reduce((sum, order) => sum + paid(order), 0);
  const paidFromPayments = payments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const paidTotal = Math.min(ca, Math.max(paidFromOrders, paidFromPayments));
  const receivable = Math.max(0, ca - paidTotal);
  const lastOrder = [...orders].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))[0];
  const lastOrderDate = lastOrder?.date || lastOrder?.created_at || client.derniereCommande || client.derniere_commande;
  const inactivityDays = daysSince(lastOrderDate);
  const orderCount = orders.length;
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
    Math.min(25, orderCount * 4) +
    Math.min(25, paymentRate / 4) +
    (inactivityDays === null ? 5 : inactivityDays <= 30 ? 18 : inactivityDays <= 60 ? 10 : 0) -
    (receivable > 0 ? 12 : 0)
  ));

  const action = (() => {
    if (segment === 'À risque paiement') return 'Bloquer le crédit, relancer paiement et proposer paiement partiel.';
    if (segment === 'À relancer') return 'Relancer la créance et proposer une nouvelle commande après paiement.';
    if (segment === 'VIP / Gros acheteur') return 'Sécuriser précommandes, tarifs préférentiels et appels avant pics.';
    if (segment === 'Bon payeur') return 'Fidéliser avec offre récurrente et priorité disponibilité.';
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
