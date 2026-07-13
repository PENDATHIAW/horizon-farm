import { evaluateRiskRules } from './erpRules/riskRules.js';
import { runErpAuditEngine } from './erpAuditEngine.js';
import {
  buildIssueKey,
  issueKeyFromAlert,
  issueKeyFromFinding,
  issueKeyFromTask,
} from './issueKey.js';
import { filterRealOpenTasks } from '../utils/healthFindingLabels.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu', 'traitee', 'traitée'].includes(low(r.status || r.statut));

function severityRank(severity = '') {
  const map = { critique: 0, haute: 1, eleve: 1, moyenne: 2, moyen: 2, basse: 3, faible: 3 };
  return map[low(severity)] ?? 9;
}

function mergeSeverity(a = 'basse', b = 'basse') {
  return severityRank(a) <= severityRank(b) ? a : b;
}

/** Regroupe alertes, tâches, findings audit et suggestions par issue_key. */
export function buildRiskIssueGroups(data = {}) {
  const groups = new Map();
  const add = (issueKey, payload) => {
    if (!issueKey) return;
    if (!groups.has(issueKey)) {
      groups.set(issueKey, {
        issue_key: issueKey,
        title: payload.title || 'Anomalie ERP',
        module: payload.module || 'erp',
        severity: payload.severity || 'moyenne',
        alerts: [],
        tasks: [],
        findings: [],
        recommendations: [],
        source_records: [],
        financialImpact: payload.financialImpact ?? null,
        probability: payload.probability ?? 'Moyenne',
        impact: payload.impact ?? '—',
        action: payload.action || payload.recommended_action || 'Traiter',
      });
    }
    const group = groups.get(issueKey);
    group.severity = mergeSeverity(group.severity, payload.severity);
    if (payload.alerts) group.alerts.push(...payload.alerts);
    if (payload.tasks) group.tasks.push(...payload.tasks);
    if (payload.findings) group.findings.push(...payload.findings);
    if (payload.recommendations) group.recommendations.push(...payload.recommendations);
    if (payload.source_records) group.source_records.push(...payload.source_records);
    if (!group.title && payload.title) group.title = payload.title;
    if (!group.module && payload.module) group.module = payload.module;
  };

  arr(data.alertes_center || data.alertes).filter(isOpen).forEach((alert) => {
    const key = issueKeyFromAlert(alert);
    add(key, {
      title: alert.title,
      module: alert.module_source || 'activite_suivi',
      severity: low(alert.severity).includes('critique') ? 'critique' : 'moyenne',
      alerts: [alert],
      source_records: [{ type: 'alert', id: alert.id }],
      action: alert.action_recommandee || 'Résoudre ou créer tâche',
    });
  });

  filterRealOpenTasks(arr(data.taches).filter(isOpen)).forEach((task) => {
    const key = issueKeyFromTask(task);
    add(key, {
      title: task.title,
      module: task.module_lie || 'activite_suivi',
      severity: task.priority === 'critique' ? 'haute' : 'moyenne',
      tasks: [task],
      source_records: [{ type: 'task', id: task.id }],
      action: 'Planifier ou clôturer',
    });
  });

  const audit = data.auditReport || runErpAuditEngine(data);
  arr(audit.findings).forEach((finding) => {
    const key = issueKeyFromFinding(finding);
    add(key, {
      title: finding.title,
      module: finding.module,
      severity: finding.severity,
      findings: [finding],
      source_records: finding.source_records || [],
      action: finding.recommended_action,
    });
  });

  arr(data.ai_recommendations || data.recommendations).filter((r) => !['validated', 'resolue', 'dismissed', 'ignoree'].includes(low(r.status))).forEach((rec) => {
    const record = rec.source_data?.source_records?.[0] || {};
    const key = rec.issue_key || buildIssueKey('ai', rec.module_target || 'assistant_erp', record.id || rec.id, rec.title);
    add(key, {
      title: rec.title,
      module: rec.module_target || 'assistant_erp',
      severity: rec.priority || 'moyenne',
      recommendations: [rec],
      source_records: rec.source_data?.source_records || [{ type: 'ai_recommendation', id: rec.id }],
      action: rec.action_recommandee || 'Valider ou ignorer',
    });
  });

  return [...groups.values()].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

/** Risques domaine + groupes issue_key pour Centre décisionnel. */
export function runRiskEngine(data = {}) {
  const domainRisks = evaluateRiskRules(data);
  const issueGroups = buildRiskIssueGroups(data);
  const operationalPriorities = issueGroups.slice(0, 18).map((group) => ({
    id: group.issue_key,
    issue_key: group.issue_key,
    title: group.title,
    detail: group.action,
    severity: group.severity,
    module: group.module,
    alerts: group.alerts.length,
    tasks: group.tasks.length,
    findings: group.findings.length,
    recommendations: group.recommendations.length,
    linkedCount: group.alerts.length + group.tasks.length + group.findings.length + group.recommendations.length,
    tone: ['critique', 'haute', 'eleve'].includes(low(group.severity)) ? 'bad' : 'warn',
    tab: 'À traiter',
    isGrouped: true,
  }));

  return {
    domainRisks,
    issueGroups,
    operationalPriorities,
    counts: {
      domains: domainRisks.length,
      groups: issueGroups.length,
      criticalGroups: issueGroups.filter((g) => ['critique', 'haute', 'eleve'].includes(low(g.severity))).length,
    },
    generated_at: new Date().toISOString(),
  };
}
