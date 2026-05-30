const FILTER_CACHE_LIMIT = 512;
const filteredRowsCache = new Map();

function rowCacheToken(row = {}) {
  return row.id ?? row.created_at ?? row.updated_at ?? '';
}

export function periodFilterCacheKey(rows = [], scopeKey = '', generation = '', label = '') {
  const list = Array.isArray(rows) ? rows : [];
  const head = rowCacheToken(list[0]);
  const tail = rowCacheToken(list[list.length - 1]);
  return `${generation}|${label}|${scopeKey}|${list.length}|${head}|${tail}`;
}

export function readCachedFilteredRows(key) {
  return filteredRowsCache.get(key);
}

export function writeCachedFilteredRows(key, value) {
  if (filteredRowsCache.size >= FILTER_CACHE_LIMIT) filteredRowsCache.clear();
  filteredRowsCache.set(key, value);
}

export function clearPeriodFilterCache() {
  filteredRowsCache.clear();
}
