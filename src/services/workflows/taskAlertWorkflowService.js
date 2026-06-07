import { buildIssueKey } from '../issueKey.js';

/** Alertes/tâches — déduplication issue_key + clôture liée. */
export function buildLinkedTaskFromAlert(alert = {}, overrides = {}) {
  return {
    title: alert.title || 'Action alerte',
    description: alert.message || alert.description || '',
    priority: alert.severity === 'critique' ? 'critique' : 'haute',
    module_lie: alert.module_source || 'activite_suivi',
    source_module: alert.module_source,
    source_record_id: alert.entity_id || alert.id,
    linked_alert_id: alert.id,
    issue_key: alert.issue_key || buildIssueKey('alert', alert.module_source, alert.entity_id || alert.id, alert.title),
    task_type: 'real',
    origin_type: 'workflow',
    ...overrides,
  };
}

export function buildLinkedAlertFromFinding(finding = {}, overrides = {}) {
  return {
    title: finding.title,
    message: finding.description || finding.recommended_action,
    severity: finding.severity || 'moyenne',
    module_source: finding.module,
    entity_id: finding.source_records?.[0]?.id,
    issue_key: finding.issue_key,
    status: 'nouvelle',
    origin_type: 'system',
    ...overrides,
  };
}
