import { toNumber } from './format.js';
import { paidForOrder, remainingForOrder } from './salesStatuses.js';



export const saleTotal = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount ?? (toNumber(order.quantity ?? order.quantite) * toNumber(order.unit_price ?? order.prix_unitaire)));
export const paymentOrderId = (payment = {}) => String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || payment.commande_id || '');
export const paymentValue = (payment = {}) => toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount);

/** Aligné sur paidForOrder : max(montant sur fiche, somme paiements liés). */
export function paidForSale(sale = {}, payments = []) {
  return paidForOrder(sale, payments);
}

export function remainingForSale(sale = {}, payments = []) {
  return remainingForOrder(sale, payments);
}

export function capSalePayment(sale = {}, payments = [], requested = 0) {
  const remaining = remainingForOrder(sale, payments);
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

/** Annule l'impact inventaire d'une vente supprimée (restitution stock/lot/animal/culture). */
export function buildReverseSaleSourcePatch({ sourceType, sourceRow = {}, quantity = 0, total = 0 } = {}) {
  const qty = toNumber(quantity);
  if (!sourceRow?.id || !sourceType || sourceType === 'autre' || qty <= 0) return null;
  if (sourceType === 'stock') {
    return {
      module: 'stock',
      id: sourceRow.id,
      patch: {
        quantite: toNumber(sourceRow.quantite) + qty,
        quantity_sold: Math.max(0, toNumber(sourceRow.quantity_sold ?? sourceRow.vendus) - qty),
        vendus: Math.max(0, toNumber(sourceRow.vendus) - qty),
        last_sale_id: null,
        sale_order_id: null,
      },
    };
  }
  if (sourceType === 'lot_avicole') {
    const current = toNumber(sourceRow.current_count ?? sourceRow.effectif_actuel ?? sourceRow.active_count ?? sourceRow.initial_count);
    const next = current + qty;
    const initial = toNumber(sourceRow.initial_count ?? sourceRow.effectif_initial ?? next);
    return {
      module: 'lot_avicole',
      id: sourceRow.id,
      patch: {
        current_count: Math.min(next, initial || next),
        effectif_actuel: Math.min(next, initial || next),
        vendus: Math.max(0, toNumber(sourceRow.vendus) - qty),
        sold_count: Math.max(0, toNumber(sourceRow.sold_count) - qty),
        status: next >= initial ? 'actif' : 'vendu_partiellement',
        last_sale_id: null,
        sale_order_id: null,
      },
    };
  }
  if (sourceType === 'animal') {
    return {
      module: 'animal',
      id: sourceRow.id,
      patch: {
        status: 'actif',
        statut: 'actif',
        date_vente: null,
        sale_price: null,
        prix_vente_reel: null,
        last_sale_id: null,
        sale_order_id: null,
      },
    };
  }
  if (sourceType === 'culture') {
    const available = toNumber(sourceRow.quantite_disponible ?? sourceRow.quantite_recoltee);
    return {
      module: 'culture',
      id: sourceRow.id,
      patch: {
        quantite_disponible: available + qty,
        quantity_sold: Math.max(0, toNumber(sourceRow.quantity_sold ?? sourceRow.quantite_vendue) - qty),
        quantite_vendue: Math.max(0, toNumber(sourceRow.quantite_vendue) - qty),
        revenu_reel: Math.max(0, toNumber(sourceRow.revenu_reel) - total),
        last_sale_id: null,
        sale_order_id: null,
      },
    };
  }
  return null;
}
