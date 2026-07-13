/**
 * Commercial V3 — segmentation clients (grossistes, restaurants, etc.).
 */

import { saleAmount, receivableFromOrders } from '../modules/commercial/commercialMetrics.js';
import { rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);

const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export const CLIENT_SEGMENTS = [
  { key: 'particulier', label: 'Particuliers', matchers: ['particulier', 'passage', 'detail', 'détail'] },
  { key: 'restaurant', label: 'Restaurants', matchers: ['restaurant', 'resto', 'traiteur', 'cantine'] },
  { key: 'boutique', label: 'Boutiques', matchers: ['boutique', 'epicerie', 'épicerie', 'commerce'] },
  { key: 'supermarche', label: 'Supermarchés', matchers: ['supermarche', 'supermarché', 'grande surface', 'hypermarché'] },
  { key: 'grossiste', label: 'Grossistes', matchers: ['grossiste', 'revendeur', 'distributeur', 'wholesale'] },
  { key: 'revendeur', label: 'Revendeurs', matchers: ['revendeur', 'revendeurs'] },
  { key: 'hotel', label: 'Hôtels', matchers: ['hotel', 'hôtel', 'hebergement'] },
  { key: 'autre', label: 'Autres', matchers: [] },
];

export function resolveClientSegment(client = {}) {
  const text = lower([
    client.type_client,
    client.type,
    client.segment,
    client.commercial_terms?.price_tier,
    client.commercial_terms?.segment,
    client.prefs,
    client.nom,
  ].filter(Boolean).join(' '));

  const found = CLIENT_SEGMENTS.find((seg) => seg.key !== 'autre' && seg.matchers.some((m) => text.includes(m)));
  return found || CLIENT_SEGMENTS.find((s) => s.key === 'autre');
}

export function buildClientSegmentStats({
  clients = [],
  orders = [],
  payments = [],
  relanceRows = [],
} = {}) {

  const stats = {};

  CLIENT_SEGMENTS.forEach((seg) => {
    stats[seg.key] = {
      ...seg,
      clientCount: 0,
      ca: 0,
      receivable: 0,
      orderCount: 0,
      relanceCount: 0,
      basketAvg: 0,
      clients: [],
    };
  });

  arr(clients).forEach((client) => {
    const seg = resolveClientSegment(client);
    const bucket = stats[seg.key] || stats.autre;
    bucket.clientCount += 1;
    bucket.clients.push(client);
  });

  arr(orders).forEach((order) => {
    const client = arr(clients).find((c) => String(c.id) === String(order.client_id));
    const seg = resolveClientSegment(client || { type: order.client_label });
    const bucket = stats[seg.key] || stats.autre;
    bucket.ca += saleAmount(order);
    bucket.orderCount += 1;
  });

  Object.values(stats).forEach((bucket) => {
    const segClients = bucket.clients;
    bucket.receivable = receivableFromOrders(
      orders.filter((o) => segClients.some((c) => String(c.id) === String(o.client_id))),
      payments,
    );
    bucket.basketAvg = bucket.orderCount ? bucket.ca / bucket.orderCount : 0;
    bucket.relanceCount = arr(relanceRows).filter((r) => segClients.some((c) => String(c.id) === String(r.clientId))).length;
  });

  return Object.values(stats).filter((s) => s.clientCount > 0 || s.orderCount > 0);
}

export function buildFarmCommercialBreakdown(orders = []) {
  const byFarm = {};
  arr(orders).forEach((order) => {
    const farm = rowFarmId(order) || 'legacy';
    byFarm[farm] = (byFarm[farm] || 0) + saleAmount(order);
  });
  return byFarm;
}

export function topSegmentByCa(stats = []) {
  return [...stats].sort((a, b) => b.ca - a.ca)[0] || null;
}
