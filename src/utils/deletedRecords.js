const tombstoneKey = (moduleKey) => `horizon_farm_deleted_ids:${moduleKey}`;

export function readDeletedIds(moduleKey) {
  if (typeof window === 'undefined' || !moduleKey) return new Set();
  try {
    const raw = window.localStorage.getItem(tombstoneKey(moduleKey));
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
}

export function rememberDeletedId(moduleKey, id) {
  if (typeof window === 'undefined' || !moduleKey || !id) return;
  const deleted = readDeletedIds(moduleKey);
  deleted.add(String(id));
  window.localStorage.setItem(tombstoneKey(moduleKey), JSON.stringify([...deleted]));
}

export function forgetDeletedId(moduleKey, id) {
  if (typeof window === 'undefined' || !moduleKey || !id) return;
  const deleted = readDeletedIds(moduleKey);
  if (!deleted.has(String(id))) return;
  deleted.delete(String(id));
  window.localStorage.setItem(tombstoneKey(moduleKey), JSON.stringify([...deleted]));
}

export function filterDeletedRows(moduleKey, rows) {
  const current = Array.isArray(rows) ? rows : [];
  const deleted = readDeletedIds(moduleKey);
  if (!deleted.size) return current;
  return current.filter((row) => !deleted.has(String(row?.id)));
}

export function filterDataMapDeleted(dataMap = {}) {
  return Object.fromEntries(Object.entries(dataMap || {}).map(([key, rows]) => [key, filterDeletedRows(key, rows)]));
}
