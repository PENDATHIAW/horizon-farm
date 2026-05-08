import { createSupabaseCrudService } from './baseSupabaseService';
import { syncPaymentToFinance, syncSalesOrderToFinance } from './financeSyncService';

const rawSalesOrdersService = createSupabaseCrudService('sales_orders');

export const salesOrdersService = {
  ...rawSalesOrdersService,
  async create(payload) {
    const order = await rawSalesOrdersService.create(payload);
    await syncSalesOrderToFinance(order || payload);
    return order;
  },
  async update(id, payload) {
    const order = await rawSalesOrdersService.update(id, payload);
    await syncSalesOrderToFinance(order || { ...payload, id });
    return order;
  },
};

export const salesOrderItemsService = createSupabaseCrudService('sales_order_items');
export const deliveriesService = createSupabaseCrudService('deliveries');
export const invoicesService = createSupabaseCrudService('invoices');

const rawPaymentsService = createSupabaseCrudService('payments');

export const paymentsService = {
  ...rawPaymentsService,
  async create(payload) {
    const payment = await rawPaymentsService.create(payload);
    await syncPaymentToFinance(payment || payload);
    return payment;
  },
  async update(id, payload) {
    const payment = await rawPaymentsService.update(id, payload);
    await syncPaymentToFinance(payment || { ...payload, id });
    return payment;
  },
};

export const salesOpportunitiesService = createSupabaseCrudService('sales_opportunities');
