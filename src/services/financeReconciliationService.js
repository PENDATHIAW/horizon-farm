import { makeId } from '../utils/ids.js';
import { toNumber } from '../utils/format.js';
import { buildFinanceFromPayment } from './erpInterconnectionRules.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const num = (value) => toNumber(value);
function paymentAmount(row = {}) {
  return num(row.montant ?? row.amount ?? row.total);
}

function financeAmount(row = {}) {
  return num(row.montant ?? row.amount ?? row.total);
}

function financeLinkedToPayment(finances = [], payment = {}, order = {}) {
  const paymentId = clean(payment.id);
  const orderId = clean(order.id || payment.order_id || payment.sale_id);
  return arr(finances).some((row) => {
    if (paymentId && clean(row.payment_id || row.source_payment_id || row.linked_payment_id) === paymentId) return true;
    if (orderId && clean(row.order_id || row.sale_id || row.source_record_id || row.related_id) === orderId) return true;
    if (paymentId && clean(row.source_record_id || row.related_id) === paymentId) return true;
    return false;
  });
}

function isIncomeFinance(row = {}) {
  const type = clean(row.type || row.transaction_type || row.nature || row.sens);
  return ['entree', 'entrée', 'income', 'recette', 'vente'].includes(type);
}

export function auditFinanceReconciliation(data = {}) {
  const payments = arr(data.payments);
  const finances = arr(data.finances || data.transactions);
  const orders = arr(data.sales_orders || data.salesOrders);
  const paymentGaps = payments
    .map((payment) => {
      const amount = paymentAmount(payment);
      if (amount <= 0) return null;
      const order = orders.find((row) => clean(row.id) === clean(payment.order_id || payment.sale_id)) || {};
      if (financeLinkedToPayment(finances, payment, order)) return null;
      return {
        id: payment.id,
        payment,
        order,
        amount,
        label: payment.reference || payment.libelle || order.client_nom || payment.id,
        dedupeKey: `payment-finance-sync:${payment.id}`,
      };
    })
    .filter(Boolean);

  const paymentTotal = payments.reduce((sum, row) => sum + paymentAmount(row), 0);
  const financeIncomeTotal = finances.filter(isIncomeFinance).reduce((sum, row) => sum + financeAmount(row), 0);
  const orphanFinances = finances.filter((row) => isIncomeFinance(row) && financeAmount(row) > 0 && !clean(row.order_id || row.sale_id || row.payment_id || row.source_record_id));

  return {
    paymentGaps,
    paymentTotal,
    financeIncomeTotal,
    delta: Math.abs(paymentTotal - financeIncomeTotal),
    orphanFinances: orphanFinances.slice(0, 12),
    aligned: !paymentGaps.length && paymentTotal > 0 && financeIncomeTotal >= paymentTotal * 0.9,
  };
}

export async function syncPaymentsToFinance({ data = {}, handlers = {} } = {}) {
  const audit = auditFinanceReconciliation(data);
  const finances = arr(data.finances || data.transactions);
  let created = 0;
  for (const gap of audit.paymentGaps) {
    const exists = finances.some((row) => clean(row.source_record_id || row.related_id) === clean(gap.dedupeKey));
    if (exists) continue;
    const row = buildFinanceFromPayment(gap.payment, gap.order);
    if (!row || !handlers.onCreateFinanceTransaction) continue;
    await handlers.onCreateFinanceTransaction({
      ...row,
      id: makeId('TRX'),
      source_record_id: gap.dedupeKey,
      transaction_origin: 'payment_reconciliation_sync',
      created_from: 'payment_reconciliation_sync',
      notes: `${row.notes || ''} Rapprochement paiement → Finances.`,
    });
    created += 1;
  }
  if (created > 0) await handlers.onRefreshFinances?.();
  return { ...audit, created };
}
