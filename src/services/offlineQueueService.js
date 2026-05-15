const QUEUE_KEY = 'horizon_farm_offline_queue';

export const readOfflineQueue = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (items = []) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.isArray(items) ? items.filter(Boolean) : []));
};

export const enqueueOfflineMutation = ({ moduleKey, action, id, payload }) => {
  const queue = readOfflineQueue();
  const item = {
    id: `OFF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    moduleKey,
    action,
    recordId: id,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'unknown',
  };
  saveOfflineQueue([...queue, item]);
  return item;
};

export const clearOfflineQueue = () => saveOfflineQueue([]);

export const isBrowserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
