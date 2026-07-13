import {
  invoiceRequired,
  isInvoiced,
  isSaleClosed,
  linkedPaymentsForOrders,
  saleAmount,
} from '../../modules/commercial/commercialMetrics.js';
import {  remainingForOrder } from '../../utils/salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export function evaluateSalesRules(orders = [], payments = []) {
  const findings = [];
  const linked = linkedPaymentsForOrders(orders, payments);

  arr(orders).forEach((order) => {
    const total = saleAmount(order);
    if (total <= 0 || isSaleClosed(order, linked)) return;

    const rest = remainingForOrder(order, linked);
    if (rest > 0) {
      findings.push({
        id: `sale-unpaid-${order.id}`,
        module: 'commercial',
        severity: rest >= total ? 'haute' : 'moyenne',
        title: `Vente non soldée : ${order.client_nom || order.id}`,
        description: `Reste ${rest} FCFA à encaisser`,
        recommended_action: 'Encaisser ou relancer le client',
        confidence_score: 0.9,
        source_records: [{ type: 'sales_order', id: order.id }],
      });
    }

    if (invoiceRequired(order) && !isInvoiced(order)) {
      findings.push({
        id: `sale-no-invoice-${order.id}`,
        module: 'commercial',
        severity: 'moyenne',
        title: `Facture absente : ${order.id}`,
        description: 'Vente sans facture émise',
        recommended_action: 'Émettre la facture',
        confidence_score: 0.85,
        source_records: [{ type: 'sales_order', id: order.id }],
      });
    }
  });

  return findings;
}
