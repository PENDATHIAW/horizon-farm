const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export const WORKFLOW_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
  PAYMENT: 'payment',
  STOCK_EXIT: 'stock_exit',
  FEEDING: 'feeding',
  HEALTH: 'health',
  MORTALITY: 'mortality',
  EGG_PRODUCTION: 'egg_production',
  HARVEST: 'harvest',
  MAINTENANCE: 'maintenance',
  PAYROLL: 'payroll',
  DOCUMENT_LINK: 'document_link',
  PUSH: 'push',
};

export function buildIdempotencyKey({
  workflowType = '',
  sourceModule = '',
  sourceRecordId = '',
  targetAction = '',
  movementRef = '',
  issueKey = '',
} = {}) {
  if (issueKey) return clean(issueKey);
  return [workflowType, sourceModule, sourceRecordId, targetAction, movementRef].filter(Boolean).join(':');
}

export function buildIssueKey(params = {}) {
  return buildIdempotencyKey(params);
}

export function recordDedupeKey(row = {}) {
  return clean(
    row.idempotency_key
    || row.issue_key
    || row.task_dedupe_key
    || row.alert_dedupe_key
    || row.event_dedupe_key
    || row.dedupe_key
    || row.action_key
    || '',
  );
}

export function openStatus(row = {}) {
  return !['termine', 'terminé', 'done', 'traitee', 'traitée', 'annule', 'annulé', 'closed', 'resolue', 'résolue', 'clos'].includes(lower(row.status || row.statut));
}

export function findByIdempotencyKey(rows = [], key = '') {
  const target = clean(key);
  if (!target) return null;
  return arr(rows).find((row) => recordDedupeKey(row) === target) || null;
}

export function findByRecordId(rows = [], id = '') {
  const target = clean(id);
  if (!target) return null;
  return arr(rows).find((row) => clean(row.id) === target) || null;
}

export function hasOpenDedupeRecord(rows = [], dedupeKey = '', isOpen = openStatus) {
  const key = clean(dedupeKey);
  if (!key) return false;
  return arr(rows).some((row) => isOpen(row) && recordDedupeKey(row) === key);
}

export function shouldSkipCreation({ existingRows = [], idempotencyKey = '', recordId = '' } = {}) {
  if (recordId) {
    const existing = findByRecordId(existingRows, recordId);
    if (existing) return { skip: true, reason: 'record_exists', existing };
  }
  if (idempotencyKey) {
    const existing = findByIdempotencyKey(existingRows, idempotencyKey);
    if (existing) return { skip: true, reason: 'idempotency_key_exists', existing };
  }
  return { skip: false };
}

export function attachIdempotency(record = {}, key = '', meta = {}) {
  const idempotencyKey = clean(key);
  if (!idempotencyKey) return { ...record, side_effects_managed: record.side_effects_managed ?? true };
  return {
    ...record,
    idempotency_key: record.idempotency_key || idempotencyKey,
    issue_key: record.issue_key || idempotencyKey,
    source_module: record.source_module || meta.sourceModule || record.module_source || '',
    source_record_id: record.source_record_id || meta.sourceRecordId || record.related_id || record.entity_id || '',
    task_dedupe_key: record.task_dedupe_key || idempotencyKey,
    action_key: record.action_key || idempotencyKey,
    dedupe_key: record.dedupe_key || idempotencyKey,
    side_effects_managed: record.side_effects_managed ?? true,
    workflow_meta: {
      ...(record.workflow_meta || {}),
      idempotency_key: idempotencyKey,
      ...(meta.workflowType ? { workflow_type: meta.workflowType } : {}),
    },
  };
}

export function createInFlightGuard() {
  const store = new Map();
  return {
    isLocked(key) {
      return store.has(clean(key));
    },
    async run(key, fn) {
      const target = clean(key);
      if (!target) {
        const result = await fn();
        return { skipped: false, result };
      }
      if (store.has(target)) return { skipped: true, reason: 'in_flight' };
      store.set(target, true);
      try {
        const result = await fn();
        return { skipped: false, result };
      } finally {
        store.delete(target);
      }
    },
  };
}

export const globalInFlightGuard = createInFlightGuard();

export async function runIdempotentWorkflow({
  idempotencyKey = '',
  inFlight = globalInFlightGuard,
  existingRows = [],
  recordId = '',
  openRows = [],
  checkOpen = false,
  run,
} = {}) {
  const skip = shouldSkipCreation({ existingRows, idempotencyKey, recordId });
  if (skip.skip) return { skipped: true, reason: skip.reason, existing: skip.existing };
  if (checkOpen && hasOpenDedupeRecord(openRows, idempotencyKey)) {
    return { skipped: true, reason: 'open_duplicate' };
  }
  const guardKey = idempotencyKey || recordId;
  const guarded = await inFlight.run(guardKey, run);
  if (guarded.skipped) return guarded;
  return { skipped: false, result: guarded.result };
}
