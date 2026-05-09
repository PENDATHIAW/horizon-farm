import { createSupabaseCrudService } from './baseSupabaseService';
import { syncPaymentToFinance, syncSalesOrderToFinance } from './financeSyncService';

const rawSalesOrdersService = createSupabaseCrudService('sales_orders');
const rawPaymentsService = createSupabaseCrudService('payments');

const stripWorkflowFlags = (payload = {}) => {
  const { skip_finance_sync: skipFinanceSync, ...dbPayload } = payload || {};
  return { dbPayload, skipFinanceSync: Boolean(skipFinanceSync) };
};

export const salesOrdersService = {
  ...rawSalesOrdersService,
  async create(payload = {}) {
    const { dbPayload, skipFinanceSync } = stripWorkflowFlags(payload);
    const order = await rawSalesOrdersService.create(dbPayload);
    if (!skipFinanceSync) await syncSalesOrderToFinance(order || dbPayload);
    return order;
  },
  async update(id, payload = {}) {
    const { dbPayload, skipFinanceSync } = stripWorkflowFlags(payload);
    const order = await rawSalesOrdersService.update(id, dbPayload);
    if (!skipFinanceSync) await syncSalesOrderToFinance(order || { ...dbPayload, id });
    return order;
  },
};

export const salesOrderItemsService = createSupabaseCrudService('sales_order_items');
export const deliveriesService = createSupabaseCrudService('deliveries');
export const invoicesService = createSupabaseCrudService('invoices');

export const paymentsService = {
  ...rawPaymentsService,
  async create(payload = {}) {
    const { dbPayload, skipFinanceSync } = stripWorkflowFlags(payload);
    const payment = await rawPaymentsService.create(dbPayload);
    if (!skipFinanceSync) await syncPaymentToFinance(payment || dbPayload);
    return payment;
  },
  async update(id, payload = {}) {
    const { dbPayload, skipFinanceSync } = stripWorkflowFlags(payload);
    const payment = await rawPaymentsService.update(id, dbPayload);
    if (!skipFinanceSync) await syncPaymentToFinance(payment || { ...dbPayload, id });
    return payment;
  },
};

export const salesOpportunitiesService = createSupabaseCrudService('sales_opportunities');
