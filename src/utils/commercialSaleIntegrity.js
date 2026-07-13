/**
 * Écarts vente ↔ paiement ↔ finance ↔ stock ↔ livraison ↔ document (réparation admin).
 */

import { findExistingFinanceForPayment } from '../services/salesIntegrityService.js';
import { buildFinanceRowForSalePayment } from './commercialSaleWorkflow.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const paidOnOrder = (order = {}, payments = []) => {
  const fromPayments = arr(payments)
    .filter((p) => clean(p.order_id || p.sale_id) === clean(order.id))
    .reduce((s, p) => s + num(p.montant ?? p.amount ?? p.montant_paye), 0);
  return Math.max(num(order.montant_paye), fromPayments);
};
const isDeliveredStatus = (v = '') => ['livre', 'livré', 'recupere', 'récupéré', 'done', 'closed'].includes(lower(v));
const isStockType = (order = {}) => lower(order.source_type || '') === 'stock';
const isAnimalType = (order = {}) => ['animal', 'animaux'].includes(lower(order.source_type || ''));
const isLotType = (order = {}) => ['lot_avicole', 'avicole', 'lot'].includes(lower(order.source_type || ''));

function orderItems(orderId = '', items = []) {
  return arr(items).filter((item) => clean(item.order_id) === clean(orderId));
}

export function buildCommercialSaleGapRows({
  orders = [],
  items = [],
  payments = [],
  transactions = [],
  deliveries = [],
  invoices = [],
  documents = [],
  stocks = [],
  animaux = [],
  lots = [],
} = {}) {
  const rows = [];

  arr(orders).forEach((order) => {
    const orderId = clean(order.id);
    const total = amount(order);
    const paid = paidOnOrder(order, payments);
    const lines = orderItems(orderId, items);


    if (total > 0 && !lines.length && !num(order.quantity)) {
      rows.push({
        id: `gap-no-lines-${orderId}`,
        kind: 'sale_without_lines',
        orderId,
        title: `Vente sans lignes · ${order.product_name || orderId}`,
        detail: `${total} FCFA`,
        order,
      });
    }

    if (paid > 0 && !arr(payments).some((p) => clean(p.order_id || p.sale_id) === orderId)) {
      rows.push({
        id: `gap-paid-no-payment-${orderId}`,
        kind: 'paid_without_payment',
        orderId,
        title: `Vente marquée payée sans paiement · ${orderId}`,
        detail: `Payé ${paid} FCFA`,
        order,
      });
    }

    const orderPayments = arr(payments).filter((p) => clean(p.order_id || p.sale_id) === orderId);
    orderPayments.forEach((payment) => {
      const finance = findExistingFinanceForPayment({
        orderId,
        paymentId: payment.id,
        amount: num(payment.montant ?? payment.amount),
        transactions,
        date: String(payment.date_paiement || payment.date || '').slice(0, 10),
        method: payment.moyen_paiement || payment.mode_paiement,
      });
      if (!finance) {
        rows.push({
          id: `gap-pay-no-fin-${payment.id}`,
          kind: 'payment_without_finance',
          orderId,
          title: `Paiement sans finance · ${orderId}`,
          detail: `${num(payment.montant)} FCFA`,
          payment,
          order,
          repairFinance: buildFinanceRowForSalePayment({ payment, order }),
        });
      }
    });

    if (isStockType(order)) {
      const stockId = clean(order.source_id || order.stock_id);
      const stock = arr(stocks).find((s) => clean(s.id) === stockId);
      const sold = num(stock?.vendus ?? stock?.quantity_sold);
      const qty = num(order.quantity);
      if (stockId && qty > 0 && sold < qty * 0.5) {
        rows.push({
          id: `gap-stock-${orderId}`,
          kind: 'stockable_without_stock_exit',
          orderId,
          title: `Vente stock sans sortie · ${order.product_name || orderId}`,
          detail: stock ? `Stock ${stock.produit || stockId}` : stockId,
          order,
          stockId,
        });
      }
    }

    if (isAnimalType(order)) {
      const animal = arr(animaux).find((a) => clean(a.id) === clean(order.source_id));
      if (animal && !['vendu', 'vendue'].includes(lower(animal.statut || animal.status))) {
        rows.push({
          id: `gap-animal-${orderId}`,
          kind: 'animal_not_sold_status',
          orderId,
          title: `Animal non marqué vendu · ${orderId}`,
          detail: animal.name || animal.id,
          order,
          animalId: animal.id,
        });
      }
    }

    if (isLotType(order)) {
      const lot = arr(lots).find((l) => clean(l.id) === clean(order.source_id));
      if (lot && !lower(lot.status || lot.statut).includes('vendu') && num(order.quantity) > 0) {
        rows.push({
          id: `gap-lot-${orderId}`,
          kind: 'lot_not_sold_status',
          orderId,
          title: `Lot non marqué vendu · ${orderId}`,
          detail: lot.name || lot.id,
          order,
          lotId: lot.id,
        });
      }
    }

    const deliveryRows = arr(deliveries).filter((d) => clean(d.order_id || d.sale_id) === orderId);
    const deliveryDone = deliveryRows.some((d) => isDeliveredStatus(d.statut || d.status));
    const orderPending = ['a_livrer', 'en_preparation'].includes(lower(order.statut_livraison || order.delivery_status));
    if (deliveryDone && orderPending) {
      rows.push({
        id: `gap-delivery-status-${orderId}`,
        kind: 'delivery_done_order_pending',
        orderId,
        title: `Livraison faite, vente encore à livrer · ${orderId}`,
        detail: order.product_name || orderId,
        order,
      });
    }

    const inv = arr(invoices).find((i) => clean(i.order_id || i.sale_id) === orderId) || (order.invoice_id ? { id: order.invoice_id } : null);
    if ((order.facture_emise || order.invoice_id || inv) && inv) {
      const hasDoc = arr(documents).some((doc) => clean(doc.invoice_id) === clean(inv.id)
        || clean(doc.order_id || doc.related_id) === orderId);
      if (!hasDoc) {
        rows.push({
          id: `gap-inv-doc-${orderId}`,
          kind: 'invoice_without_document',
          orderId,
          title: `Facture sans document · ${orderId}`,
          detail: inv.id,
          order,
          invoice: inv,
        });
      }
    }
  });

  return rows;
}

export function countCommercialSaleGaps(ctx = {}) {
  return buildCommercialSaleGapRows(ctx).length;
}
