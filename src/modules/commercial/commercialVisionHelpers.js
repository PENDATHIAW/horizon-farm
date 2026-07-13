import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { enrichCommercialOrders } from './commercialMetrics.js';



export function buildCommercialHealthSnapshot({
  salesOrders = [],
  payments = [],
  clients = [],
  opportunities = [],
  deliveries = [],
  invoices = [],
}) {
  const enriched = enrichCommercialOrders(salesOrders, { deliveries, invoices });
  const data = { sales_orders: enriched, salesOrders: enriched, payments, clients, sales_opportunities: opportunities };
  const health = runErpHealthEngine(data);
  return {
    score: health.score,
    findings: health.findings.filter((f) => f.module === 'commercial'),
    predictions: health.predictions.filter((p) => p.module === 'commercial'),
    risks: health.risks.filter((r) => r.domain === 'client' || r.module === 'commercial'),
  };
}

export {
  aggregateClientReceivables,
  buildClientLedger,
  buildCommercialCoherenceRows,
  buildSummaryTodos,
  buildTopClients,
  clientsWithReceivableCount,
  collectedFromOrders,
  isDelivered,
  isInvoiced,
  isSaleClosed,
  openSalesCount,
  receivableFromOrders,
  saleAmount,
} from './commercialMetrics.js';
