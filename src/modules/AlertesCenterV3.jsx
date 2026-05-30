import AlertesCenterV2 from './AlertesCenterV2.jsx';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isResolved = (row = {}) => ['resolue', 'résolue', 'cloturee', 'clôturée', 'terminee', 'terminée', 'fermee', 'fermée', 'ok'].includes(norm(row.status || row.statut || row.etat));
const isTaskDone = (row = {}) => ['termine', 'terminé', 'done', 'resolue', 'résolue', 'cloturee', 'clôturée'].includes(norm(row.status || row.statut || row.etat));
const alertKey = (row = {}) => String(row.alert_dedupe_key || row.dedupe_key || row.source_record_id || row.entity_id || row.id || `${row.module_source || ''}:${row.title || ''}`).trim();
const taskKey = (row = {}) => String(row.task_dedupe_key || row.action_key || row.alert_dedupe_key || row.source_record_id || row.related_id || '').trim();
const taskBelongsToAlert = (task = {}, alert = {}) => {
  const aKey = alertKey(alert);
  const tKey = taskKey(task);
  if (!aKey || !tKey) return false;
  return aKey === tKey || tKey.includes(aKey) || aKey.includes(tKey);
};

function dedupeAlerts(alertes = []) {
  const map = new Map();
  alertes.forEach((alert) => {
    const key = alertKey(alert);
    const previous = map.get(key);
    if (!previous) {
      map.set(key, alert);
      return;
    }
    if (isResolved(alert) && !isResolved(previous)) return;
    if (!isResolved(alert) && isResolved(previous)) {
      map.set(key, alert);
      return;
    }
    const prevDate = new Date(previous.updated_at || previous.created_at || 0).getTime();
    const nextDate = new Date(alert.updated_at || alert.created_at || 0).getTime();
    if (nextDate >= prevDate) map.set(key, { ...previous, ...alert });
  });
  return [...map.values()];
}

export default function AlertesCenterV3(props) {
  const tasks = props.tasks || [];
  const alertes = dedupeAlerts(props.alertes || []);

  const guardedUpdateAlert = async (id, payload = {}) => {
    const before = alertes.find((alert) => String(alert.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    if (isResolved(after)) {
      const linkedTasks = tasks.filter((task) => taskBelongsToAlert(task, after) && !isTaskDone(task));
      await Promise.allSettled(linkedTasks.map((task) => props.onUpdateTask?.(task.id, { status: 'termine', completed_at: new Date().toISOString(), resolved_from_alert_id: id })));
      if (linkedTasks.length) await props.onRefreshTasks?.();
    }
    await props.onRefresh?.();
  };

  const guardedUpdateTask = async (id, payload = {}) => {
    const before = tasks.find((task) => String(task.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdateTask?.(id, payload);
    if (isTaskDone(after)) {
      const linkedAlerts = alertes.filter((alert) => taskBelongsToAlert(after, alert) && !isResolved(alert));
      await Promise.allSettled(linkedAlerts.map((alert) => props.onUpdate?.(alert.id, { status: 'resolue', resolved_at: new Date().toISOString(), resolved_from_task_id: id })));
      if (linkedAlerts.length) await props.onRefresh?.();
    }
    await props.onRefreshTasks?.();
  };

  return <AlertesCenterV2 {...props} alertes={alertes} tasks={tasks} onUpdate={guardedUpdateAlert} onUpdateTask={guardedUpdateTask} />;
}
