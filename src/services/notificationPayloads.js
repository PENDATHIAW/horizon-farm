const clean = (value) => String(value ?? '').trim();

export function severityEmoji(severity = '') {
  const s = clean(severity).toLowerCase();
  if (s === 'urgence') return '🚨';
  if (s === 'critique') return '⚠️';
  if (s === 'warning') return '⚡';
  return 'ℹ️';
}

export function resolveAlertTag(alert = {}) {
  // Priorité déduplication : issue_key → alert_dedupe_key → dedupe_key → fallback
  return clean(alert.issue_key)
    || clean(alert.alert_dedupe_key)
    || clean(alert.dedupe_key)
    || clean(alert.id)
    || clean(alert.entity_id)
    || 'horizon-farm-alert';
}

export function resolveDeepLinkUrl(alert = {}) {
  // Par défaut : ouvrir le centre d’alertes et tenter de filtrer sur alert_id.
  const alertId = clean(alert.id);
  const params = new URLSearchParams();
  params.set('module', 'alertes');
  if (alertId) params.set('alert_id', alertId);
  return `/?${params.toString()}`;
}

export function buildNotificationPayloadFromAlert(alert = {}, options = {}) {
  const severity = clean(alert.severity || alert.gravite || 'critique').toLowerCase();
  const emoji = severityEmoji(severity);

  const titleBase = clean(alert.title) || clean(alert.action_recommandee) || 'Alerte Horizon Farm';
  const title = `${emoji} ${severity === 'urgence' ? 'Urgence' : severity === 'critique' ? 'Critique' : severity.toUpperCase()} — ${titleBase}`;

  const message = clean(alert.message);
  const actionText = clean(alert.action_recommandee || alert.action);

  const lines = [];
  if (message) lines.push(message);
  if (actionText) lines.push(`Action : ${actionText}`);
  if (clean(alert.module_source)) lines.push(`Module : ${alert.module_source}`);
  if (clean(alert.entity_id)) lines.push(`Concerné : ${alert.entity_id}`);

  const body = lines.join('\n') || 'Une action est nécessaire.\nAction : ouvrir Horizon Farm.';

  const tag = resolveAlertTag(alert);

  return {
    title,
    body,
    icon: options.icon || '/brand-icon-192.png',
    badge: options.badge || '/brand-icon-192.png',
    tag,
    severity,
    renotify: ['critique', 'urgence'].includes(severity),
    requireInteraction: true,

    // Utilisé pour le routing de notificationclick
    module: 'alertes',
    url: resolveDeepLinkUrl(alert),

    // Données utiles côté service worker (et app)
    alert_id: clean(alert.id),
    module_source: clean(alert.module_source),
    entity_type: clean(alert.entity_type),
    entity_id: clean(alert.entity_id),
  };
}

