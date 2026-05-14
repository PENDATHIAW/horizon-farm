import { createSupabaseCrudService } from './baseSupabaseService';

export const marketPriceSourcesService = createSupabaseCrudService('market_price_sources');
export const marketPricesService = createSupabaseCrudService('market_prices');
export const marketCalendarEventsService = createSupabaseCrudService('market_calendar_events');
