import { createSupabaseCrudService } from './baseSupabaseService';
import { makeId } from '../utils/ids';

const crud = createSupabaseCrudService('business_events');

export const businessEventsService = crud;

export const createBusinessEvent = async ({
  event_type,
  module_source,
  entity_type,
  entity_id,
  title,
  description = '',
  amount = null,
  event_date = new Date().toISOString(),
  linked_document_id = null,
  linked_transaction_id = null,
  linked_sale_id = null,
  severity = 'info',
}) => {
  try {
    return await crud.create({
      id: makeId('EVT'),
      event_type,
      module_source,
      entity_type: String(entity_type || 'autre'),
      entity_id: String(entity_id || ''),
      title,
      description,
      amount,
      event_date,
      linked_document_id,
      linked_transaction_id,
      linked_sale_id,
      severity,
    });
  } catch (error) {
    console.warn('[businessEvents] createBusinessEvent non-bloquant:', error.message);
    return null;
  }
};
