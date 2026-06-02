const arr = (v) => (Array.isArray(v) ? v : []);

export function buildActiviteSummaryTodos({ priorityQueue = [], coherenceRows = [] }) {
  const todos = [];

  arr(priorityQueue).slice(0, 4).forEach((item) => {
    todos.push({
      id: item.id,
      title: item.title,
      detail: `${item.detail || '—'} · ${item.severity}`,
      tab: item.kind === 'alerte' ? 'Alertes' : 'Tâches',
      kind: item.kind,
      sourceId: item.sourceId,
    });
  });

  arr(coherenceRows)
    .filter((row) => row.type === 'alerte')
    .slice(0, 2)
    .forEach((row) => {
      if (todos.some((t) => t.id === row.id)) return;
      todos.push({
        id: row.id,
        title: row.title,
        detail: row.detail || 'Sans tâche liée',
        tab: 'Alertes',
        kind: 'alerte',
        sourceId: row.alertId,
      });
    });

  arr(coherenceRows)
    .filter((row) => row.type === 'retard' || row.type === 'critique')
    .slice(0, 2)
    .forEach((row) => {
      if (todos.some((t) => t.id === row.id)) return;
      todos.push({
        id: row.id,
        title: row.title,
        detail: row.detail,
        tab: 'Tâches',
        kind: 'tache',
        sourceId: row.taskId,
      });
    });

  return todos;
}

export function coherenceRowTab(row = {}) {
  if (row.type === 'alerte') return 'Alertes';
  return 'Tâches';
}

export function uniqueTodoCount(todos = []) {
  return new Set(arr(todos).map((row) => row.id)).size;
}
