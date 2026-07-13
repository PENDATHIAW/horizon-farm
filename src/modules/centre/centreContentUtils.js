/** Utilitaires partagés - dédoublonnage contenu Centre décisionnel. */

export function normalizeTitle(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function titleOverlaps(title = '', keys = []) {
  const normalized = normalizeTitle(title);
  if (!normalized) return false;
  return keys.some((key) => {
    if (!key) return false;
    return normalized.includes(key) || key.includes(normalized);
  });
}

export function buildTitleKeys(items = []) {
  return items.map((item) => normalizeTitle(item.title)).filter(Boolean);
}

export function dedupeByTitle(rows = [], limit = 5, excludeKeys = []) {
  const exclude = new Set(excludeKeys.map(normalizeTitle).filter(Boolean));
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const key = normalizeTitle(row.title);
    if (!key || seen.has(key)) continue;
    if (exclude.has(key) || titleOverlaps(key, [...exclude])) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }

  return out;
}

export function filterByExcludedTitles(items = [], excludeKeys = []) {
  if (!excludeKeys.length) return items;
  return items.filter((item) => !titleOverlaps(item.title || item.status || item.eventLabel, excludeKeys));
}
