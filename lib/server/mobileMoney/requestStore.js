/**
 * État des demandes mobile money côté serveur.
 * En production multi-instance, préférer la table payments (reference) + webhook.
 */
const memory = new Map();

export function saveRequest(ref, payload) {
  memory.set(ref, {
    ...payload,
    ref,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return memory.get(ref);
}

export function getRequest(ref) {
  return memory.get(ref) || null;
}

export function markRequest(ref, status, extra = {}) {
  const row = memory.get(ref);
  if (!row) return null;
  const next = { ...row, ...extra, status, updated_at: new Date().toISOString() };
  memory.set(ref, next);
  return next;
}

export function listPending() {
  return [...memory.values()].filter((r) => r.status === 'pending');
}
