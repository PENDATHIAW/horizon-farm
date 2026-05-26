const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();

export const closedAlertStatuses = ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'cloturee', 'clôturée', 'ignoree', 'ignorée', 'done', 'closed'];

export function alertDedupeKey(alert = {}) {
  return clean(alert.alert_dedupe_key || alert.dedupe_key || `${alert.module_source || alert.module || 'alertes'}:${alert.entity_type || 'alerte'}:${alert.entity_id || alert.related_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`);
}

export function isAlertResolved(alert = {}) {
  return closedAlertStatuses.includes(lower(alert.status || alert.statut || alert.etat));
}

export function dedupeAlertsBySource(alertes = []) {
  const map = new Map();
  arr(alertes).forEach((alert) => {
    const key = alertDedupeKey(alert);
    if (!key) return;
    const previous = map.get(key);
    if (!previous) { map.set(key, alert); return; }
    if (isAlertResolved(alert) && !isAlertResolved(previous)) return;
    if (!isAlertResolved(alert) && isAlertResolved(previous)) { map.set(key, alert); return; }
    const prevDate = new Date(previous.updated_at || previous.created_at || 0).getTime();
    const nextDate = new Date(alert.updated_at || alert.created_at || 0).getTime();
    if (nextDate >= prevDate) map.set(key, { ...previous, ...alert });
  });
  return [...map.values()];
}
