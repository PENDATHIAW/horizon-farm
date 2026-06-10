import { createSupabaseCrudService } from './baseSupabaseService';
import { makeId } from '../utils/ids';
import { buildIssueKey } from './issueLinkingService';

const crud = createSupabaseCrudService('business_events');

export const businessEventsService = crud;

/** Idempotence — évite double business_event sur même issue_key. */
export function findDuplicateBusinessEvent(row = {}, events = []) {
  const issueKey = clean(row.issue_key);
  const entityId = clean(row.entity_id || row.source_record_id);
  const eventType = lower(row.event_type || '');
  const module = lower(row.module_source || row.source_module || '');

  return arr(events).find((existing) => {
    if (issueKey && clean(existing.issue_key) === issueKey) return true;
    if (
      eventType
      && module
      && entityId
      && lower(existing.event_type || '') === eventType
      && lower(existing.module_source || existing.source_module || '') === module
      && clean(existing.entity_id || existing.source_record_id) === entityId
      && clean(existing.linked_sale_id) === clean(row.linked_sale_id)
    ) {
      return true;
    }
    return false;
  }) || null;
}

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();

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
