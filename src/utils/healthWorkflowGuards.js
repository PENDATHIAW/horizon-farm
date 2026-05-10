const clean = (value) => String(value || '').trim().toLowerCase();
const arr = (value) => Array.isArray(value) ? value : [];

function sameEntity(row = {}, entityId = '') {
  const id = clean(entityId);
  return id && [row.entity_id, row.related_id, row.source_record_id, row.entityId, row.relatedId].some((value) => clean(value) === id);
}

function sameDay(row = {}, date = '') {
  const expected = String(date || '').slice(0, 10);
  const current = String(row.event_date || row.created_at || row.date || row.due_date || '').slice(0, 10);
  return expected && current === expected;
}

export function hasSimilarHealthEvent({ events = [], entityId = '', date = '', type = '' } = {}) {
  const typeKey = clean(type);
  return arr(events).some((event) => sameEntity(event, entityId) && sameDay(event, date) && clean(`${event.event_type || ''} ${event.title || ''}`).includes(typeKey));
}

export function hasSimilarHealthTask({ tasks = [], entityId = '', date = '', type = '' } = {}) {
  const typeKey = clean(type);
  return arr(tasks).some((task) => sameEntity(task, entityId) && sameDay(task, date) && clean(`${task.title || ''} ${task.module_lie || ''}`).includes(typeKey));
}

export function hasSimilarHealthAlert({ alerts = [], entityId = '', type = '' } = {}) {
  const typeKey = clean(type);
  return arr(alerts).some((alert) => sameEntity(alert, entityId) && clean(`${alert.title || ''} ${alert.message || ''} ${alert.module_source || ''}`).includes(typeKey));
}

export function healthWorkflowDuplicateReport({ tasks = [], alerts = [], events = [], entityId = '', date = '', type = 'sante' } = {}) {
  return {
    hasEvent: hasSimilarHealthEvent({ events, entityId, date, type }),
    hasTask: hasSimilarHealthTask({ tasks, entityId, date, type }),
    hasAlert: hasSimilarHealthAlert({ alerts, entityId, type }),
  };
}
