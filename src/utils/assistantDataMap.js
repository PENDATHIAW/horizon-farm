const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0);
const amount = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total);

export function paidOfOrder(order = {}, payments = []) {
  return n(order.montant_paye ?? order.paid_amount ?? order.amount_paid)
    + arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((sum, p) => sum + amount(p), 0);
}

export function receivableOfOrder(order = {}, payments = []) {
  return Math.max(0, amount(order) - paidOfOrder(order, payments));
}

/** Enrichit dataMap avec snapshots *All pour créances et analyses stables. */
export function enrichAssistantDataMap(dataMap = {}, options = {}) {
  const salesAll = arr(options.salesOrdersAll || dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders);
  const payAll = arr(options.paymentsAll || dataMap.paymentsAll || dataMap.payments);
  const txAll = arr(options.transactionsAll || dataMap.transactionsAll || dataMap.finances || dataMap.transactions);
  return {
    ...dataMap,
    sales_orders: dataMap.sales_orders || dataMap.salesOrders || salesAll,
    salesOrders: dataMap.sales_orders || dataMap.salesOrders || salesAll,
    salesOrdersAll: salesAll,
    payments: dataMap.payments || payAll,
    paymentsAll: payAll,
    finances: dataMap.finances || dataMap.transactions || txAll,
    transactions: dataMap.transactions || dataMap.finances || txAll,
    transactionsAll: txAll,
    periodFiltered: Boolean(options.periodFiltered ?? dataMap.periodFiltered),
    periodScope: options.periodScope ?? dataMap.periodScope,
    periodLabel: options.periodLabel ?? dataMap.periodLabel ?? '',
  };
}

export function countOpenReceivables(sales = [], payments = []) {
  return arr(sales).filter((order) => receivableOfOrder(order, payments) > 0).length;
}

export function totalOpenReceivables(sales = [], payments = []) {
  return arr(sales).reduce((sum, order) => sum + receivableOfOrder(order, payments), 0);
}
