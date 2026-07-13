import { buildClientSegment, computePurchaseFrequency } from '../../services/clientSegmentationEngine';
import { fmtCurrency } from '../../utils/format';
import { saleAmount } from './commercialMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clientName = (c = {}) => c.nom || c.name || c.raison_sociale || c.id || 'Client';

const PRODUCT_HINTS = [
  { keys: ['poulet', 'chair', 'poulets', 'volaille', 'avicole'], channels: ['restaurant', 'boucher', 'revendeur', 'foirail', 'marche'], types: ['restaurant', 'boucher', 'revendeur'] },
  { keys: ['oeuf', 'oeufs', 'plateau', 'pondeuse'], channels: ['restaurant', 'patisserie', 'boutique', 'hotel'], types: ['restaurant', 'patisserie', 'boutique'] },
  { keys: ['bovin', 'boeuf', 'viande', 'bov'], channels: ['boucher', 'restaurant', 'revendeur'], types: ['boucher', 'restaurant'] },
  { keys: ['tomate', 'legume', 'culture', 'maraicher'], channels: ['restaurant', 'marche', 'revendeur', 'boutique'], types: ['restaurant', 'marche', 'revendeur'] },
];

function opportunityText(opp = {}) {
  return norm([opp.title, opp.libelle, opp.product_name, opp.reason, opp.notes, opp.source_type].join(' '));
}

function clientText(client = {}, segment = {}) {
  return norm([client.type, client.type_client, client.prefs, client.notes, segment.channel, segment.segment].join(' '));
}

function productHintFor(text = '') {
  return PRODUCT_HINTS.find((hint) => hint.keys.some((key) => text.includes(key))) || null;
}

function ordersForClient(client = {}, salesOrders = []) {
  const id = String(client.id || '');
  const name = norm(clientName(client));
  return arr(salesOrders).filter((order) => String(order.client_id || '') === id || norm(order.client_nom || order.client_name || '').includes(name));
}

function orderProductText(order = {}) {
  const lines = arr(order.lines || order.items || order.lignes);
  const lineText = lines.map((line) => [line.product_name, line.produit, line.designation, line.libelle].filter(Boolean).join(' ')).join(' ');
  return norm([order.product_name, order.produit, order.designation, lineText, order.notes].join(' '));
}

function productOrdersForClient(client = {}, salesOrders = [], hint = null) {
  const orders = ordersForClient(client, salesOrders);
  if (!hint) return orders;
  return orders.filter((order) => hint.keys.some((key) => orderProductText(order).includes(key)));
}

/** Score 0–100 : adéquation client ↔ opportunité. */
export function scoreClientForOpportunity(client = {}, opportunity = {}, salesOrders = []) {
  if (opportunity.client_id && String(opportunity.client_id) === String(client.id)) return 100;

  const segment = buildClientSegment(client, { sales_orders: salesOrders });
  const oppText = opportunityText(opportunity);
  const cText = clientText(client, segment);
  const hint = productHintFor(oppText);
  let score = 20;

  if (hint) {
    if (hint.channels.some((ch) => cText.includes(ch))) score += 35;
    if (hint.types.some((t) => cText.includes(t))) score += 25;
    if (hint.keys.some((k) => cText.includes(k))) score += 15;
  }

  const orders = ordersForClient(client, salesOrders);
  const productOrders = productOrdersForClient(client, salesOrders, hint);
  const globalFrequency = computePurchaseFrequency(orders);
  const productFrequency = computePurchaseFrequency(productOrders.length >= 2 ? productOrders : orders);

  if (orders.length > 0) score += Math.min(12, orders.length * 2);
  if (productOrders.length >= 2) score += Math.min(18, productOrders.length * 3);

  if (productFrequency.frequencyLabel === 'Hebdomadaire' || productFrequency.frequencyLabel === 'Bi-hebdomadaire') score += 18;
  else if (productFrequency.frequencyLabel === 'Mensuelle') score += 14;
  else if (productFrequency.frequencyLabel === 'Bimestrielle') score += 8;

  if (productFrequency.isDueForReorder) {
    score += Math.min(22, 12 + Math.floor((productFrequency.daysOverdue || 0) / 7) * 2);
  } else if (globalFrequency.isDueForReorder && hint) {
    score += 10;
  }

  if (productFrequency.frequencyLabel === 'Occasionnelle' && !productFrequency.isDueForReorder) score -= 8;

  if (segment.segment === 'VIP / Gros acheteur') score += 20;
  else if (segment.segment === 'Bon payeur') score += 12;
  else if (segment.segment === 'Dormant') score -= 15;
  else if (segment.segment === 'À risque paiement') score -= 25;
  if (segment.receivable > 0) score -= 8;

  return Math.max(0, Math.min(100, score));
}

export function matchOpportunityToClients(opportunity = {}, clients = [], salesOrders = []) {
  if (opportunity.client_id) {
    const client = arr(clients).find((row) => String(row.id) === String(opportunity.client_id));
    if (client) {
      return { mode: 'single', clients: [client], label: clientName(client), scores: [{ client, score: 100 }] };
    }
  }

  const scored = arr(clients)
    .map((client) => ({ client, score: scoreClientForOpportunity(client, opportunity, salesOrders), segment: buildClientSegment(client, { sales_orders: salesOrders }) }))
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { mode: 'none', clients: [], label: 'Clients à cibler manuellement', scores: [] };
  }

  if (scored.length >= Math.max(3, Math.ceil(clients.length * 0.85))) {
    return { mode: 'all', clients: scored.map((r) => r.client), label: `Tous les clients (${scored.length})`, scores: scored };
  }

  if (scored.length === 1 || scored[0].score - (scored[1]?.score || 0) >= 18) {
    return { mode: 'single', clients: [scored[0].client], label: clientName(scored[0].client), scores: scored };
  }

  const names = scored.slice(0, 3).map((r) => clientName(r.client));
  const extra = scored.length > 3 ? ` +${scored.length - 3}` : '';
  return { mode: 'multiple', clients: scored.map((r) => r.client), label: `${names.join(', ')}${extra}`, scores: scored };
}

export function opportunitiesForClient(client = {}, opportunities = [], salesOrders = [], minScore = 50) {
  return arr(opportunities)
    .map((opp) => ({ opportunity: opp, score: scoreClientForOpportunity(client, opp, salesOrders) }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function opportunityMessageForClient(opportunity = {}, client = {}) {
  const product = opportunity.title || opportunity.libelle || opportunity.product_name || 'une disponibilité Horizon Farm';
  const value = saleAmount(opportunity) || opportunity.estimated_value || opportunity.montant_estime;
  const reason = opportunity.reason ? ` ${opportunity.reason}` : '';
  return `Bonjour ${clientName(client)}, nous avons : ${product}.${reason}${value ? ` Estimation : ${fmtCurrency(value)}.` : ''} Êtes-vous intéressé(e) ? - Horizon Farm`;
}

export function relanceMessageForClient(client = {}, summary = {}) {
  const name = clientName(client);
  if (summary.resteAPayer > 0) {
    return `Bonjour ${name}, sauf erreur, il reste ${fmtCurrency(summary.resteAPayer)} à régler sur vos commandes Horizon Farm. Merci de nous indiquer quand vous pourrez régler.`;
  }
  return `Bonjour ${name}, nous souhaitons reprendre contact avec vous. Souhaitez-vous renouveler une commande Horizon Farm ?`;
}
