/**
 * Chantier 8 - Activité & Suivi : regrouper alertes, tâches et suggestions par problème métier.
 */

import { makeId } from './ids.js';
import { buildTaskFromAlert, isAlertClosed, isTaskClosed, taskDedupeKey } from './taskWorkflows.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export const ACTIVITE_ORIGIN_TYPES = {
  ALERT: 'alerte',
  TASK: 'tache',
  RECOMMENDATION: 'recommandation_ia',
  EVENT: 'evenement',
};

export const ACTIVITE_DOMAINS = {
  PROBLEM: 'probleme',
  PUSH: 'push',
};


const isCritical = (row = {}) => ['urgence', 'critique', 'critical'].includes(lower(row.severity || row.gravite || row.priority || row.priorite));

export function buildActiviteIssueKey(sourceModule = '', sourceRecordId = '', suffix = '') {
  const mod = clean(sourceModule) || 'general';
  const id = clean(sourceRecordId) || 'record';
  const tail = clean(suffix);
  return tail ? `activite:${mod}:${id}:${tail}` : `activite:${mod}:${id}`;
}

export function inferActiviteIssueKey(record = {}, originType = '') {
  if (clean(record.issue_key)) return clean(record.issue_key);
  const sourceModule = clean(
    record.source_module
    || record.module_source
    || record.module_lie
    || record.module
    || 'general',
  );
  const sourceRecordId = clean(
    record.source_record_id
    || record.entity_id
    || record.related_id
    || record.alert_id
    || record.linked_alert_id
    || record.id,
  );
  const suffix = clean(originType || record.origin_type || record.problem_kind || record.action_key || '');
  return buildActiviteIssueKey(sourceModule, sourceRecordId, suffix);
}

/** Normalise les champs obligatoires alerte / tâche / recommandation. */
export function normalizeActiviteRecord(record = {}, originType = ACTIVITE_ORIGIN_TYPES.ALERT) {
  const meta = {
    issue_key: inferActiviteIssueKey(record, originType),
    source_module: clean(record.source_module || record.module_source || record.module_lie || record.module || 'general'),
    source_record_id: clean(record.source_record_id || record.entity_id || record.related_id || record.id || ''),
    origin_type: originType || record.origin_type || ACTIVITE_ORIGIN_TYPES.ALERT,
    severity: clean(record.severity || record.gravite || record.priority || record.priorite || 'info'),
    status: clean(record.status || record.statut || 'nouvelle'),
  };
  return { ...record, ...meta };
}

function linksRecord(row = {}, issueKey = '') {
  const key = clean(issueKey);
  if (!key) return false;
  return clean(row.issue_key) === key
    || inferActiviteIssueKey(row, row.origin_type) === key
    || clean(row.alert_dedupe_key) === key
    || clean(row.task_dedupe_key) === key;
}

function docLinksIssue(doc = {}, issueKey = '', sourceModule = '', sourceRecordId = '') {
  return linksRecord(doc, issueKey)
    || (clean(doc.source_record_id) === clean(sourceRecordId) && clean(doc.source_module || doc.module_source) === clean(sourceModule));
}

function trxLinksIssue(trx = {}, issueKey = '', _sourceModule = '', sourceRecordId = '') {
  return linksRecord(trx, issueKey)
    || clean(trx.source_record_id) === clean(sourceRecordId)
    || clean(trx.related_id) === clean(sourceRecordId);
}

/** Regroupe une fiche problème par issue_key. */
export function buildProblemFiche(issueKey = '', context = {}) {
  const key = clean(issueKey);
  const alerts = arr(context.alertes).filter((row) => linksRecord(row, key));
  const tasks = arr(context.tasks).filter((row) => linksRecord(row, key));
  const recommendations = arr(context.recommendations).filter((row) => linksRecord(row, key));
  const events = arr(context.businessEvents).filter((row) => linksRecord(row, key));
  const anchor = alerts[0] || tasks[0] || recommendations[0] || events[0] || {};
  const sourceModule = anchor.source_module || anchor.module_source || anchor.module_lie || 'general';
  const sourceRecordId = anchor.source_record_id || anchor.entity_id || anchor.related_id || '';
  const documents = arr(context.documents).filter((doc) => docLinksIssue(doc, key, sourceModule, sourceRecordId));
  const transactions = arr(context.transactions).filter((trx) => trxLinksIssue(trx, key, sourceModule, sourceRecordId));

  return {
    issue_key: key,
    title: anchor.title || anchor.message || key,
    source_module: sourceModule,
    source_record_id: sourceRecordId,
    severity: anchor.severity || anchor.gravite || anchor.priority || 'info',
    status: anchor.status || anchor.statut || 'ouverte',
    alert: alerts[0] || null,
    tasks,
    recommendations,
    events,
    documents,
    transactions,
    openTasks: tasks.filter((t) => !isTaskClosed(t)),
    openAlert: alerts.find((a) => !isAlertClosed(a)) || null,
  };
}

