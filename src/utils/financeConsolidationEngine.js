import { toNumber } from './format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim().toLowerCase();
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const orderAmount = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount ?? 0);
const orderPaidField = (order = {}) => toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid ?? 0);
const paymentAmount = (payment = {}) => toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount ?? 0);
const paymentOrderId = (payment = {}) => payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id;
const isCancelled = (row = {}) => ['annule', 'annulee', 'cancelled', 'rejete'].includes(clean(row.statut || row.status || row.statut_commande));
const isIn = (row = {}) => clean(row.type) === 'entree';
const isOut = (row = {}) => clean(row.type) === 'sortie';
const isPaid = (row = {}) => !['impaye', 'partiel', 'en_retard', 'annule', 'annulee'].includes(clean(row.statut || row.status || 'paye'));
const isReceivableTx = (row = {}) => isIn(row) && ['impaye', 'partiel', 'en_retard'].includes(clean(row.statut || row.status));
const isSalesLikeTx = (tx = {}) => ['vente', 'ventes', 'client', 'clients'].some((key) => clean(`${tx.categorie || ''} ${tx.module_lie || ''} ${tx.source_module || ''} ${tx.libelle || ''}`).includes(key));

function keyForTransaction(tx = {}) {
  return [tx.source_module || tx.module_lie || 'finance', tx.source_record_id || tx.related_id || tx.order_id || tx.sale_id || tx.payment_id || tx.invoice_id || tx.id].map((v) => String(v || '').trim()).join(':');
}

export function paymentsForOrder(order = {}, payments = []) {
  const orderId = String(order.id || '');
  return arr(payments).filter((payment) => !isCancelled(payment) && String(paymentOrderId(payment) || '') === orderId);
}

export function calculateOrderSettlement(order = {}, payments = []) {
  const total = orderAmount(order);
  const linkedPayments = paymentsForOrder(order, payments);
  const paidFromPayments = linkedPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const paidRaw = Math.max(orderPaidField(order), paidFromPayments);
  const paid = total > 0 ? Math.min(total, paidRaw) : paidRaw;
  const overpaid = total > 0 ? Math.max(0, paidRaw - total) : 0;
  const remaining = Math.max(0, total - paid);
  const paymentStatus = total <= 0 ? 'non_paye' : remaining <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye';
  const orderStatus = isCancelled(order) ? 'annule' : paymentStatus !== 'non_paye' ? 'confirme' : total > 0 ? 'enregistree' : 'brouillon';
  return { total, paid, paidRaw, overpaid, remaining, paymentStatus, orderStatus, linkedPayments };
}

export function calculateClientSettlement(client = {}, orders = [], payments = []) {
  const clientOrders = arr(orders).filter((order) => String(order.client_id || '') === String(client.id || '') && !isCancelled(order));
  const details = clientOrders.map((order) => ({ order, ...calculateOrderSettlement(order, payments) }));
  const total = details.reduce((sum, item) => sum + item.total, 0);
  const paid = details.reduce((sum, item) => sum + item.paid, 0);
  const remaining = details.reduce((sum, item) => sum + item.remaining, 0);
  return { clientId: client.id, orders: details, total, paid, remaining, openOrders: details.filter((item) => item.remaining > 0), status: remaining > 0 ? 'a_relancer' : total > 0 ? 'actif' : (client.statut || 'prospect') };
}

export function consolidateFinance({ transactions = [], salesOrders = [], payments = [], fournisseurs = [], stocks = [] } = {}) {
  const orders = arr(salesOrders).filter((order) => !isCancelled(order));
  const txRows = arr(transactions).filter((tx) => Math.abs(amountOf(tx)) > 0 && !isCancelled(tx));
  const paymentRows = arr(payments).filter((payment) => paymentAmount(payment) > 0 && !isCancelled(payment));
  const orderSettlements = orders.map((order) => ({ order, ...calculateOrderSettlement(order, paymentRows) }));
  const caFacture = orderSettlements.reduce((sum, item) => sum + item.total, 0);
  const cashOrders = orderSettlements.reduce((sum, item) => sum + item.paid, 0);
  const creancesCommandes = orderSettlements.reduce((sum, item) => sum + item.remaining, 0);
  const overpaidOrders = orderSettlements.reduce((sum, item) => sum + item.overpaid, 0);
  const transactionMap = new Map();
  txRows.forEach((tx) => {
    const key = keyForTransaction(tx);
    const existing = transactionMap.get(key);
    if (!existing || Math.abs(amountOf(tx)) >= Math.abs(amountOf(existing))) transactionMap.set(key, tx);
  });
  const uniqueTransactions = Array.from(transactionMap.values());
  const txCashIn = uniqueTransactions.filter((tx) => isIn(tx) && isPaid(tx) && isSalesLikeTx(tx)).reduce((sum, tx) => sum + amountOf(tx), 0);
  const otherCashIn = uniqueTransactions.filter((tx) => isIn(tx) && isPaid(tx) && !isSalesLikeTx(tx)).reduce((sum, tx) => sum + amountOf(tx), 0);
  const txReceivables = uniqueTransactions.filter(isReceivableTx).reduce((sum, tx) => sum + amountOf(tx), 0);
  const txExpenses = uniqueTransactions.filter(isOut).reduce((sum, tx) => sum + amountOf(tx), 0);
  const paidExpenses = uniqueTransactions.filter((tx) => isOut(tx) && isPaid(tx)).reduce((sum, tx) => sum + amountOf(tx), 0);
  const supplierDebt = arr(fournisseurs).reduce((sum, supplier) => sum + toNumber(supplier.dettes), 0);
  const stockValue = arr(stocks).reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.prixUnit ?? item.prixunit ?? item.unit_price), 0);
  const orphanPayments = paymentRows.filter((payment) => !paymentOrderId(payment));
  const orphanPaymentsTotal = orphanPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const salesCashRaw = Math.max(cashOrders, txCashIn);
  const cashEncaisse = caFacture > 0 ? Math.min(caFacture, salesCashRaw) : salesCashRaw;
  const creancesReelles = Math.max(0, caFacture - cashEncaisse, creancesCommandes);
  const caConsolide = caFacture;
  const chargesEngagees = txExpenses;
  const chargesPayees = paidExpenses;
  const cashNet = cashEncaisse + otherCashIn + orphanPaymentsTotal - chargesPayees;
  const margeReelle = caConsolide - chargesEngagees;
  const warnings = [];
  if (orphanPayments.length) warnings.push(`${orphanPayments.length} paiement(s) non rattache(s) a une commande`);
  if (overpaidOrders > 0) warnings.push(`${overpaidOrders} FCFA d'encaissement dépasse le montant de commandes liées`);
  if (txReceivables > 0 && creancesCommandes > 0) warnings.push('Creances presentes dans commandes et transactions: anti-doublon applique');
  return { caFacture, caConsolide, cashEncaisse, otherCashIn, orphanPaymentsTotal, creancesReelles, chargesEngagees, chargesPayees, dettesFournisseurs: supplierDebt, stockValue, cashNet, margeReelle, marginRate: caConsolide > 0 ? Number(((margeReelle / caConsolide) * 100).toFixed(1)) : 0, orderSettlements, uniqueTransactions, orphanPayments, warnings };
}
