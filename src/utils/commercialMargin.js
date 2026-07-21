/**
 * Commercial V3 - marge par vente / commande.
 */

import { saleAmount } from '../modules/commercial/commercialMetrics.js';
import { unitCostOf } from './sellableStock.js';
import { applyCommercialDiscounts, estimateSaleMargin } from './commercialPricing.js';
import { calculateUnifiedAnimalCost, calculateUnifiedCultureCost, calculateUnifiedLotCost } from '../services/unifiedCostService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const low = (value) => String(value || '').toLowerCase();

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

/**
 * Coût de revient UNITAIRE pour la vente : c'est le point clé du calcul de marge.
 * On ne peut PAS prendre le coût d'achat total de l'entité comme coût unitaire
 * (sinon vendre 680 plateaux d'un lot pondeuses coûterait 680 x 3,6 M). On dérive
 * le coût de revient à l'unité vendue depuis le moteur de coût unifié :
 * - animal vendu entier : coût total de l'animal ;
 * - lot chair : coût du lot / sujets vendables (coût par poulet) ;
 * - lot pondeuse (œufs) : coût par plateau ou par œuf ;
 * - culture : coût total / quantité récoltée (coût par kg) ;
 * - stock / produit fini : coût unitaire stocké.
 */
export function unitCostOfRevient(line = {}, sourceRow = null, context = {}) {
  if (!sourceRow) return unitCostOf(line.sourceRow || {});
  const type = low(line.source_type || sourceRow.source_type);
  const productText = low(`${line.product_name || line.produit || ''} ${sourceRow.produit || sourceRow.name || sourceRow.nom || ''}`);
  const isEgg = /oeuf|œuf|tablette|plateau/.test(productText);

  if (type.includes('animal')) {
    const u = calculateUnifiedAnimalCost({ animal: sourceRow, alimentationLogs: context.alimentationLogs, vaccins: context.healthEvents, healthEvents: context.healthEvents, directCharges: context.businessEvents });
    return num(u.totalCost) || unitCostOf(sourceRow);
  }
  if (type.includes('lot') || type.includes('avicole')) {
    const u = calculateUnifiedLotCost({ lot: sourceRow, alimentationLogs: context.alimentationLogs, productionLogs: context.productionLogs, healthEvents: context.healthEvents, directCharges: context.businessEvents });
    const raw = u.raw || {};
    if (isEgg) {
      const perPlateau = /plateau|tablette/.test(productText) || num(line.unit_price) > 300;
      return perPlateau ? (num(raw.costPerTablet) || num(raw.costPerEgg) * 30) : num(raw.costPerEgg);
    }
    const subjects = Math.max(1, num(raw.sellableSubjects || sourceRow.current_count || sourceRow.effectif_actuel || sourceRow.initial_count));
    return num(u.totalCost) / subjects;
  }
  if (type.includes('culture')) {
    const u = calculateUnifiedCultureCost({ culture: sourceRow, healthEvents: context.healthEvents, directCharges: context.businessEvents });
    const qty = Math.max(1, num(sourceRow.quantite_recoltee || sourceRow.quantite_prevue));
    return u.costPerKg > 0 ? u.costPerKg : u.totalCost / qty;
  }
  return unitCostOf(sourceRow);
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
    unitCost: unitCostOfRevient(line, sourceRow, context),
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
