/**
 * Commercial V1 — pilotage (produits rentables, clients stratégiques, objectifs).
 * Marge : summarizeSalesMargins uniquement (aligné Finance Rentabilité).
 */

import { summarizeSalesMargins } from './salesMarginEngine.js';
import { buildConsolidatedCommercialKpis } from './commercialKpiConsolidated.js';
import { saleAmount, linkedPaymentsForOrders } from '../modules/commercial/commercialMetrics.js';
import { buildClientSegment } from '../services/clientSegmentationEngine.js';
import { computePurchaseFrequency } from '../services/clientSegmentationEngine.js';
import { isQuoteOrder } from './commercialQuoteWorkflow.js';
import { buildAttainmentKpis } from '../modules/commercial/commercialChartMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

function clientName(c = {}) {
  return c.nom || c.name || c.id || 'Client';
}

function ordersForClient(clientId, orders = []) {
  return arr(orders).filter((o) => String(o.client_id) === String(clientId) && !isQuoteOrder(o));
}

/** Produits les plus rentables — source summarizeSalesMargins (pas de recalcul CA). */
export function buildTopProfitableProducts(orders = [], marginContext = {}, limit = 8) {
  const sales = arr(orders).filter((o) => !isQuoteOrder(o));
  const summary = summarizeSalesMargins(sales, marginContext);
  const byProduct = {};

  summary.details.forEach((row) => {
    if (row.margin_reliable === false) return;
    const key = row.product_name || row.produit || row.designation || 'Produit';
    if (!byProduct[key]) {
      byProduct[key] = { name: key, ca: 0, margin: 0, volume: 0 };
    }
    byProduct[key].ca += n(row.chiffre_affaires);
    byProduct[key].margin += n(row.marge_directe);
    byProduct[key].volume += n(row.quantity ?? row.quantite);
  });

  return Object.values(byProduct)
    .map((p) => ({
      ...p,
      marginRate: p.ca > 0 ? Math.round((p.margin / p.ca) * 100) : 0,
      source: 'summarizeSalesMargins',
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, limit);
}

/** Clients stratégiques : CA, fréquence, marge. */
export function buildStrategicClients(clients = [], orders = [], payments = [], marginContext = {}, limit = 10) {
  const sales = arr(orders).filter((o) => !isQuoteOrder(o));
  const summary = summarizeSalesMargins(sales, marginContext);
  const marginByOrder = new Map(summary.details.map((d) => [String(d.id), n(d.marge_directe)]));

  return arr(clients)
    .map((client) => {
      const clientOrders = ordersForClient(client.id, sales);
      const ca = clientOrders.reduce((sum, o) => sum + saleAmount(o), 0);
      const margin = clientOrders.reduce((sum, o) => sum + (marginByOrder.get(String(o.id)) || 0), 0);
      const freq = computePurchaseFrequency(clientOrders);
      const segment = buildClientSegment(client, { sales_orders: orders, payments });
      return {
        id: client.id,
        name: clientName(client),
        ca,
        margin,
        marginRate: ca > 0 ? Math.round((margin / ca) * 100) : 0,
        orderCount: clientOrders.length,
        frequency: freq.frequencyLabel,
        segment: segment.segment,
        receivable: segment.receivable,
      };
    })
    .filter((c) => c.ca > 0)
    .sort((a, b) => b.ca - a.ca || b.margin - a.margin)
    .slice(0, limit);
}

/** Objectifs mensuels : réalisé, restant, projection fin de mois. */
export function buildCommercialObjectivesView(orders = [], chartOptions = {}) {
  const attainment = buildAttainmentKpis(orders, chartOptions);
  const month = attainment.month || {};
  const actual = n(month.actual);
  const target = n(month.target);
  const remaining = Math.max(0, target - actual);
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyPace = dayOfMonth > 0 ? actual / dayOfMonth : 0;
  const projectionLinear = Math.round(dailyPace * daysInMonth);
  const projectionMethod = 'linear_no_seasonality';

  return {
    label: month.label || 'Mois courant',
    target,
    actual,
    remaining,
    attainment: month.attainment ?? (target > 0 ? Math.round((actual / target) * 100) : 0),
    projectionEndOfMonth: projectionLinear,
    projectionLinear,
    projectionMethod,
    onTrack: projectionLinear >= target,
    source: 'buildAttainmentKpis',
  };
}

export function buildCommercialPilotageBundle({
  orders = [],
  payments = [],
  clients = [],
  marginContext = {},
  chartOptions = {},
} = {}) {
  const kpis = buildConsolidatedCommercialKpis({ orders, payments, clients });
  return {
    kpis,
    topProducts: buildTopProfitableProducts(orders, marginContext),
    strategicClients: buildStrategicClients(clients, orders, payments, marginContext),
    objectives: buildCommercialObjectivesView(orders, chartOptions),
  };
}
