function clean(value) {
  return String(value ?? '').trim();
}

// Conversion VAPID public key base64/base64url → Uint8Array (P-256)
// Compatible with both Node (Buffer) and browser (atob fallback if needed).
export function vapidPublicKeyBase64ToUint8Array(base64String = '') {
  const raw = clean(base64String);
  const padding = '='.repeat((4 - (raw.length % 4)) % 4);
  const base64 = (raw + padding).replace(/-/g, '+').replace(/_/g, '/');

  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return Uint8Array.from(buf);
  }

  // Browser fallback
  // eslint-disable-next-line no-undef
  const binary = window.atob(base64);
  return Uint8Array.from([...binary].map((c) => c.charCodeAt(0)));
}