export function buildProblemFiches(context = {}) {
  const keys = new Set();
  [...arr(context.alertes), ...arr(context.tasks), ...arr(context.recommendations), ...arr(context.businessEvents)]
    .forEach((row) => keys.add(inferActiviteIssueKey(row, row.origin_type)));
  return [...keys]
    .filter(Boolean)
    .map((key) => buildProblemFiche(key, context))
    .sort((a, b) => {
      const critA = isCritical(a.alert || a) ? 1 : 0;
      const critB = isCritical(b.alert || b) ? 1 : 0;
      return critB - critA || String(a.title).localeCompare(String(b.title));
    });
}

export function enrichAlertPatch(alert = {}) {
  return normalizeActiviteRecord({
    ...alert,
    alert_dedupe_key: alert.alert_dedupe_key || inferActiviteIssueKey(alert, ACTIVITE_ORIGIN_TYPES.ALERT),
  }, ACTIVITE_ORIGIN_TYPES.ALERT);
}

export function enrichTaskPatch(task = {}, alert = null) {
  const base = alert ? {
    ...task,
    alert_id: alert.id,
    linked_alert_id: alert.id,
    issue_key: alert.issue_key || inferActiviteIssueKey(alert, ACTIVITE_ORIGIN_TYPES.ALERT),
    source_module: alert.source_module || alert.module_source || task.source_module,
    source_record_id: alert.source_record_id || alert.entity_id || task.source_record_id,
  } : task;
  const normalized = normalizeActiviteRecord(base, ACTIVITE_ORIGIN_TYPES.TASK);
  return {
    ...normalized,
    task_dedupe_key: normalized.issue_key,
    alert_dedupe_key: alert?.issue_key || normalized.issue_key,
  };
}

export function enrichRecommendationPatch(finding = {}) {
  return normalizeActiviteRecord({
    ...finding,
    id: finding.id || makeId('REC'),
    title: finding.title || finding.description || 'Suggestion',
    source_module: finding.module || finding.source_module || 'centre_ia',
    source_record_id: finding.source_records?.[0]?.id || finding.entity_id || finding.id,
    action_key: finding.id,
  }, ACTIVITE_ORIGIN_TYPES.RECOMMENDATION);
}

/** Crée une tâche liée à une alerte avec issue_key commun. */
export async function createLinkedTaskFromAlert({ alert = {}, context = {}, handlers = {} } = {}) {
  const enrichedAlert = enrichAlertPatch(alert);
  const duplicate = arr(context.tasks).find((task) =>
    !isTaskClosed(task)
    && (clean(task.issue_key) === enrichedAlert.issue_key || taskDedupeKey(task) === enrichedAlert.issue_key));
  if (duplicate) throw new Error(`Tâche déjà ouverte pour ${enrichedAlert.issue_key}`);

  const built = buildTaskFromAlert(enrichedAlert, arr(context.tasks));
  const task = enrichTaskPatch(built.task, enrichedAlert);

  await handlers.onCreateTask?.(task);
  if (handlers.onUpdateAlert && enrichedAlert.id) {
    await handlers.onUpdateAlert(enrichedAlert.id, {
      ...built.alertPatch,
      ...enrichAlertPatch({ ...enrichedAlert, linked_task_id: task.id }),
    });
  }
  await handlers.onCreateBusinessEvent?.({
    ...built.event,
    issue_key: enrichedAlert.issue_key,
    origin_type: ACTIVITE_ORIGIN_TYPES.EVENT,
    source_module: 'activite_suivi',
    source_record_id: enrichedAlert.id,
  });

  return { task, issueKey: enrichedAlert.issue_key, alert: enrichedAlert };
}

