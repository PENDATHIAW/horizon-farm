/**
 * Commercial V3 - export preuve commerciale / investisseur.
 */

import { exportModuleReportPdf } from './moduleReportExports.js';
import { buildConsolidatedCommercialKpis } from './commercialKpiConsolidated.js';
import { buildClientSegmentStats } from './commercialSegments.js';
import { buildProspectPipeline } from './commercialProspects.js';
import { readAllCommercialSubscriptions } from './commercialSubscriptions.js';
import { buildCommercialDeliveryQueue } from './commercialDeliveries.js';
import { isQuoteOrder } from './commercialQuoteWorkflow.js';
import { saleAmount } from '../modules/commercial/commercialMetrics.js';
import { fmtCurrency } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);

export function buildCommercialInvestorReport({
  orders = [],
  payments = [],
  clients = [],
  deliveries = [],
  invoices = [],
  relanceRows = [],
  periodLabel = '',
} = {}) {
  const kpis = buildConsolidatedCommercialKpis({ orders, payments, clients, deliveries, invoices });
  const segments = buildClientSegmentStats({ clients, orders, payments, relanceRows });
  const prospects = buildProspectPipeline(clients);
  const subscriptions = readAllCommercialSubscriptions(clients).filter((s) => s.status === 'actif');
  const deliveryQueue = buildCommercialDeliveryQueue({ deliveries, orders, clients });
  const quotes = arr(orders).filter(isQuoteOrder);

  const topClients = [...clients]
    .map((client) => {
      const clientOrders = orders.filter((o) => String(o.client_id) === String(client.id) && !isQuoteOrder(o));
      const ca = clientOrders.reduce((sum, o) => sum + saleAmount(o), 0);
      return { name: client.nom || client.name, ca, orders: clientOrders.length };
    })
    .filter((c) => c.ca > 0)
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 10);

  return {
    title: 'Synthèse commerciale Horizon Farm',
    period: periodLabel || 'Toutes périodes',
    summary: [
      `CA commercial : ${fmtCurrency(kpis.ca)}`,
      `Encaissé : ${fmtCurrency(kpis.collected)}`,
      `Créances : ${fmtCurrency(kpis.receivable)}`,
      `Clients actifs : ${kpis.activeClients}`,
      `Panier moyen : ${fmtCurrency(kpis.basketAvg)}`,
      `Taux paiement : ${kpis.paymentRate ?? '-'}%`,
      `Taux livraison : ${kpis.deliveryRate ?? '-'}%`,
      `Devis ouverts : ${kpis.openQuotes}`,
      `Abonnements actifs : ${subscriptions.length}`,
      `Prospects chauds : ${prospects.hot.length}`,
      `Livraisons en retard : ${deliveryQueue.late.length}`,
    ].join(' · '),
    kpis,
    segments,
    topClients,
    subscriptions,
    prospects: prospects.all.slice(0, 20),
    quotes: quotes.slice(0, 20),
    deliveryStats: {
      delivered: deliveryQueue.delivered.length,
      late: deliveryQueue.late.length,
      withoutProof: deliveryQueue.withoutProof.length,
    },
    rows: [
      ...topClients.map((c) => ({ section: 'Top clients', label: c.name, value: fmtCurrency(c.ca), detail: `${c.orders} commande(s)` })),
      ...segments.map((s) => ({ section: 'Segments', label: s.label, value: fmtCurrency(s.ca), detail: `${s.clientCount} clients · créances ${fmtCurrency(s.receivable)}` })),
      ...subscriptions.slice(0, 10).map((s) => ({ section: 'Abonnements', label: s.clientName, value: s.productName, detail: `${s.quantity} ${s.unit} · ${s.frequencyLabel}` })),
    ],
  };
}

export function exportCommercialInvestorPdf(report = {}, fileName = '') {
  const payload = {
    module: 'Commercial',
    title: report.title || 'Synthèse commerciale',
    period: report.period || '',
    summary: report.summary || '',
    filename: fileName || `commercial-investisseur-${new Date().toISOString().slice(0, 10)}.pdf`,
    tables: [
      {
        title: 'Indicateurs clés',
        columns: ['Indicateur', 'Valeur'],
        rows: [
          ['CA', fmtCurrency(report.kpis?.ca)],
          ['Encaissé', fmtCurrency(report.kpis?.collected)],
          ['Créances', fmtCurrency(report.kpis?.receivable)],
          ['Panier moyen', fmtCurrency(report.kpis?.basketAvg)],
          ['Taux paiement', `${report.kpis?.paymentRate ?? '-'}%`],
          ['Taux livraison', `${report.kpis?.deliveryRate ?? '-'}%`],
        ],
      },
      {
        title: 'Top clients',
        columns: ['Client', 'CA', 'Commandes'],
        rows: arr(report.topClients).map((c) => [c.name, fmtCurrency(c.ca), String(c.orders)]),
      },
      {
        title: 'Segments clients',
        columns: ['Segment', 'Clients', 'CA', 'Créances'],
        rows: arr(report.segments).map((s) => [s.label, String(s.clientCount), fmtCurrency(s.ca), fmtCurrency(s.receivable)]),
      },
    ],
  };
  exportModuleReportPdf(payload);
  return payload;
}
