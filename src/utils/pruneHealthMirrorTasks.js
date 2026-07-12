import {
  isHealthEngineMirrorTask,
  isHealthMirrorNoiseTask,
  isOpenTaskStatus,
  sanitizeHealthTaskTitle,
} from './healthFindingLabels.js';

const arr = (value) => (Array.isArray(value) ? value : []);

function normalizedMirrorTitle(task = {}) {
  return sanitizeHealthTaskTitle(task.title || task.id || '').toLowerCase();
}

/**
 * Identifie les tâches miroir IA en double (boucle « Tâche critique : Tâche critique : … »).
 * Garde la plus ancienne ouverte par clé métier ; les autres peuvent être clôturées.
 */
export function findDuplicateHealthMirrorTasks(tasks = []) {
  const open = arr(tasks).filter((task) => isOpenTaskStatus(task));
  const groups = new Map();

  open.forEach((task) => {
    const isMirror = isHealthMirrorNoiseTask(task)
      || isHealthEngineMirrorTask(task)
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

/** Toutes les tâches miroir IA ouvertes à archiver (y compris les singletons uniques par clé). */
export function findHealthMirrorTasksToArchive(tasks = []) {
  return arr(tasks).filter((task) => isOpenTaskStatus(task) && isHealthMirrorNoiseTask(task));
}

async function closeTasksInBatches(tasks = [], onUpdateTask, note = 'Miroir d’analyse archivé') {
  const ids = [];
  const batchSize = 8;

  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map((task) => onUpdateTask(task.id, {
      status: 'termine',
      notes: `${task.notes || ''} · ${note}`.trim(),
    })));

    results.forEach((result, batchIndex) => {
      if (result.status === 'fulfilled') ids.push(batch[batchIndex].id);
    });
  }

  return { closed: ids.length, ids };
}

export async function archiveHealthMirrorTasks(tasks = [], onUpdateTask) {
  if (typeof onUpdateTask !== 'function') return { closed: 0, ids: [] };
  const toClose = findHealthMirrorTasksToArchive(tasks);
  return closeTasksInBatches(toClose, onUpdateTask, 'Miroir d’analyse archivé (nettoyage massif)');
}

export async function closeDuplicateHealthMirrorTasks(tasks = [], onUpdateTask) {
  if (typeof onUpdateTask !== 'function') return { closed: 0, ids: [] };
  const duplicates = findDuplicateHealthMirrorTasks(tasks);
  return closeTasksInBatches(duplicates, onUpdateTask, 'Doublon d’analyse archivé');
}
