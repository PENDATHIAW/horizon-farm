import { fmtCurrency } from '../utils/format';
import {
  enrichCommercialOrders,
  isDelivered,
  isSaleClosed,
  linkedPaymentsForOrders,
  saleAmount,
} from '../modules/commercial/commercialMetrics';

const arr = (v) => (Array.isArray(v) ? v : []);

export function findOrdersPendingDelivery(orders = [], payments = [], { deliveries = [], invoices = [] } = {}) {
  const enriched = enrichCommercialOrders(orders, { deliveries, invoices });
  const linked = linkedPaymentsForOrders(enriched, payments);
  return arr(enriched)
    .filter((order) => saleAmount(order) > 0)
    .filter((order) => !isDelivered(order))
    .filter((order) => !isSaleClosed(order, linked))
    .map((order) => ({
      id: order.id,
      orderId: order.id,
      title: order.client_nom || order.customer_name || order.client_label || order.client_id || 'Client',
      detail: `${order.product_name || order.libelle || 'Vente'} · ${fmtCurrency(saleAmount(order))}`,
      amount: saleAmount(order),
      order,
    }))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0));
}

export function summarizeDeliveryGaps(orders = [], payments = [], options = {}) {
  const rows = findOrdersPendingDelivery(orders, payments, options);
  return {
    count: rows.length,
    rows,
    total: rows.reduce((sum, row) => sum + (row.amount || 0), 0),
  };
}