/** Termine une tâche et propose / exécute la résolution alerte liée. */
export async function completeActiviteTask({
  task = {},
  resolveAlert = false,
  handlers = {},
} = {}) {
  if (!task?.id) throw new Error('Tâche introuvable');
  const normalized = enrichTaskPatch(task);
  await handlers.onUpdateTask?.(task.id, {
    status: 'termine',
    statut: 'termine',
    completed_at: new Date().toISOString(),
    issue_key: normalized.issue_key,
  });

  const alertId = task.alert_id || task.linked_alert_id || (task.source_module === 'alertes' ? task.source_record_id : '');
  let linkedAlert = null;
  if (alertId && handlers.onUpdateAlert) {
    linkedAlert = { id: alertId };
    if (resolveAlert) {
      await handlers.onUpdateAlert(alertId, {
        status: 'resolue',
        statut: 'resolue',
        push_suppressed: true,
        resolved_at: new Date().toISOString(),
        issue_key: normalized.issue_key,
      });
    }
  }

  await handlers.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: 'tache_terminee',
    module_source: 'activite_suivi',
    entity_type: 'tache',
    entity_id: task.id,
    title: `Tâche terminée · ${task.title || task.id}`,
    event_date: today(),
    issue_key: normalized.issue_key,
    origin_type: ACTIVITE_ORIGIN_TYPES.EVENT,
    source_module: normalized.source_module,
    source_record_id: normalized.source_record_id,
    linked_alert_id: alertId || '',
    linked_task_id: task.id,
    severity: 'info',
  });

  return {
    ok: true,
    issueKey: normalized.issue_key,
    proposeResolveAlert: Boolean(alertId && !resolveAlert),
    linkedAlertId: alertId || '',
    linkedAlert,
  };
}

/** Résout une alerte - plus de push ensuite. */
export async function resolveActiviteAlert({ alert = {}, handlers = {} } = {}) {
  if (!alert?.id) throw new Error('Alerte introuvable');
  const enriched = enrichAlertPatch(alert);
  await handlers.onUpdateAlert?.(alert.id, {
    status: 'resolue',
    statut: 'resolue',
    push_suppressed: true,
    resolved_at: new Date().toISOString(),
    issue_key: enriched.issue_key,
    origin_type: ACTIVITE_ORIGIN_TYPES.ALERT,
  });
  await handlers.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: 'alerte_resolue',
    module_source: 'activite_suivi',
    entity_type: 'alerte',
    entity_id: alert.id,
    title: `Alerte résolue · ${alert.title || alert.id}`,
    event_date: today(),
    issue_key: enriched.issue_key,
    origin_type: ACTIVITE_ORIGIN_TYPES.EVENT,
    source_module: enriched.source_module,
    source_record_id: enriched.source_record_id,
    linked_alert_id: alert.id,
    severity: 'info',
  });
  return { ok: true, issueKey: enriched.issue_key, pushSuppressed: true };
}

let memoryPushHistory = [];

export function resetActivitePushHistoryForTests() {
  memoryPushHistory = [];
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem('horizon_farm_activite_push_v1'); } catch { /* noop */ }
  }
}

const pushHistory = () => {
  if (typeof window === 'undefined') return memoryPushHistory;
  try {
    return JSON.parse(window.localStorage.getItem('horizon_farm_activite_push_v1') || '[]');
  } catch {
    return [];
  }
};

const savePushHistory = (entries = []) => {
  if (typeof window === 'undefined') {
    memoryPushHistory = entries.slice(-300);
    return memoryPushHistory;
  }
  window.localStorage.setItem('horizon_farm_activite_push_v1', JSON.stringify(entries.slice(-300)));
  return entries;
};

export function activitePushKey(alert = {}) {
  const enriched = enrichAlertPatch(alert);
  return buildActiviteIssueKey(ACTIVITE_DOMAINS.PUSH, enriched.issue_key, 'critique');
}

export function activitePushAlreadySent(alert = {}) {
  if (isAlertClosed(alert) || alert.push_suppressed) return true;
  const key = activitePushKey(alert);
  return pushHistory().some((row) => row.issue_key === key || row.alert_id === alert.id);
}

