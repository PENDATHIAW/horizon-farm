import { normalizeTraceEvent } from '../utils/traceabilityWorkflows';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v = '') => String(v || '').toLowerCase();

function dedupeKey(event = {}) {
  return String(event.id || `${event.event_type}-${event.event_date}-${event.title}`);
}

export function normalizeAuditLogEntry(log = {}) {
  const action = log.action || log.event_type || log.operation || 'action_admin';
  const moduleSource = log.module || log.module_source || log.entity_type || 'gestion_systeme';
  const entityId = log.entity_id || log.record_id || log.target_id || log.user_id || log.id || '';
  return normalizeTraceEvent({
    id: log.id ? `audit-${log.id}` : undefined,
    event_type: action,
    module_source: moduleSource,
    entity_type: log.entity_type || moduleSource,
    entity_id: entityId,
    title: log.title || log.message || log.description || `Action admin : ${action}`,
    description: log.details || log.description || log.message || log.changes || '',
    event_date: log.created_at || log.timestamp || log.date || new Date().toISOString(),
    severity: log.severity || (low(action).includes('delete') || low(action).includes('suppr') ? 'warning' : 'info'),
    source_kind: 'audit_log',
    audit_log_id: log.id || '',
    actor: log.user_email || log.user_name || log.actor || '',
  });
}

export function mergeAuditLogsIntoTraceFeed(events = [], auditLogs = []) {
  const normalizedEvents = arr(events).map(normalizeTraceEvent);
  const normalizedAudit = arr(auditLogs).map(normalizeAuditLogEntry);
  const seen = new Set();
  const merged = [];
  [...normalizedEvents, ...normalizedAudit].forEach((event) => {
    const key = dedupeKey(event);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(event);
  });
  return merged.sort((a, b) => String(b.event_date || '').localeCompare(String(a.event_date || '')));
}

export function summarizeAdminTraceCoverage(events = [], auditLogs = []) {
  const adminEvents = mergeAuditLogsIntoTraceFeed(events, auditLogs).filter((event) => {
    const text = low(`${event.module_source} ${event.event_type} ${event.title}`);
    return text.includes('admin') || text.includes('system') || text.includes('gestion') || event.source_kind === 'audit_log';
  });
  const missing = adminEvents.filter((event) => !event.has_source);
  return {
    total: adminEvents.length,
    missing,
    withSource: adminEvents.length - missing.length,
    coverageRate: adminEvents.length ? Math.round(((adminEvents.length - missing.length) / adminEvents.length) * 100) : 100,
  };
}
