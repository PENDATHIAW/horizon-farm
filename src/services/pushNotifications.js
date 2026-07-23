import {
  pushSupported,
  getPublicVapidKey,
  getLocalPushSubscriptions,
  persistPushSubscription,
  getPushRegistration,
  getPushApiHeaders,
} from '../utils/pushSubscriptions.js';

const LOCAL_SUBS_KEY = 'horizon_farm_push_subscriptions_v1';

function clean(value) { return String(value ?? '').trim(); }

function base64ToUint8Array(base64String = '') {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported() {
  return pushSupported();
}

export async function requestNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await getPushRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? subscription.toJSON() : null;
  } catch {
    // Fallback local (si le service worker est indisponible)
    const local = getLocalPushSubscriptions();
    const endpoint = local?.[0]?.subscription?.endpoint;
    if (!endpoint) return null;
    return local?.[0]?.subscription || null;
  }
}

export async function subscribeToPushNotifications(user = {}) {
  if (!isPushSupported()) throw new Error('Push non supporté');

  const vapidPublicKey = getPublicVapidKey();
  if (!clean(vapidPublicKey)) throw new Error('VITE_VAPID_PUBLIC_KEY manquant');

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') throw new Error(`Notifications non autorisées: ${permission}`);

  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(vapidPublicKey),
    });
  }

  const payload = {
    userId: user?.userId || 'owner',
    label: user?.label || 'Appareil Horizon Farm',
    channels: Array.isArray(user?.channels) ? user.channels : ['urgence', 'critique'],
    subscription: subscription.toJSON(),
    created_at: new Date().toISOString(),
  };

  await persistPushSubscription(payload);
  return payload;
}

export async function unsubscribeFromPushNotifications(_user = {}) {
  if (!isPushSupported()) return { ok: true, skipped: true, reason: 'unsupported' };

  const subscription = await getExistingSubscription();
  const endpoint = subscription?.endpoint;

  if (!endpoint) return { ok: true, skipped: true, reason: 'no_subscription' };

  // Notifier le backend pour désactiver la subscription
  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: await getPushApiHeaders(),
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Même si l’API échoue, on tente de désabonner côté navigateur.
  }

  // Désabonnement navigateur
  try {
    const registration = await getPushRegistration();
    const existing = await registration.pushManager.getSubscription();
    await existing?.unsubscribe?.();
  } catch {
    // ignore
  }

  // Nettoyage local fallback
  try {
    const local = getLocalPushSubscriptions();
    const next = local.filter((item) => item?.subscription?.endpoint !== endpoint);
    window.localStorage.setItem(LOCAL_SUBS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  return { ok: true, unsubscribed: true, endpoint };
}

export async function sendTestPushNotification({ title, body, severity = 'critique', module = 'alertes' } = {}) {
  if (!isPushSupported()) throw new Error('Push non supporté');

  const localSubscriptions = getLocalPushSubscriptions();
  const response = await fetch('/api/push/test', {
    method: 'POST',
    headers: await getPushApiHeaders(),
    body: JSON.stringify({
      title: clean(title) || 'Test Horizon Farm',
      body: clean(body) || 'Notification push de test.',
      severity,
      module,
      localSubscriptions,
    }),
  });

  if (!response.ok) throw new Error('Envoi push test impossible');
  return response.json();
}
