import { toNumber } from './format';

const arr = (value) => Array.isArray(value) ? value : [];

export const saleTotal = (sale = {}) => toNumber(sale.montant_total || sale.total || sale.amount || sale.total_amount || (toNumber(sale.quantity || sale.quantite) * toNumber(sale.unit_price || sale.prix_unitaire)));
export const paymentOrderId = (payment = {}) => String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || payment.commande_id || '');
export const paymentValue = (payment = {}) => toNumber(payment.montant || payment.amount || payment.montant_paye || payment.paid_amount);

export function paidForSale(sale = {}, payments = []) {
  return toNumber(sale.montant_paye || sale.paid_amount) || arr(payments).filter((payment) => paymentOrderId(payment) === String(sale.id)).reduce((sum, payment) => sum + paymentValue(payment), 0);
}

export function remainingForSale(sale = {}, payments = []) {
  return Math.max(0, saleTotal(sale) - paidForSale(sale, payments));
}

export function capSalePayment(sale = {}, payments = [], requested = 0) {
  const remaining = remainingForSale(sale, payments);
  return Math.max(0, Math.min(toNumber(requested), remaining));
}

export function buildSaleSourcePatch({ sourceType, sourceRow = {}, quantity = 0, total = 0, date = '', orderId = '', clientId = '', saleKind = '' } = {}) {
  const qty = toNumber(quantity);
  if (!sourceRow?.id || !sourceType || sourceType === 'autre' || qty <= 0) return null;
  const common = { last_sale_id: orderId, sale_order_id: orderId, derniere_vente: date, last_sale_date: date, client_id: clientId || null };
  if (sourceType === 'stock') {
    return {
      module: 'stock',
      id: sourceRow.id,
      patch: { ...common, quantite: Math.max(0, toNumber(sourceRow.quantite) - qty), quantity_sold: toNumber(sourceRow.quantity_sold ?? sourceRow.vendus) + qty, vendus: toNumber(sourceRow.vendus) + qty },
    };
  }
  if (sourceType === 'lot_avicole') {
    const current = toNumber(sourceRow.current_count ?? sourceRow.effectif_actuel ?? sourceRow.active_count ?? sourceRow.initial_count);
    const next = Math.max(0, current - qty);
    return {
      module: 'lot_avicole',
      id: sourceRow.id,
      patch: { ...common, current_count: next, effectif_actuel: next, vendus: toNumber(sourceRow.vendus) + qty, sold_count: toNumber(sourceRow.sold_count) + qty, status: next === 0 ? 'vendu' : 'vendu_partiellement', sale_kind: saleKind },
    };
  }
  if (sourceType === 'animal') {
    return {
      module: 'animal',
      id: sourceRow.id,
      patch: { ...common, status: 'vendu', statut: 'vendu', date_vente: date, sale_price: total, prix_vente_reel: total },
    };
  }
  if (sourceType === 'culture') {
    const available = toNumber(sourceRow.quantite_disponible ?? sourceRow.quantite_recoltee);
    return {
      module: 'culture',
      id: sourceRow.id,
      patch: { ...common, quantite_disponible: Math.max(0, available - qty), quantity_sold: toNumber(sourceRow.quantity_sold ?? sourceRow.quantite_vendue) + qty, quantite_vendue: toNumber(sourceRow.quantite_vendue) + qty, revenu_reel: toNumber(sourceRow.revenu_reel) + total },
    };
  }
  return null;
}