/** Push critique une seule fois par issue_key. */
export async function sendCriticalAlertPushOnce(alert = {}, notifyFn) {
  const enriched = enrichAlertPatch(alert);
  if (!isCritical(enriched)) return { sent: false, reason: 'not_critical' };
  if (isAlertClosed(enriched) || enriched.push_suppressed) return { sent: false, reason: 'resolved' };
  if (activitePushAlreadySent(enriched)) return { sent: false, reason: 'already_sent' };

  const pushIssueKey = activitePushKey(enriched);
  const result = notifyFn
    ? await notifyFn({ ...enriched, issue_key: pushIssueKey }, { force: false })
    : { sent: true };

  if (result.sent !== false) {
    savePushHistory([...pushHistory(), {
      issue_key: pushIssueKey,
      alert_id: enriched.id,
      sent_at: new Date().toISOString(),
      count: 1,
    }]);
    if (typeof notifyFn === 'undefined') {
      return { sent: true, issueKey: pushIssueKey };
    }
  }
  return { ...result, issueKey: pushIssueKey };
}

/** Scénario intégré pour tests unitaires. */
export async function runActiviteScenario() {
  const state = {
    alertes: [],
    tasks: [],
    recommendations: [],
    businessEvents: [],
    documents: [],
    transactions: [],
    pushLog: [],
  };

  const handlers = {
    onCreateAlert: async (row) => { state.alertes.push(enrichAlertPatch(row)); },
    onUpdateAlert: async (id, patch) => {
      const i = state.alertes.findIndex((a) => a.id === id);
      if (i >= 0) state.alertes[i] = enrichAlertPatch({ ...state.alertes[i], ...patch });
    },
    onCreateTask: async (row) => { state.tasks.push(enrichTaskPatch(row)); },
    onUpdateTask: async (id, patch) => {
      const i = state.tasks.findIndex((t) => t.id === id);
      if (i >= 0) state.tasks[i] = enrichTaskPatch({ ...state.tasks[i], ...patch });
    },
    onCreateBusinessEvent: async (row) => {
      state.businessEvents.push(normalizeActiviteRecord(row, ACTIVITE_ORIGIN_TYPES.EVENT));
    },
  };

  const stockAlert = enrichAlertPatch({
    id: 'ALT-STK',
    title: 'Stock bas · Engrais',
    message: 'Quantité sous seuil',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: 'STK-1',
    severity: 'critique',
    status: 'nouvelle',
    action_recommandee: 'Commander réapprovisionnement',
    problem_kind: 'stock_bas',
  });
  state.alertes.push(stockAlert);
  await createLinkedTaskFromAlert({ alert: stockAlert, context: state, handlers });
  const stockTask = state.tasks[0];
  await completeActiviteTask({ task: stockTask, resolveAlert: true, handlers });

  const mortalityAlert = enrichAlertPatch({
    id: 'ALT-MORT',
    title: 'Mortalité élevée lot A',
    module_source: 'avicole',
    entity_id: 'LOT-A',
    severity: 'critique',
    status: 'nouvelle',
    problem_kind: 'mortalite',
    action_recommandee: 'Contrôle sanitaire',
  });
  state.alertes.push(mortalityAlert);
  await createLinkedTaskFromAlert({
    alert: mortalityAlert,
    context: state,
    handlers: {
      ...handlers,
      onCreateTask: async (row) => {
        state.tasks.push(enrichTaskPatch({ ...row, module_lie: 'sante', source_module: 'sante' }));
      },
    },
  });

  const impayeAlert = enrichAlertPatch({
    id: 'ALT-IMP',
    title: 'Impayé client Diop',
    module_source: 'ventes',
    entity_id: 'CLI-9',
    severity: 'warning',
    status: 'nouvelle',
    problem_kind: 'impaye',
    action_recommandee: 'Relancer le client',
  });
  state.alertes.push(impayeAlert);
  await createLinkedTaskFromAlert({ alert: impayeAlert, context: state, handlers });

  const firstPush = await sendCriticalAlertPushOnce(mortalityAlert);
  const secondPush = await sendCriticalAlertPushOnce(mortalityAlert);
  state.pushLog = pushHistory();
  state.firstPush = firstPush;
  state.secondPush = secondPush;

  const fiches = buildProblemFiches({
    alertes: state.alertes,
    tasks: state.tasks,
    recommendations: state.recommendations,
    businessEvents: state.businessEvents,
    documents: state.documents,
    transactions: state.transactions,
  });

  return { state, fiches };
}
