/** Regroupe les rafraîchissements CRUD pour éviter des dizaines de getAll() consécutifs. */
export function createModuleRefreshScheduler(fetchModule, { debounceMs = 400, suppressMs = 2500 } = {}) {
  const pending = new Set();
  const suppressUntil = new Map();
  let timer = null;

  const markLocalWrite = (moduleKey) => {
    if (!moduleKey) return;
    suppressUntil.set(moduleKey, Date.now() + suppressMs);
  };

  const shouldSuppressRealtime = (moduleKey) => Date.now() < (suppressUntil.get(moduleKey) || 0);

  const flush = async () => {
    timer = null;
    const keys = [...pending];
    pending.clear();
    if (!keys.length) return;
    await Promise.allSettled(keys.map((key) => fetchModule(key)));
  };

  const schedule = (moduleKey) => {
    if (!moduleKey) return;
    pending.add(moduleKey);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, debounceMs);
  };

  const refreshNow = async (moduleKey) => {
    if (!moduleKey) return;
    pending.delete(moduleKey);
    if (timer && pending.size === 0) {
      clearTimeout(timer);
      timer = null;
    }
    await fetchModule(moduleKey);
  };

  const scheduleMany = (moduleKeys = []) => {
    moduleKeys.filter(Boolean).forEach((key) => schedule(key));
  };

  return {
    markLocalWrite,
    shouldSuppressRealtime,
    schedule,
    scheduleMany,
    refreshNow,
    flush,
  };
}
