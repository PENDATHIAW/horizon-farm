const STORAGE_PREFIX = 'horizon-centre-dismissed';

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function todayKey() {
  return `${STORAGE_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
}

function normalizeTitle(title = '') {
  return String(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(risque|tache|alerte)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDismissedPriorityKeys() {
  if (!hasStorage()) return new Set();
  try {
    const raw = localStorage.getItem(todayKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function dismissPriorityItem(item = {}) {
  if (!hasStorage()) return false;
  const keys = getDismissedPriorityKeys();
  keys.add(String(item.id || normalizeTitle(item.title)));
  if (item.title) keys.add(normalizeTitle(item.title));
  localStorage.setItem(todayKey(), JSON.stringify([...keys]));
  return true;
}

export function isPriorityDismissed(item = {}, dismissed = getDismissedPriorityKeys()) {
  if (!item?.id && !item?.title) return false;
  return dismissed.has(String(item.id)) || dismissed.has(normalizeTitle(item.title));
}
