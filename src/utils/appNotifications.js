const STORAGE_KEY = 'horizon_farm_app_notifications_v1';
const SETTINGS_KEY = 'horizon_farm_app_notification_settings_v1';

const DEFAULT_SETTINGS = {
  enabled: true,
  critical: true,
  urgency: true,
  warning: false,
  info: false,
  sound: true,
  vibrate: true,
};

const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export function getNotificationSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveNotificationSettings(settings = {}) {
  const next = { ...DEFAULT_SETTINGS, ...settings };
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission() {
  if (!canUseBrowserNotifications()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function shouldNotifyAlert(alert = {}, settings = getNotificationSettings()) {
  if (!settings.enabled) return false;
  const severity = lower(alert.severity || alert.gravite);
  if (severity === 'urgence') return Boolean(settings.urgency);
  if (severity === 'critique') return Boolean(settings.critical);
  if (severity === 'warning') return Boolean(settings.warning);
  if (severity === 'info') return Boolean(settings.info);
  return false;
}

export function appNotificationKey(alert = {}) {
  return `${alert.id || alert.entity_id || 'alert'}:${alert.severity || ''}:${alert.status || 'nouvelle'}`;
}

export function getNotificationHistory() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveNotificationHistory(history = []) {
  const next = Array.isArray(history) ? history.slice(-200) : [];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function alreadyNotified(alert = {}) {
  const key = appNotificationKey(alert);
  return getNotificationHistory().some((item) => item.key === key);
}

export function markNotified(alert = {}, extra = {}) {
  const history = getNotificationHistory();
  const entry = {
    key: appNotificationKey(alert),
    alert_id: alert.id,
    title: alert.title || 'Alerte Horizon Farm',
    severity: alert.severity || 'info',
    module_source: alert.module_source || '',
    entity_id: alert.entity_id || '',
    notified_at: new Date().toISOString(),
    ...extra,
  };
  return saveNotificationHistory([...history.filter((item) => item.key !== entry.key), entry]);
}

export function buildAlertNotification(alert = {}) {
  const severity = String(alert.severity || 'info').toUpperCase();
  const title = `${severity} — ${alert.title || 'Alerte Horizon Farm'}`;
  const body = [alert.message, alert.action_recommandee ? `Action: ${alert.action_recommandee}` : '', alert.module_source ? `Module: ${alert.module_source}` : ''].filter(Boolean).join('\n');
  return { title, body };
}

export async function notifyAlert(alert = {}, options = {}) {
  const settings = getNotificationSettings();
  if (!shouldNotifyAlert(alert, settings)) return { sent: false, reason: 'disabled' };
  if (alreadyNotified(alert) && !options.force) return { sent: false, reason: 'already_notified' };
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { sent: false, reason: permission };
  const { title, body } = buildAlertNotification(alert);
  const notification = new Notification(title, {
    body,
    tag: appNotificationKey(alert),
    renotify: false,
    requireInteraction: lower(alert.severity) === 'urgence',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      alert_id: alert.id,
      module_source: alert.module_source,
      entity_id: alert.entity_id,
      severity: alert.severity,
    },
  });
  notification.onclick = () => {
    window.focus?.();
    window.dispatchEvent(new CustomEvent('horizon-farm-open-alert', { detail: alert }));
    notification.close?.();
  };
  if (settings.vibrate && navigator.vibrate && ['urgence', 'critique'].includes(lower(alert.severity))) {
    navigator.vibrate(lower(alert.severity) === 'urgence' ? [250, 120, 250, 120, 250] : [200, 100, 200]);
  }
  markNotified(alert, { channel: 'browser_notification' });
  return { sent: true };
}

export async function notifyAlerts(alerts = []) {
  const results = [];
  for (const alert of alerts) {
    results.push(await notifyAlert(alert));
  }
  return results;
}
