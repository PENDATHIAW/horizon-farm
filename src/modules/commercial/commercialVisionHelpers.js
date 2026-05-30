import { runErpHealthEngine } from '../../services/erpHealthEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export function buildCommercialHealthSnapshot({ salesOrders = [], payments = [], clients = [], opportunities = [] }) {
  const data = { sales_orders: salesOrders, salesOrders, payments, clients, sales_opportunities: opportunities };
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
  buildCommercialCoherenceRows,
  buildSummaryTodos,
  collectedFromOrders,
  isDelivered,
  isInvoiced,
  isSaleClosed,
  openSalesCount,
  receivableFromOrders,
  saleAmount,
} from './commercialMetrics.js';
