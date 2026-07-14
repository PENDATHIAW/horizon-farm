/**
 * Commercial V2 - réconciliation Commercial ↔ Finance V3.
 * Détection read-only - pas de correction automatique.
 */

import { buildCommercialSaleGapRows } from './commercialSaleIntegrity.js';
import { remainingForOrder } from './salesStatuses.js';
import { saleAmount, linkedPaymentsForOrders } from '../modules/commercial/commercialMetrics.js';
import { rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => Number(value || 0);

function orderIdFromFinance(row = {}) {
  return clean(row.order_id || row.sale_id || row.related_id || row.source_record_id || row.vente_id);
}

function paymentIdFromFinance(row = {}) {
  return clean(row.payment_id);
}

export function buildCommercialReconciliationRows({
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
  alertes = [],
} = {}) {
  const rows = [];
  const orderMap = new Map(arr(orders).map((o) => [String(o.id), o]));
  const linked = linkedPaymentsForOrders(orders, payments);

  arr(buildCommercialSaleGapRows({ orders, items, payments, transactions, deliveries, invoices, documents, stocks, animaux, lots })).forEach((gap) => {
    const order = gap.order || orderMap.get(String(gap.orderId));
    rows.push({
      id: gap.id,
      kind: gap.kind,
      description: gap.title,
      detail: gap.detail,
      amount: num(gap.value) || saleAmount(order),
      client: order?.client_label || order?.client_nom || order?.client_id || '',
      orderId: gap.orderId || order?.id || '',
      farmId: rowFarmId(order) || rowFarmId(gap.payment) || null,
      recommendedAction: gap.finding?.recommended_action || 'Vérifier dans Commercial ou Finance',
      severity: gap.finding?.severity || 'moyenne',
      source: 'commercial_integrity',
    });
  });

  arr(payments).forEach((payment) => {
    const orderId = clean(payment.order_id || payment.sale_id);
    if (orderId && !orderMap.has(orderId)) {
      rows.push({
        id: `recon-orphan-pay-${payment.id}`,
        kind: 'payment_without_order',
        description: `Paiement sans commande · ${payment.id}`,
        detail: `${num(payment.montant ?? payment.amount)} FCFA`,
        amount: num(payment.montant ?? payment.amount),
        client: payment.client_id || '',
        orderId: '',
        farmId: rowFarmId(payment),
        recommendedAction: 'Rattacher à une commande ou corriger le paiement orphelin',
        severity: 'haute',
        source: 'payments',
      });
    }
  });

  arr(transactions).forEach((trx) => {
    const orderId = orderIdFromFinance(trx);
    const isSaleFinance = lower(trx.module_lie || trx.source_module || '').includes('vente')
      || lower(trx.categorie || '').includes('vente')
      || lower(trx.categorie || '').includes('creance');
    if (!isSaleFinance || !orderId) return;
    if (!orderMap.has(orderId)) {
      rows.push({
        id: `recon-fin-no-order-${trx.id}`,
        kind: 'finance_without_order',
        description: `Finance liée à vente inexistante · ${trx.id}`,
        detail: trx.libelle || orderId,
        amount: num(trx.montant ?? trx.amount),
        client: trx.client_id || '',
        orderId,
        farmId: rowFarmId(trx),
        recommendedAction: 'Vérifier la commande source ou supprimer la ligne finance orpheline',
        severity: 'haute',
        source: 'finances',
      });
    }
  });

  arr(orders).forEach((order) => {
    if (String(order.type_document || '').toLowerCase() === 'devis') return;
    const total = saleAmount(order);
    const rest = remainingForOrder(order, linked);
    const paid = total - rest;
    if (paid > 0 && rest > 0 && Math.abs(num(order.montant_paye) - paid) > 1) {
      rows.push({
        id: `recon-partial-${order.id}`,
        kind: 'partial_payment_incoherent',
        description: `Paiement partiel incohérent · ${order.id}`,
        detail: `Payé ${paid} · reste ${rest}`,
        amount: rest,
        client: order.client_label || order.client_id || '',
        orderId: order.id,
        farmId: rowFarmId(order),
        recommendedAction: 'Recalculer encaissements depuis Commercial > Ventes',
        severity: 'moyenne',
        source: 'orders',
      });
    }
    if (rest > 0) {
      const hasAlert = arr(alertes).some((a) => clean(a.alert_dedupe_key).includes(`creance-vente-${order.id}`));
      if (!hasAlert) {
        rows.push({
          id: `recon-creance-no-alert-${order.id}`,
          kind: 'receivable_without_alert',
          description: `Créance sans alerte · ${order.id}`,
          detail: `${rest} FCFA`,
          amount: rest,
          client: order.client_label || order.client_id || '',
          orderId: order.id,
          farmId: rowFarmId(order),
          recommendedAction: 'Créer alerte créance ou encaisser',
          severity: 'moyenne',
          source: 'receivables',
        });
      }
    }
  });

  const financeByPayment = new Map();
  arr(transactions).forEach((trx) => {
    const pid = paymentIdFromFinance(trx);
    if (pid) financeByPayment.set(pid, trx);
  });
  arr(payments).forEach((payment) => {
    const order = orderMap.get(String(payment.order_id || payment.sale_id));
    if (!order) return;
    const dupes = arr(transactions).filter((trx) => paymentIdFromFinance(trx) === clean(payment.id));
    if (dupes.length > 1) {
      rows.push({
        id: `recon-fin-dup-${payment.id}`,
        kind: 'duplicate_finance',
        description: `Doublon finance · paiement ${payment.id}`,
        detail: `${dupes.length} lignes`,
        amount: num(payment.montant ?? payment.amount),
        client: order.client_label || order.client_id || '',
        orderId: order.id,
        farmId: rowFarmId(order),
        recommendedAction: 'Fusionner ou supprimer les doublons finance',
        severity: 'haute',
        source: 'finances',
      });
    }
  });

  return rows.sort((a, b) => {
    const sev = { haute: 0, moyenne: 1, faible: 2 };
    return (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9);
  });
}

export function reconciliationSummary(rows = []) {
  return {
    total: rows.length,
    high: rows.filter((r) => r.severity === 'haute').length,
    amount: rows.reduce((sum, r) => sum + num(r.amount), 0),
  };
}
