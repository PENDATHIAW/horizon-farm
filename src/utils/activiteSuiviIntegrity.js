/**
 * Écarts chantier 8 — Activité & Suivi.
 */

import {
  ACTIVITE_ORIGIN_TYPES,
  buildActiviteIssueKey,
  inferActiviteIssueKey,
  activitePushAlreadySent,
} from './activiteSuiviWorkflow.js';
import { isAlertClosed, isTaskClosed } from './taskWorkflows.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const isCritical = (row = {}) => ['urgence', 'critique', 'critical'].includes(lower(row.severity || row.gravite));

export function buildActiviteGapRows({
  alertes = [],
  tasks = [],
  recommendations = [],
  pushHistory = [],
} = {}) {
  const gaps = [];
  const push = (row) => gaps.push({ severity: 'warning', ...row });

  arr(alertes).filter((alert) => !isAlertClosed(alert) && isCritical(alert)).forEach((alert) => {
    const issueKey = inferActiviteIssueKey(alert, ACTIVITE_ORIGIN_TYPES.ALERT);
    const hasTask = arr(tasks).some((task) =>
      !isTaskClosed(task)
      && (clean(task.issue_key) === issueKey || clean(task.linked_alert_id) === clean(alert.id)));
    if (!hasTask) {
      push({
        issue_key: buildActiviteIssueKey('gap', alert.id, 'sans_tache'),
        title: 'Alerte critique sans tâche',
        detail: alert.title || alert.id,
        repair: 'create_task',
        record_id: alert.id,
      });
    }
  });

  arr(tasks).filter((task) => isTaskClosed(task)).forEach((task) => {
    const alertId = task.alert_id || task.linked_alert_id || (task.source_module === 'alertes' ? task.source_record_id : '');
    const linked = arr(alertes).find((alert) => clean(alert.id) === clean(alertId));
    if (linked && !isAlertClosed(linked)) {
      push({
        issue_key: buildActiviteIssueKey('gap', task.id, 'alerte_ouverte'),
        title: 'Tâche terminée mais alerte ouverte',
        detail: `${task.title || task.id} · ${linked.title || linked.id}`,
        repair: 'resolve_alert',
        record_id: linked.id,
        task_id: task.id,
      });
    }
  });

  const pushCounts = new Map();
  arr(pushHistory).forEach((row) => {
    const key = row.issue_key || row.alert_id;
    pushCounts.set(key, (pushCounts.get(key) || 0) + 1);
  });
  [...pushCounts.entries()].filter(([, count]) => count > 1).forEach(([key, count]) => {
    push({
      issue_key: buildActiviteIssueKey('gap', key, 'push_multiple'),
      title: 'Push envoyé plusieurs fois',
      detail: `${key} · ${count} envoi(s)`,
      repair: 'dedupe_push',
      record_id: key,
    });
  });

  const recSeen = new Map();
  arr(recommendations).forEach((rec) => {
    const key = inferActiviteIssueKey(rec, ACTIVITE_ORIGIN_TYPES.RECOMMENDATION);
    if (recSeen.has(key)) {
      push({
        issue_key: buildActiviteIssueKey('gap', rec.id, 'rec_doublon'),
        title: 'Suggestion doublonnée',
        detail: `${rec.title || rec.id} ≈ ${recSeen.get(key)}`,
        repair: 'dedupe_recommendation',
        record_id: rec.id,
      });
    } else {
      recSeen.set(key, rec.id);
    }
  });

  arr(alertes).filter((alert) => !isAlertClosed(alert)).forEach((alert) => {
    if (!clean(alert.source_module || alert.module_source) || !clean(alert.source_record_id || alert.entity_id)) {
      push({
        issue_key: buildActiviteIssueKey('gap', alert.id, 'sans_source'),
        title: 'Alerte sans source',
        detail: alert.title || alert.id,
        repair: 'enrich_source',
        record_id: alert.id,
      });
    }
    if (isCritical(alert) && !activitePushAlreadySent(alert) && alert.push_sent_count > 1) {
      push({
        issue_key: buildActiviteIssueKey('gap', alert.id, 'push_count'),
        title: 'Push envoyé plusieurs fois',
        detail: alert.title || alert.id,
        repair: 'dedupe_push',
        record_id: alert.id,
      });
    }
  });

  return gaps;
}
