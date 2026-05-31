import { generateSequentialId } from '../utils/ids.js';
import { buildTaskFromAlert, taskDedupeKey, alertDedupeKey, isTaskClosed, isAlertClosed } from '../utils/taskWorkflows.js';

const PROCESSED_KEY = 'horizon-erp-health-auto-processed-v1';

const arr = (v) => (Array.isArray(v) ? v : []);
const today = () => new Date().toISOString().slice(0, 10);

const MODULE_TO_TASK = {
  commercial: 'ventes',
  achats_stock: 'stock',
  finance_pilotage: 'finances',
  elevage: 'avicole',
  activite_suivi: 'taches',
  documents_rapports: 'documents',
  rh: 'equipements',
  objectifs_croissance: 'objectifs_croissance',
  dashboard: 'autre',
  gestion_systeme: 'autre',
};

const MODULE_TO_ALERT = {
  commercial: 'ventes',
  achats_stock: 'stock',
  finance_pilotage: 'finances',
  elevage: 'avicole',
  activite_suivi: 'taches',
  documents_rapports: 'documents',
  rh: 'equipements',
  objectifs_croissance: 'autre',
  dashboard: 'autre',
  gestion_systeme: 'autre',
};

const severityToAlert = (s) => (s === 'critique' || s === 'haute' ? 'critique' : s === 'moyenne' ? 'warning' : 'info');
const severityToPriority = (s) => (s === 'critique' || s === 'haute' ? 'critique' : s === 'moyenne' ? 'haute' : 'normale');

function loadProcessed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROCESSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveProcessed(set) {
  try {
    localStorage.setItem(PROCESSED_KEY, JSON.stringify([...set].slice(-200)));
  } catch { /* ignore */ }
}

function hasOpenTaskForFinding(tasks, finding) {
  const key = finding.id;
  return arr(tasks).some((t) => !isTaskClosed(t) && (taskDedupeKey(t) === key || t.action_key === key || t.source_record_id === key));
}

function hasOpenAlertForFinding(alerts, finding) {
  const key = finding.id;
  return arr(alerts).some((a) => !isAlertClosed(a) && (alertDedupeKey(a) === key || a.entity_id === key || (a.title === finding.title && a.action_recommandee === finding.recommended_action)));
}

function buildTaskFromFinding(finding, tasks) {
  return {
    id: generateSequentialId('taches', tasks),
    title: finding.title,
    module_lie: MODULE_TO_TASK[finding.module] || finding.module || 'autre',
    entity_type: finding.category || 'finding',
    related_id: finding.source_records?.[0]?.id || finding.id,
    assigned_to: 'TEAM-FERME',
    due_date: today(),
    priority: severityToPriority(finding.severity),
    status: 'a_faire',
    notes: [finding.description, finding.recommended_action].filter(Boolean).join(' · '),
    source_module: 'erp_health_engine',
    source_record_id: finding.id,
    action_key: finding.id,
    task_dedupe_key: finding.id,
    alert_dedupe_key: finding.id,
  };
}

function buildAlertFromFinding(finding, alerts) {
  return {
    id: generateSequentialId('alertes_center', alerts),
    title: finding.title,
    message: finding.description || '',
    module_source: MODULE_TO_ALERT[finding.module] || 'autre',
    entity_type: finding.category || 'finding',
    entity_id: finding.source_records?.[0]?.id || finding.id,
    severity: severityToAlert(finding.severity),
    status: 'nouvelle',
    action_recommandee: finding.recommended_action || 'Traiter dans le module concerné',
  };
}

/**
 * Exécute les actions auto du Health Engine : alertes + tâches + chaîne alerte→tâche.
 * Déduplication par finding.id et clés métier existantes.
 */
export async function applyErpHealthAutoActions(report, {
  existingTasks = [],
  existingAlerts = [],
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
} = {}) {
  if (!report || typeof onCreateTask !== 'function') return { createdTasks: 0, createdAlerts: 0, skipped: 0 };

  const processed = loadProcessed();
  let createdTasks = 0;
  let createdAlerts = 0;
  let skipped = 0;

  const taskCandidates = [
    ...arr(report.autoTasks),
    ...arr(report.findings).filter((f) => f.auto_action === 'create_task'),
  ];
  const alertCandidates = [
    ...arr(report.autoAlerts),
    ...arr(report.findings).filter((f) => f.auto_action === 'create_alert'),
  ];

  for (const finding of alertCandidates) {
    if (!finding?.id || processed.has(`alert:${finding.id}`)) { skipped += 1; continue; }
    if (hasOpenAlertForFinding(existingAlerts, finding)) { processed.add(`alert:${finding.id}`); skipped += 1; continue; }
    if (typeof onCreateAlert !== 'function') continue;

    const alert = buildAlertFromFinding(finding, existingAlerts);
    try {
      await onCreateAlert(alert);
      existingAlerts.push(alert);
      createdAlerts += 1;
      processed.add(`alert:${finding.id}`);

      if (typeof onCreateBusinessEvent === 'function') {
        await onCreateBusinessEvent({
          id: `EVT-${alert.id}`,
          event_type: 'alerte_ia_auto',
          module_source: 'alertes',
          entity_type: 'alerte',
          entity_id: alert.id,
          title: `Alerte IA : ${alert.title}`,
          description: alert.action_recommandee,
          event_date: today(),
          severity: alert.severity === 'critique' ? 'critique' : 'info',
        }).catch(() => {});
      }

      const chain = buildTaskFromAlert(alert, existingTasks);
      if (!hasOpenTaskForFinding(existingTasks, finding)) {
        await onCreateTask(chain.task);
        existingTasks.push(chain.task);
        createdTasks += 1;
        if (typeof onUpdateAlert === 'function') {
          await onUpdateAlert(alert.id, chain.alertPatch).catch(() => {});
        }
        if (typeof onCreateBusinessEvent === 'function' && chain.event) {
          await onCreateBusinessEvent(chain.event).catch(() => {});
        }
      }
    } catch { skipped += 1; }
  }

  for (const finding of taskCandidates) {
    if (!finding?.id || processed.has(`task:${finding.id}`)) { skipped += 1; continue; }
    if (hasOpenTaskForFinding(existingTasks, finding)) { processed.add(`task:${finding.id}`); skipped += 1; continue; }

    const task = buildTaskFromFinding(finding, existingTasks);
    try {
      await onCreateTask(task);
      existingTasks.push(task);
      createdTasks += 1;
      processed.add(`task:${finding.id}`);
      if (typeof onCreateBusinessEvent === 'function') {
        await onCreateBusinessEvent({
          id: `EVT-${task.id}`,
          event_type: 'tache_ia_auto',
          module_source: 'taches',
          entity_type: 'tache',
          entity_id: task.id,
          title: `Tâche IA : ${task.title}`,
          description: task.notes,
          event_date: today(),
          severity: task.priority === 'critique' ? 'critique' : 'info',
        }).catch(() => {});
      }
    } catch { skipped += 1; }
  }

  saveProcessed(processed);
  return { createdTasks, createdAlerts, skipped };
}
