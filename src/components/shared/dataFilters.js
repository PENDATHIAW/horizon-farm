export const asRows = (value) => (Array.isArray(value) ? value : []);

export const normalizeValue = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

export const toList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined && item !== null && item !== '');
};

export const rowFarmId = (row = {}) => row.farm_id || row.farmId || row.ferme_id || row.fermeId || '';

export function matchesFarm(row = {}, farmId) {
  if (!farmId) return true;
  const scopedFarm = rowFarmId(row);
  return !scopedFarm || String(scopedFarm) === String(farmId);
}

export function matchesList(value, expected, fallback = '') {
  const wanted = new Set(toList(expected).map(normalizeValue));
  if (!wanted.size) return true;
  return wanted.has(normalizeValue(value || fallback));
}

export function rowDateValue(row = {}, keys = []) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return '';
}

function dateOnly(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export function matchesPeriod(value, period) {
  if (!period) return true;
  const day = dateOnly(value);
  if (!day) return false;
  if (typeof period === 'string') {
    return /^\d{4}-\d{2}-\d{2}$/.test(period) ? day === period : true;
  }
  const start = dateOnly(period.start || period.from || period.date_from || period.current?.start);
  const end = dateOnly(period.end || period.to || period.date_to || period.current?.end);
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}

const MODULE_ALIASES = Object.freeze({
  elevage: ['elevage', 'animal', 'animaux', 'avicole', 'ponte', 'mortalite', 'alimentation', 'sante'],
  cultures: ['culture', 'cultures', 'parcelle', 'campagne', 'irrigation', 'recolte'],
  activite_suivi: ['activite_suivi', 'activite', 'taches', 'alertes_center'],
  centre_decisionnel: ['centre_decisionnel', 'centre_ia', 'decision'],
  achats_stock: ['achats_stock', 'stock', 'fournisseurs'],
  finance_pilotage: ['finance_pilotage', 'finances', 'comptabilite'],
});

export const rowModule = (row = {}) => row.module_source || row.source_module || row.module_lie || row.module || row.owner_module || '';

export function matchesModule(row = {}, module) {
  const requested = toList(module).map(normalizeValue);
  if (!requested.length) return true;
  const haystack = normalizeValue([
    rowModule(row),
    row.event_type,
    row.record_type,
    row.entity_type,
  ].filter(Boolean).join(' '));
  return requested.some((key) => {
    const aliases = MODULE_ALIASES[key] || [key];
    return aliases.some((alias) => haystack.includes(normalizeValue(alias)));
  });
}

export function dedupeRows(rows, keyOf) {
  const seen = new Set();
  const result = [];
  asRows(rows).forEach((row, index) => {
    const key = String(keyOf(row, index) || `row:${index}`);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(row);
  });
  return result;
}

export function compareNewest(first = {}, second = {}, keys = []) {
  const a = new Date(rowDateValue(first, keys) || 0).getTime() || 0;
  const b = new Date(rowDateValue(second, keys) || 0).getTime() || 0;
  return b - a;
}

export const JOURNAL_DATE_KEYS = ['occurred_at', 'event_date', 'created_at', 'date', 'updated_at'];
export const TASK_DATE_KEYS = ['due_date', 'date_echeance', 'scheduled_at', 'created_at', 'date'];
export const ALERT_DATE_KEYS = ['triggered_at', 'occurred_at', 'created_at', 'date', 'updated_at'];

export const recordTypeOf = (row = {}) => row.record_type || row.entity_type || row.source_record_type || '';
export const recordIdOf = (row = {}) => row.record_id || row.entity_id || row.source_record_id || row.related_id || '';
export const taskAssigneeOf = (row = {}) => row.assigned_to || row.assignedTo || row.assigned_to_user_id || row.assignee_id || row.user_id || row.responsable_id || '';
export const taskAlertIdOf = (row = {}) => row.alert_id || row.source_alert_id || row.linked_alert_id || '';
export const taskDecisionIdOf = (row = {}) => row.decision_id || row.source_decision_id || row.linked_decision_id || '';
export const taskStatusOf = (row = {}) => row.status || row.statut || row.state || 'a_faire';
export const taskPriorityOf = (row = {}) => row.priority || row.priorite || 'normale';
export const alertCodeOf = (row = {}) => row.code || row.alert_code || row.type || row.event_type || '';
export const alertSeverityOf = (row = {}) => row.severity || row.gravite || row.priority || 'info';
export const alertStatusOf = (row = {}) => row.status || row.statut || row.state || 'nouvelle';
export const alertAssigneeOf = (row = {}) => row.assigned_to || row.assignedTo || row.assignee_id || row.user_id || row.responsable_id || '';

const TASK_PRIORITY_RANK = Object.freeze({ critique: 0, critical: 0, urgence: 0, haute: 1, high: 1, moyenne: 2, medium: 2, normale: 3, normal: 3, basse: 4, low: 4 });

function compareTasks(first = {}, second = {}) {
  const firstRank = TASK_PRIORITY_RANK[normalizeValue(taskPriorityOf(first))] ?? 3;
  const secondRank = TASK_PRIORITY_RANK[normalizeValue(taskPriorityOf(second))] ?? 3;
  if (firstRank !== secondRank) return firstRank - secondRank;
  const firstDue = new Date(rowDateValue(first, ['due_date', 'date_echeance', 'scheduled_at']) || '9999-12-31').getTime();
  const secondDue = new Date(rowDateValue(second, ['due_date', 'date_echeance', 'scheduled_at']) || '9999-12-31').getTime();
  if (firstDue !== secondDue) return firstDue - secondDue;
  return compareNewest(first, second, ['created_at', 'date']);
}

export function selectJournalEvenements({
  events = [], rows, farmId, module, recordType, recordId, eventTypes, period, limit = 100,
} = {}) {
  const recordIds = new Set(toList(recordId).map(String));
  const selected = asRows(rows ?? events)
    .filter((event) => matchesFarm(event, farmId))
    .filter((event) => matchesModule(event, module))
    .filter((event) => matchesList(recordTypeOf(event), recordType))
    .filter((event) => !recordIds.size || recordIds.has(String(recordIdOf(event))))
    .filter((event) => matchesList(event.event_type || event.type, eventTypes))
    .filter((event) => matchesPeriod(rowDateValue(event, JOURNAL_DATE_KEYS), period))
    .sort((a, b) => compareNewest(a, b, JOURNAL_DATE_KEYS));
  return dedupeRows(selected, (event) => event.event_key
    || event.id
    || [event.event_type, recordTypeOf(event), recordIdOf(event), rowDateValue(event, JOURNAL_DATE_KEYS), event.title].join(':'))
    .slice(0, Math.max(0, Number(limit) || 0));
}

export function selectListeTaches({
  tasks = [], rows, farmId, assignedTo, module, alertId, decisionId, statuses, priorities, period, limit = 100,
} = {}) {
  const assignees = new Set(toList(assignedTo).map(String));
  const alertIds = new Set(toList(alertId).map(String));
  const decisionIds = new Set(toList(decisionId).map(String));
  const selected = asRows(rows ?? tasks)
    .filter((task) => matchesFarm(task, farmId))
    .filter((task) => !assignees.size || assignees.has(String(taskAssigneeOf(task))))
    .filter((task) => matchesModule(task, module))
    .filter((task) => !alertIds.size || alertIds.has(String(taskAlertIdOf(task))))
    .filter((task) => !decisionIds.size || decisionIds.has(String(taskDecisionIdOf(task))))
    .filter((task) => matchesList(taskStatusOf(task), statuses, 'a_faire'))
    .filter((task) => matchesList(taskPriorityOf(task), priorities, 'normale'))
    .filter((task) => matchesPeriod(rowDateValue(task, TASK_DATE_KEYS), period))
    .sort(compareTasks);
  return dedupeRows(selected, (task) => task.task_dedupe_key || task.action_key || task.event_key || task.id)
    .slice(0, Math.max(0, Number(limit) || 0));
}

export function selectListeAlertes({
  alerts = [], alertes, rows, farmId, module, codes, severities, statuses, assignedTo, period, limit = 100,
} = {}) {
  const assignees = new Set(toList(assignedTo).map(String));
  const selected = asRows(rows ?? alertes ?? alerts)
    .filter((alert) => matchesFarm(alert, farmId))
    .filter((alert) => matchesModule(alert, module))
    .filter((alert) => matchesList(alertCodeOf(alert), codes))
    .filter((alert) => matchesList(alertSeverityOf(alert), severities, 'info'))
    .filter((alert) => matchesList(alertStatusOf(alert), statuses, 'nouvelle'))
    .filter((alert) => !assignees.size || assignees.has(String(alertAssigneeOf(alert))))
    .filter((alert) => matchesPeriod(rowDateValue(alert, ALERT_DATE_KEYS), period))
    .sort((a, b) => compareNewest(a, b, ALERT_DATE_KEYS));
  return dedupeRows(selected, (alert) => alert.alert_dedupe_key || alert.event_key || alert.id)
    .slice(0, Math.max(0, Number(limit) || 0));
}

function matchesKpiFilters(row = {}, filters = {}) {
  return Object.entries(filters || {}).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === '') return true;
    return String(row[key] ?? '') === String(expected);
  });
}

export function resolveCarteKpi({ code, kpi, values = [], catalog = [], farmId, period, filters = {} } = {}) {
  const definition = asRows(catalog).find((item) => String(item.code || item.id) === String(code)) || {};
  const valueRow = kpi || asRows(values).find((item) => {
    if (String(item.code || item.id) !== String(code)) return false;
    if (!matchesFarm(item, farmId)) return false;
    if (typeof period === 'string' && item.period && String(item.period) !== period) return false;
    return matchesKpiFilters(item, filters);
  }) || {};
  return { ...definition, ...valueRow, code: code || valueRow.code || definition.code };
}
