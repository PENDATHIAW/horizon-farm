import { createSupabaseCrudService } from './baseSupabaseService';

export const salesOrdersService = createSupabaseCrudService('sales_orders');
export const salesOrderItemsService = createSupabaseCrudService('sales_order_items');
export const deliveriesService = createSupabaseCrudService('deliveries');
export const invoicesService = createSupabaseCrudService('invoices');
export const paymentsService = createSupabaseCrudService('payments');
export const salesOpportunitiesService = createSupabaseCrudService('sales_opportunities');
