import { getYearRoundMarkets } from './horizonCommercialCalendar';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total);

function clientName(client = {}) {
  return client.nom || client.name || client.raison_sociale || client.full_name || client.telephone || client.id || 'Client à qualifier';
}

function clientType(client = {}) {
  const raw = norm(`${client.type_client || ''} ${client.segment || ''} ${client.categorie || ''} ${client.nom || ''} ${client.notes || ''}`);
  if (raw.includes('boucher')) return 'boucher';
  if (raw.includes('restaurant')) return 'restaurant';
  if (raw.includes('hotel') || raw.includes('hôtel')) return 'hotel';
  if (raw.includes('dahira')) return 'dahira';
  if (raw.includes('patisserie') || raw.includes('pâtisserie')) return 'patisserie';
  if (raw.includes('boutique')) return 'boutique';
  if (raw.includes('revendeur')) return 'revendeur';
  if (raw.includes('foirail')) return 'foirail';
  if (raw.includes('particulier') || raw.includes('consommateur')) return 'consommateur';
  return raw || 'non_qualifie';
}

function activityKeywords(activity) {
  return {
    oeufs: ['oeuf', 'œuf', 'tablette', 'patisserie', 'pâtisserie', 'boutique', 'restaurant', 'hotel'],
    poulets_chair: ['poulet', 'chair', 'restaurant', 'ceremonie', 'cérémonie', 'mariage', 'bapteme', 'baptême'],
    bovins: ['bovin', 'boeuf', 'bœuf', 'boucher', 'foirail', 'touba', 'bernde', 'berndé', 'dahira'],
    ovins: ['ovin', 'mouton', 'belier', 'bélier', 'boucher', 'foirail', 'touba', 'bernde', 'berndé', 'dahira', 'bapteme', 'baptême'],
    caprins: ['caprin', 'chevre', 'chèvre', 'bouc', 'boucher', 'marche', 'marché'],
    cultures: ['legume', 'légume', 'tomate', 'oignon', 'piment', 'gombo', 'restaurant', 'revendeur', 'marche', 'marché'],
    stock: ['boutique', 'revendeur', 'produit', 'stock'],
  }[activity] || [];
}

function scoreClientForActivity(client = {}, activity, sales = [], payments = []) {
  const raw = norm(`${clientName(client)} ${clientType(client)} ${client.notes || ''} ${client.activites_interessees || ''} ${client.activity_interest || ''}`);
  const keywords = activityKeywords(activity);
  const matchScore = keywords.some((keyword) => raw.includes(norm(keyword))) ? 35 : 0;
  const clientId = String(client.id || client.client_id || client.nom || '');
  const clientSales = sales.filter((sale) => String(sale.client_id || sale.client || sale.client_nom || sale.customer_id || '') === clientId || norm(sale.client_nom || sale.client_name || '').includes(norm(clientName(client))));
  const clientPayments = payments.filter((payment) => String(payment.client_id || payment.customer_id || '') === clientId || norm(payment.client_nom || payment.client_name || '').includes(norm(clientName(client))));
  const ca = clientSales.reduce((sum, sale) => sum + amount(sale), 0);
  const paid = clientPayments.reduce((sum, payment) => sum + amount(payment), 0);
  const paymentScore = ca > 0 ? Math.min(25, Math.round((paid / ca) * 25)) : 8;
  const volumeScore = Math.min(25, Math.round(ca / 100000));
  const freshnessScore = clientSales.length ? 15 : 5;
  return Math.max(0, Math.min(100, matchScore + paymentScore + volumeScore + freshnessScore));
}

function fallbackTargets(activity) {
  return getYearRoundMarkets(activity).slice(0, 5).map((channel, index) => ({
    id: `${activity}-${channel}`,
    name: channel,
    type: 'canal permanent',
    score: Math.max(55, 82 - index * 7),
    reason: 'Canal de vente permanent à qualifier dans le carnet d’adresses.',
    action: `Créer ou enrichir des contacts ${channel}`,
  }));
}

export function buildCommercialTargets(dataMap = {}, activity = 'global') {
  const clients = arr(dataMap.clients);
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders);
  const payments = arr(dataMap.payments);
  const scoredClients = clients.map((client) => ({
    id: client.id || clientName(client),
    name: clientName(client),
    type: clientType(client),
    score: scoreClientForActivity(client, activity, sales, payments),
    reason: `Profil ${clientType(client)} ${activityKeywords(activity).length ? 'compatible avec cette activité' : 'à qualifier'}.`,
    action: `Relancer / qualifier ${clientName(client)} pour ${activity}`,
  })).filter((client) => client.score >= 35).sort((a, b) => b.score - a.score).slice(0, 5);

  const targets = scoredClients.length ? scoredClients : fallbackTargets(activity);
  return {
    activity,
    targets,
    hasQualifiedClients: scoredClients.length > 0,
    recommendation: scoredClients.length
      ? 'Cibler les clients déjà qualifiés ou ayant un historique commercial.'
      : 'Carnet d’adresses insuffisant : commencer par créer/qualifier les contacts prioritaires.',
  };
}

export function buildAllCommercialTargets(dataMap = {}) {
  return ['oeufs', 'poulets_chair', 'bovins', 'ovins', 'caprins', 'cultures', 'stock'].reduce((acc, activity) => {
    acc[activity] = buildCommercialTargets(dataMap, activity);
    return acc;
  }, {});
}

export default buildCommercialTargets;
