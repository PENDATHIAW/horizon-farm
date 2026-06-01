const STALE_BUILD_MARKERS = ['index-DrX_eSIh', 'index-DU6ne3u9', 'index-C6b11YcK', 'index-CC7OqkEB', 'index-CORKCWhl'];

export function currentAppScriptSrc() {
  const script = document.querySelector('script[src*="/assets/index-"]');
  return script?.getAttribute('src') || '';
}

export function isStaleAppBundle() {
  const src = currentAppScriptSrc();
  if (!src) return false;
  return STALE_BUILD_MARKERS.some((marker) => src.includes(marker));
}

async function clearAllCaches() {
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
    localStorage.removeItem('horizon-farm-build-sha');
  } catch {
    // ignore
  }
  if (reload) window.location.reload();
}

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    if (isStaleAppBundle()) {
      await purgeStalePwaCache({ reload: true });
      return;
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
