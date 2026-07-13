import { purgeStalePwaCache } from '../services/pwa.js';

const CHUNK_RELOAD_FLAG = 'horizon-farm-chunk-reload';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

export async function lazyWithRetry(importer, retries = 2) {
  try {
    return await importer();
  } catch (error) {
    if (!isChunkLoadError(error) || retries <= 0) throw error;

    if (!sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
      await purgeStalePwaCache({ reload: true });
    }

    await new Promise((resolve) => window.setTimeout(resolve, 400));
    return lazyWithRetry(importer, retries - 1);
  }
}

export function installChunkLoadRecovery() {
  const handler = (event) => {
    const reason = event?.reason || event?.error;
    if (!isChunkLoadError(reason)) return;
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
    void purgeStalePwaCache({ reload: true });
  };

  window.addEventListener('unhandledrejection', handler);
  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event?.error || event?.message)) handler(event);
  });
}
