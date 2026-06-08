/**
 * Commercial V3 — marge par vente / commande.
 */

import { saleAmount } from '../modules/commercial/commercialMetrics.js';
import { unitCostOf } from './sellableStock.js';
import { applyCommercialDiscounts, estimateSaleMargin } from './commercialPricing.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);

function resolveSourceRow(sourceType = '', sourceId = '', context = {}) {
  const id = String(sourceId || '');
  if (!id) return null;
  const map = {
    stock: context.stocks,
    culture: context.cultures,
    lot_avicole: context.lots,
    animal: context.animaux,
  };
  const list = arr(map[sourceType] || context.stocks);
  return list.find((row) => String(row.id) === id) || null;
}

export function buildLineMargin(line = {}, context = {}) {
  const sourceRow = line.sourceRow || resolveSourceRow(line.source_type, line.source_id, context);
  const discounted = applyCommercialDiscounts({
    unitPrice: line.unit_price,
    quantity: line.quantity,
    discountPct: line.discount_pct ?? line.remise_pct,
    discountAmount: line.discount_amount ?? line.remise_montant,
    lineDiscountPct: line.line_discount_pct,
    lineDiscountAmount: line.line_discount_amount,
  });
  const margin = estimateSaleMargin({
    unitPrice: discounted.effectiveUnitPrice || line.unit_price,
    quantity: line.quantity,
    sourceRow,
    lineTotal: discounted.lineTotal || line.line_total,
  });
  const calculable = margin.margin != null;
  return {
    lineId: line.id,
    productName: line.product_name || line.produit,
    unitPrice: num(line.unit_price),
    quantity: num(line.quantity),
    revenue: discounted.lineTotal,
    cost: margin.cost,
    margin: margin.margin,
    marginPct: margin.marginPct,
    calculable,
    message: calculable ? null : 'Marge non calculable : coût non renseigné.',
    sourceRow,
  };
}

export function buildOrderMargin(order = {}, { orderItems = [], ...context } = {}) {
  const items = orderItems.length
    ? orderItems
    : [{
      id: order.id,
      source_type: order.source_type,
      source_id: order.source_id,
      product_name: order.product_name,
      quantity: order.quantity,
      unit_price: order.unit_price,
      line_total: order.montant_ht ?? order.montant_total,
    }];

  const lines = items.map((line) => buildLineMargin(line, context));
  const calculableLines = lines.filter((l) => l.calculable);
  const revenue = saleAmount(order) || lines.reduce((sum, l) => sum + num(l.revenue), 0);
  const cost = calculableLines.reduce((sum, l) => sum + num(l.cost), 0);
  const margin = calculableLines.length ? revenue - cost : null;
  const marginPct = margin != null && revenue > 0 ? Math.round((margin / revenue) * 100) : null;

  return {
    orderId: order.id,
    revenue,
    cost: calculableLines.length ? cost : null,
    margin,
    marginPct,
    lines,
    calculable: calculableLines.length > 0,
    message: calculableLines.length ? null : 'Marge non calculable : coût non renseigné.',
  };
}

export function buildLowMarginOrders(orders = [], { orderItems = [], thresholdPct = 15, ...context } = {}) {
  return arr(orders).map((order) => {
    const items = arr(orderItems).filter((i) => String(i.order_id) === String(order.id));
    const margin = buildOrderMargin(order, { orderItems: items, ...context });
    return { order, margin };
  }).filter(({ margin }) => margin.calculable && margin.marginPct != null && margin.marginPct < thresholdPct);
}

export { unitCostOf };
