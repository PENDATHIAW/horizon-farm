/**
 * Commercial V1 — segmentation clients IA (meilleurs, à risque, inactifs, silencieux).
 */

import { buildClientSegmentation, buildClientSegment } from './clientSegmentationEngine.js';
import { buildClientSalesSummary } from '../utils/clientWorkflows.js';
import { saleAmount, linkedPaymentsForOrders } from '../modules/commercial/commercialMetrics.js';
import { isQuoteOrder } from '../utils/commercialQuoteWorkflow.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

function clientName(c = {}) {
  return c.nom || c.name || c.id || 'Client';
}

function daysSince(dateStr = '') {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function detectSilentActiveClients(clients = [], orders = [], payments = [], { silenceDays = 21 } = {}) {
  const sales = arr(orders).filter((o) => !isQuoteOrder(o));
  const linked = linkedPaymentsForOrders(sales, payments);

  return arr(clients)
    .map((client) => {
      const clientOrders = sales.filter((o) => String(o.client_id) === String(client.id));
      const summary = buildClientSalesSummary(client, sales, linked);
      const segment = buildClientSegment(client, { sales_orders: orders, payments });
      const lastDate = clientOrders
        .map((o) => o.date || o.created_at)
        .filter(Boolean)
        .sort()
        .slice(-1)[0];
      const inactiveDays = daysSince(lastDate);
      const wasActive = clientOrders.length >= 3 || summary.totalAchete > 50000;
      const isSilent = inactiveDays != null && inactiveDays >= silenceDays;
      const habituallyActive = wasActive && segment.segment !== 'Dormant';

      if (!habituallyActive || !isSilent) return null;

      return {
        id: client.id,
        name: clientName(client),
        segment: segment.segment,
        lastOrderDate: lastDate,
        inactiveDays,
        totalPurchased: summary.totalAchete,
        signal: 'Client habituellement actif mais silencieux.',
        recommendedAction: 'Relance automatique avec disponibilités',
        autoRelance: true,
      };
    })
    .filter(Boolean);
}

export function buildCommercialClientSegmentationIA({
  clients = [],
  orders = [],
  payments = [],
} = {}) {
  const segmentation = buildClientSegmentation(clients, { sales_orders: orders, payments });
  const sales = arr(orders).filter((o) => !isQuoteOrder(o));

  const best = arr(segmentation)
    .filter((s) => /VIP|Gros|Bon payeur/.test(s.segment))
    .sort((a, b) => n(b.totalPurchased) - n(a.totalPurchased))
    .slice(0, 10)
    .map((s) => ({
      id: s.clientId,
      name: s.clientName,
      segment: s.segment,
      ca: n(s.totalPurchased),
      category: 'meilleur',
    }));

  const atRisk = arr(segmentation)
    .filter((s) => /risque|Impayé|Dormant/.test(s.segment) || n(s.receivable) > 0)
    .sort((a, b) => n(b.receivable) - n(a.receivable))
    .slice(0, 10)
    .map((s) => ({
      id: s.clientId,
      name: s.clientName,
      segment: s.segment,
      receivable: n(s.receivable),
      category: 'risque',
    }));

  const inactive = arr(segmentation)
    .filter((s) => s.segment === 'Dormant' || s.orderCount === 0)
    .slice(0, 10)
    .map((s) => ({
      id: s.clientId,
      name: s.clientName,
      segment: s.segment,
      category: 'inactif',
    }));

  const silent = detectSilentActiveClients(clients, orders, payments);

  return {
    best,
    atRisk,
    inactive,
    silent,
    totals: {
      best: best.length,
      atRisk: atRisk.length,
      inactive: inactive.length,
      silent: silent.length,
    },
  };
}

export function clientSegmentationSummaryText(bundle = {}) {
  const parts = [];
  if (bundle.best?.length) parts.push(`${bundle.best.length} meilleur(s) client(s)`);
  if (bundle.atRisk?.length) parts.push(`${bundle.atRisk.length} à risque`);
  if (bundle.silent?.length) parts.push(`${bundle.silent.length} silencieux à relancer`);
  return parts.join(' · ') || 'Segmentation en cours';
}
