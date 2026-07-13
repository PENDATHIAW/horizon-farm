import { eventIds } from './sideEffectIds.js';
import { attachIdempotency, buildIdempotencyKey, findByRecordId, WORKFLOW_TYPES } from './workflowDedupe.js';

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value) => String(value || '').trim();

export function buildMortalityEvent({ lot = {}, before: _before = {}, after = {}, source = 'modification lot avicole', delta = 0 } = {}) {
  const lotId = clean(lot.id || after.id);
  const date = today();
  const eventId = eventIds.mortality(lotId, date, delta || 'delta');
  const idempotencyKey = buildIdempotencyKey({
    workflowType: WORKFLOW_TYPES.MORTALITY,
    sourceModule: 'avicole',
    sourceRecordId: lotId,
    movementRef: `${date}:${delta}`,
    issueKey: `mortality:${lotId}:${date}:${delta}`,
  });
  return attachIdempotency({
    id: eventId,
    module: 'avicole',
    source_type: 'lot_avicole',
    source_id: lotId,
    title: `Pertes lot avicole · ${after.name || after.nom || lotId}`,
    description: source,
    severity: 'warning',
    status: 'nouveau',
    date,
    type_evenement: 'perte_avicole',
    event_type: 'perte_avicole',
    module_source: 'avicole',
    entity_type: 'lot_avicole',
    entity_id: lotId,
  }, idempotencyKey, { workflowType: WORKFLOW_TYPES.MORTALITY, sourceModule: 'avicole', sourceRecordId: lotId });
}

export async function runMortalitySideEffects({
  lot = {},
  before = {},
  after = {},
  source = 'modification lot avicole',
  delta = 0,
  businessEvents = [],
  handlers = {},
} = {}) {
  const event = buildMortalityEvent({ lot, before, after, source, delta });
  const existing = findByRecordId(businessEvents, event.id);
  if (existing) return { skipped: true, reason: 'mortality_event_exists', existing };
  await handlers.onCreateBusinessEvent?.(event);
  return { skipped: false, event };
}

export function buildEggProductionRecord({ lot = {}, payload = {}, date = today() } = {}) {
  const lotId = clean(lot.id || payload.lot_id);
  const recordDate = clean(payload.date || date);
  const recordId = eventIds.eggProduction(lotId, recordDate);
  const idempotencyKey = buildIdempotencyKey({
    workflowType: WORKFLOW_TYPES.EGG_PRODUCTION,
    sourceModule: 'avicole',
    sourceRecordId: lotId,
    movementRef: recordDate,
  });
  return attachIdempotency({
    ...payload,
    id: payload.id || recordId,
    lot_id: lotId,
    date: recordDate,
  }, idempotencyKey, { workflowType: WORKFLOW_TYPES.EGG_PRODUCTION, sourceModule: 'avicole', sourceRecordId: lotId });
}

export async function runEggProductionSideEffects({
  lot = {},
  payload = {},
  existingLogs = [],
  handlers = {},
} = {}) {
  const record = buildEggProductionRecord({ lot, payload });
  const existing = findByRecordId(existingLogs, record.id);
  if (existing) return { skipped: true, reason: 'egg_production_exists', existing };
  await handlers.onCreateProduction?.(record);
  return { skipped: false, record };
}
