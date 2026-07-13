import { createSupabaseCrudService } from './baseSupabaseService';
import { makeId } from '../utils/ids';
import { buildIssueKey } from './issueLinkingService';
import { findDuplicateBusinessEvent } from './businessEventDedup';

const crud = createSupabaseCrudService('business_events');

export const businessEventsService = crud;

/** Idempotence — réexporté depuis le module pur businessEventDedup. */
export { findDuplicateBusinessEvent };

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
  issue_key = '',
  source_module = '',
  source_record_id = '',
  related_module = '',
  related_record_id = '',
  workflow_id = null,
  origin_type = 'system',
  existingEvents = [],
  skipDuplicate = true,
}) => {
  try {
    const sourceModuleValue = source_module || module_source || 'system';
    const sourceRecordIdValue = source_record_id || entity_id || '';
    const issueKeyValue = issue_key || buildIssueKey({
      domain: event_type || 'event',
      sourceModule: sourceModuleValue,
      sourceRecordId: sourceRecordIdValue || 'unknown',
      kind: title || event_type || 'event',
    });

    const payload = {
      event_type,
      module_source,
      entity_type,
      entity_id,
      issue_key: issueKeyValue,
      linked_sale_id,
    };

    if (skipDuplicate) {
      const dup = findDuplicateBusinessEvent(payload, existingEvents);
      if (dup) return dup;
    }

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
      issue_key: issueKeyValue,
      source_module: sourceModuleValue,
      source_record_id: String(sourceRecordIdValue || ''),
      related_module: related_module || module_source || sourceModuleValue,
      related_record_id: String(related_record_id || entity_id || sourceRecordIdValue || ''),
      workflow_id,
      origin_type,
    });
  } catch (error) {
    console.warn('[businessEvents] createBusinessEvent non-bloquant:', error.message);
    return null;
  }
};
