import { runErpHealthEngine } from '../../services/erpHealthEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu', 'traitee', 'traitée'].includes(low(r.status || r.statut || r.state));
const isLate = (r = {}) => ['retard', 'en_retard', 'overdue'].includes(low(r.status || r.statut || r.state)) || (r.due_date && isOpen(r) && String(r.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10));
const isCriticalAlert = (r = {}) => ['urgence', 'critique', 'critical'].includes(low(r.severity || r.gravite));
const isCriticalTask = (r = {}) => ['critique', 'critical', 'urgent'].includes(low(r.priority || r.priorite));
const isNewAlert = (r = {}) => ['nouvelle', 'new', 'ouverte'].includes(low(r.status || r.statut));

export function buildActiviteHealthSnapshot({ tasks = [], alertes = [], businessEvents = [] }) {
  const data = { taches: tasks, tasks, alertes_center: alertes, alertes, business_events: businessEvents };
  const health = runErpHealthEngine(data);
  return {
    score: health.score,
    findings: health.findings.filter((f) => f.module === 'activite_suivi'),
    predictions: health.predictions.filter((p) => p.module === 'activite_suivi'),
    risks: health.risks.filter((r) => r.module === 'activite_suivi'),
  };
}

export function buildActiviteCoherenceRows(tasks = [], alertes = []) {
  const rows = [];

  arr(tasks).filter((t) => isOpen(t) && (isLate(t) || isCriticalTask(t))).forEach((t) => {
    rows.push({
      id: `task-${t.id}`,
      taskId: t.id,
      type: isLate(t) ? 'retard' : 'critique',
      title: t.title || t.libelle || `Tâche ${t.id}`,
      detail: isLate(t) ? 'En retard' : `Priorité ${t.priority || t.priorite || 'critique'}`,
      finding: {
        id: `task-critical-${t.id}`,
        module: 'activite_suivi',
        severity: 'haute',
        auto_action: 'create_task',
        title: `Tâche critique : ${t.title || t.id}`,
        description: t.description || t.notes || 'À traiter en priorité',
        recommended_action: 'Traiter ou réassigner',
        confidence_score: 0.87,
      },
    });
  });

  arr(alertes).filter((a) => isOpen(a) && (isNewAlert(a) || isCriticalAlert(a))).forEach((a) => {
    const linkedTask = arr(tasks).some((t) => isOpen(t) && (String(t.alert_id) === String(a.id) || low(t.title).includes(low(a.title))));
    if (!linkedTask) {
      rows.push({
        id: `alert-${a.id}`,
        alertId: a.id,
        type: 'alerte',
        title: a.title || 'Alerte non traitée',
        detail: a.message || a.action_recommandee || a.module_source || 'Sans tâche liée',
        finding: {
          id: `alert-open-${a.id}`,
          module: 'activite_suivi',
          severity: isCriticalAlert(a) ? 'critique' : 'moyenne',
          auto_action: 'create_task',
          title: a.title || 'Alerte non traitée',
          description: a.message || a.action_recommandee || 'Créer tâche de résolution',
          recommended_action: a.action_recommandee || 'Créer tâche ou résoudre',
          confidence_score: 0.86,
          alert_id: a.id,
        },
      });
    }
  });

  return rows;
}

export function aggregatePriorityQueue(tasks = [], alertes = []) {
  const queue = [];
  arr(alertes).filter((a) => isOpen(a) && isCriticalAlert(a)).forEach((a) => {
    queue.push({ id: `alert-${a.id}`, kind: 'alerte', title: a.title || 'Alerte critique', detail: a.action_recommandee || a.message, severity: 'critique', sourceId: a.id });
  });
  arr(tasks).filter((t) => isOpen(t) && (isLate(t) || isCriticalTask(t))).forEach((t) => {
    queue.push({ id: `task-${t.id}`, kind: 'tache', title: t.title || t.libelle || 'Tâche', detail: isLate(t) ? 'En retard' : 'Priorité critique', severity: isLate(t) ? 'retard' : 'critique', sourceId: t.id });
  });
  return queue.slice(0, 12);
}

export function countOpenByModule(alertes = [], tasks = []) {
  const map = {};
  [...arr(alertes).filter(isOpen), ...arr(tasks).filter(isOpen)].forEach((row) => {
    const mod = row.module_source || row.module || row.source_module || 'general';
    map[mod] = (map[mod] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
}
