import { toNumber } from './format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const orderTotal = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount);
const paidOrder = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const paymentOrderId = (row = {}) => String(row.order_id || row.sale_id || row.commande_id || row.source_record_id || row.related_id || '');
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(lower(row.type));
const isOut = (row = {}) => ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(lower(row.type));
const isDebt = (row = {}) => isOut(row) && ['impaye', 'partiel'].includes(lower(row.statut || row.status));
const isCreditTx = (row = {}) => isIn(row) && ['impaye', 'partiel'].includes(lower(row.statut || row.status));

export function computeFinanceCash({ transactions = [], salesOrders = [], payments = [], fournisseurs = [] }) {
  const tx = arr(transactions);
  const paidByOrder = new Map();
  arr(payments).forEach((payment) => {
    const key = paymentOrderId(payment);
    if (key) paidByOrder.set(key, (paidByOrder.get(key) || 0) + paymentAmount(payment));
  });
  const cashInTx = tx.filter(isIn).filter((row) => !isCreditTx(row)).reduce((sum, row) => sum + amount(row), 0);
  const cashOut = tx.filter(isOut).filter((row) => !isDebt(row)).reduce((sum, row) => sum + amount(row), 0);
  const cashFromPayments = arr(payments).reduce((sum, row) => sum + paymentAmount(row), 0);
  const cashIn = Math.max(cashInTx, cashFromPayments);
  const receivablesOrders = arr(salesOrders).reduce((sum, row) => {
    const linkedPaid = paidByOrder.get(String(row.id || '')) || 0;
    return sum + Math.max(0, orderTotal(row) - Math.max(paidOrder(row), linkedPaid));
  }, 0);
  const receivablesTx = tx.filter(isCreditTx).reduce((sum, row) => sum + amount(row), 0);
  const receivables = Math.max(receivablesOrders, receivablesTx);
  const debtsTx = tx.filter(isDebt).reduce((sum, row) => sum + amount(row), 0);
  const debtsSuppliers = arr(fournisseurs).reduce((sum, row) => sum + toNumber(row.dettes ?? row.dette ?? row.solde_du), 0);
  const debts = Math.max(debtsTx, debtsSuppliers);
  const cashBalance = cashIn - cashOut;
  const netPosition = cashBalance + receivables - debts;
  const warnings = [];
  if (cashBalance < 0) warnings.push('La trésorerie encaissée est inférieure aux dépenses payées.');
  if (receivables > cashIn * 0.35 && receivables > 0) warnings.push('Le reste à encaisser est important par rapport à l’argent déjà reçu.');
  if (debts > cashBalance && debts > 0) warnings.push('Le reste à payer dépasse la trésorerie disponible.');
  return { cashIn, cashOut, cashBalance, receivables, debts, netPosition, warnings };
}
