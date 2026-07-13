/* global __APP_BUILD_SHA__ */

const STALE_BUILD_MARKERS = ['index-DrX_eSIh', 'index-DU6ne3u9', 'index-C6b11YcK', 'index-CC7OqkEB', 'index-CORKCWhl'];
const BUILD_SHA_STORAGE_KEY = 'horizon-farm-app-build';
const LEGACY_BUILD_SHA_KEY = 'horizon-farm-build-sha';

export function currentAppScriptSrc() {
  const script = document.querySelector('script[src*="/assets/index-"]');
  return script?.getAttribute('src') || '';
}

export function isStaleAppBundle() {
  const src = currentAppScriptSrc();
  if (!src) return false;
  return STALE_BUILD_MARKERS.some((marker) => src.includes(marker));
}

export function currentBuildSha() {
  return typeof __APP_BUILD_SHA__ !== 'undefined' ? __APP_BUILD_SHA__ : 'dev';
}

export async function clearAllCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export async function purgeStalePwaCache({ reload = true } = {}) {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
  await clearAllCaches();
  try {
    localStorage.removeItem(BUILD_SHA_STORAGE_KEY);
    localStorage.removeItem(LEGACY_BUILD_SHA_KEY);
  } catch {
    // ignore
  }
  if (reload) window.location.reload();
}

/** Purge si le bundle embarqué ne correspond pas au SHA mémorisé (mix preview / PWA). */
export async function syncBuildVersion({ reload = true } = {}) {
  const sha = currentBuildSha();
  if (!sha || sha === 'dev') return false;

  const seen = localStorage.getItem(BUILD_SHA_STORAGE_KEY);
  localStorage.setItem(BUILD_SHA_STORAGE_KEY, sha);

  if (seen && seen !== sha) {
    await purgeStalePwaCache({ reload });
    return true;
  }
  return false;
}

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    if (isStaleAppBundle()) {
      await purgeStalePwaCache({ reload: true });
      return;
    }

    try {
      await syncBuildVersion({ reload: true });
    } catch {
      // ignore
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch {
      // L'app reste utilisable sans service worker.
    }
  });
};
