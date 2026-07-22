import toast from 'react-hot-toast';

const LOCAL_SUBS_KEY = 'horizon_farm_push_subscriptions_v1';
const clean = (value) => String(value || '').trim();

function base64ToUint8Array(base64String = '') {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPublicVapidKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
}

export async function registerPushServiceWorker() {
  if (!pushSupported()) throw new Error('Notifications push non supportées sur cet appareil');
  return navigator.serviceWorker.register('/sw.js');
}

export async function getPushRegistration() {
  const registration = await registerPushServiceWorker();
  await navigator.serviceWorker.ready;
  return registration;
}

export async function subscribeDeviceToPush({ userId = 'owner', label = 'Appareil principal', channels = ['urgence', 'critique'], role = '' } = {}) {
  if (!pushSupported()) throw new Error('Push non supporté');
  const publicKey = getPublicVapidKey();
  if (!publicKey) throw new Error('VITE_VAPID_PUBLIC_KEY manquant');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications non autorisées');
  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) });
  }
  // role : rôle RACI de l'appareil (facultatif) pour le ciblage des notifications.
  const payload = { userId, label, channels, role, subscription: subscription.toJSON(), created_at: new Date().toISOString() };
  await persistPushSubscription(payload);
  toast.success('Appareil abonné aux alertes push');
  return payload;
}

export async function persistPushSubscription(payload) {
  try {
    const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (response.ok) return response.json();
  } catch {
    // fallback local ci-dessous
  }
  const current = getLocalPushSubscriptions();
  const endpoint = payload?.subscription?.endpoint;
  const next = [...current.filter((item) => item?.subscription?.endpoint !== endpoint), { ...payload, storage: 'local_fallback' }];
  window.localStorage.setItem(LOCAL_SUBS_KEY, JSON.stringify(next));
  return { ok: true, storage: 'local_fallback' };
}

export function getLocalPushSubscriptions() {
  try { return JSON.parse(window.localStorage.getItem(LOCAL_SUBS_KEY) || '[]'); } catch { return []; }
}

export async function sendTestPush({ title = 'Test Horizon Farm', body = 'Notification push de test.', severity = 'info', module = 'alertes' } = {}) {
  const payload = { title, body, severity, module, url: `/?module=${module}`, requireInteraction: severity === 'urgence' };
  const localSubscriptions = getLocalPushSubscriptions();
  const response = await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, localSubscriptions }) });
  if (!response.ok) throw new Error('Envoi push impossible');
  return response.json();
}

export function pushSetupStatus() {
  if (!pushSupported()) return { supported: false, ready: false, reason: 'unsupported' };
  if (!clean(getPublicVapidKey())) return { supported: true, ready: false, reason: 'missing_vapid_public_key' };
  return { supported: true, ready: true, reason: 'ready' };
}
