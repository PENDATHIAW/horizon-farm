import { createSupabaseCrudService } from './baseSupabaseService';

export const businessPlansService = createSupabaseCrudService('business_plans');
export const bpInvestmentLinesService = createSupabaseCrudService('bp_investment_lines');
export const bpRecurringCostsService = createSupabaseCrudService('bp_recurring_costs');
export const bpRevenueProjectionsService = createSupabaseCrudService('bp_revenue_projections');
export const bpFundingSourcesService = createSupabaseCrudService('bp_funding_sources');
export const bpLinksService = createSupabaseCrudService('bp_links');
export const bpRisksService = createSupabaseCrudService('bp_risks');
export const priceCatalogService = createSupabaseCrudService('price_catalog');
export const bpVersionsService = createSupabaseCrudService('bp_versions');
export const bpLinesHistoryService = createSupabaseCrudService('bp_lines_history');
