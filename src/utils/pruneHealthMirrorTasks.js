import { isHealthEngineMirrorTask, stripRepeatedPrefix } from './healthFindingLabels.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const closed = new Set(['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu', 'annule', 'annulé']);

function isClosed(task = {}) {
  return closed.has(String(task.status || task.statut || '').toLowerCase());
}

function normalizedMirrorTitle(task = {}) {
  return stripRepeatedPrefix(task.title || task.id || '', 'Tâche critique').toLowerCase();
}

/**
 * Identifie les tâches miroir IA en double (boucle « Tâche critique : Tâche critique : … »).
 * Garde la plus ancienne ouverte par clé métier ; les autres peuvent être clôturées.
 */
export function findDuplicateHealthMirrorTasks(tasks = []) {
  const open = arr(tasks).filter((task) => !isClosed(task));
  const groups = new Map();

  open.forEach((task) => {
    const isMirror = isHealthEngineMirrorTask(task)
      || String(task.title || '').toLowerCase().includes('tâche critique : tâche critique');
    if (!isMirror) return;

    const key = task.source_record_id
      || task.related_id
      || `${task.module_lie || 'task'}:${normalizedMirrorTitle(task)}`;
    const bucket = groups.get(key) || [];
    bucket.push(task);
    groups.set(key, bucket);
  });

  const toClose = [];
  groups.forEach((bucket) => {
    if (bucket.length <= 1) return;
    const sorted = [...bucket].sort((a, b) => String(a.created_at || a.id).localeCompare(String(b.created_at || b.id)));
    toClose.push(...sorted.slice(1));
  });

  return toClose;
}

export async function closeDuplicateHealthMirrorTasks(tasks = [], onUpdateTask) {
  if (typeof onUpdateTask !== 'function') return { closed: 0, ids: [] };
  const duplicates = findDuplicateHealthMirrorTasks(tasks);
  const ids = [];

  for (const task of duplicates) {
    try {
      await onUpdateTask(task.id, { status: 'termine', notes: `${task.notes || ''} · Doublon IA archivé`.trim() });
      ids.push(task.id);
    } catch {
      // ignore single failure
    }
  }

  return { closed: ids.length, ids };
}
