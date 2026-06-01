const clean = (value) => String(value ?? '').trim();
const norm = (value) => clean(value).toLowerCase().replace(/[\s:|/]+/g, '_');

const SUPPORTED_ORIGIN_TYPES = new Set([
  'manual',
  'automatic',
  'workflow',
  'ia_suggestion',
  'system',
  'imported',
]);

function inferOriginType(payload = {}) {
  const explicit = norm(payload.origin_type);
  if (SUPPORTED_ORIGIN_TYPES.has(explicit)) return explicit;

  const createdFrom = norm(payload.created_from || payload.source || payload.source_type);
  if (createdFrom.includes('ia') || createdFrom.includes('assistant') || payload.created_by_ai) return 'ia_suggestion';
  if (createdFrom.includes('workflow') || clean(payload.workflow_id)) return 'workflow';
  if (payload.isAuto || payload.technical_rule || createdFrom.includes('auto')) return 'automatic';
  if (createdFrom.includes('import')) return 'imported';
  if (createdFrom.includes('system')) return 'system';
  return 'manual';
}

function fallbackRecordId(payload = {}, idField = 'id') {
  return clean(payload.source_record_id)
    || clean(payload.related_record_id)
    || clean(payload.entity_id)
    || clean(payload.related_id)
    || clean(payload[idField])
    || clean(payload.id)
    || 'unknown';
}

export function buildIssueKey({
  domain = 'general',
  sourceModule = 'system',
  sourceRecordId = 'unknown',
  kind = 'default',
} = {}) {
  return [norm(domain), norm(sourceModule), norm(sourceRecordId), norm(kind)].join(':');
}

function inferIssueKey(moduleKey, payload = {}, idField = 'id') {
  if (clean(payload.issue_key)) return clean(payload.issue_key);
  if (clean(payload.alert_dedupe_key)) return clean(payload.alert_dedupe_key);
  if (clean(payload.dedupe_key)) return clean(payload.dedupe_key);

  const sourceModule = clean(payload.source_module)
    || clean(payload.module_source)
    || clean(payload.module_lie)
    || clean(moduleKey)
    || 'system';

  const sourceRecordId = fallbackRecordId(payload, idField);
  const kind = clean(payload.action_recommandee)
    || clean(payload.event_type)
    || clean(payload.title)
    || clean(payload.type)
    || clean(moduleKey)
    || 'record';

  return buildIssueKey({
    domain: moduleKey,
    sourceModule,
    sourceRecordId,
    kind,
  });
}

export function enrichLinkedFields(moduleKey, payload = {}, idField = 'id') {
  const sourceModule = clean(payload.source_module)
    || clean(payload.module_source)
    || clean(payload.module_lie)
    || clean(moduleKey)
    || 'system';

  const sourceRecordId = fallbackRecordId(payload, idField);
  const relatedModule = clean(payload.related_module)
    || clean(payload.module_lie)
    || clean(payload.module_source)
    || clean(moduleKey);
  const relatedRecordId = clean(payload.related_record_id)
    || clean(payload.related_id)
    || clean(payload.entity_id)
    || sourceRecordId;

  return {
    ...payload,
    issue_key: inferIssueKey(moduleKey, payload, idField),
    source_module: sourceModule,
    source_record_id: sourceRecordId,
    related_module: relatedModule,
    related_record_id: relatedRecordId,
    origin_type: inferOriginType(payload),
    workflow_id: clean(payload.workflow_id) || null,
  };
}

