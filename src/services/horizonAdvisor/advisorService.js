/**
 * Horizon Advisor — recommandations quotidiennes priorisées (lecture seule).
 */

import { runErpHealthEngine } from '../erpHealthEngine.js';
import { evaluateAdvisorRules } from './advisorRules.js';
import { filterRealOpenTasks } from '../../utils/healthFindingLabels.js';
import { hasOpenTaskForHealthFinding } from '../../utils/healthFindingLabels.js';
import { alertDedupeKey, isAlertClosed } from '../../utils/taskWorkflows.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const SEVERITY_RANK = { critique: 0, haute: 1, eleve: 1, moyenne: 2, moyen: 2, basse: 3, faible: 3 };

export const ADVISOR_URGENCY = {
  ELEVEE: 'elevee',
  MOYENNE: 'moyenne',
  FAIBLE: 'faible',
};

export function mapSeverityToUrgency(severity = 'moyenne') {
  const s = String(severity || '').toLowerCase();
  if (s === 'critique' || s === 'haute' || s === 'eleve') return ADVISOR_URGENCY.ELEVEE;
  if (s === 'moyenne' || s === 'moyen') return ADVISOR_URGENCY.MOYENNE;
  return ADVISOR_URGENCY.FAIBLE;
}

function dedupeFindings(findings = []) {
  const seen = new Set();
  return findings.filter((f) => {
    const key = f.id || `${f.module}-${f.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAlreadyTracked(finding, { tasks = [], alerts = [] } = {}) {
  if (hasOpenTaskForHealthFinding(tasks, finding)) return true;
  const key = finding.id;
  return arr(alerts).some((a) => !isAlertClosed(a) && (
    alertDedupeKey(a) === key
    || a.entity_id === key
    || a.source_record_id === key
    || (a.title === finding.title && a.action_recommandee === finding.recommended_action)
  ));
}

function findingToRecommendation(finding, context = {}) {
  const tracked = isAlreadyTracked(finding, context);
  return {
    id: finding.id,
    title: finding.title,
    summary: finding.description || finding.recommended_action || '',
    recommended_action: finding.recommended_action || finding.description || '',
    urgency: mapSeverityToUrgency(finding.severity),
    severity: finding.severity || 'moyenne',
    module: finding.module || 'centre_decisionnel',
    module_target: finding.module || 'centre_decisionnel',
    category: finding.category || finding.type || 'advisor',
    confidence_score: Math.round((finding.confidence_score ?? 0.85) * 100),
    days_left: finding.days_left ?? null,
    source: finding.advisor_rule ? 'horizon_advisor_rules' : 'erp_health_engine',
    auto_action: finding.auto_action || null,
    finding,
    already_tracked: tracked,
    suggested_actions: finding.auto_action === 'create_alert'
      ? ['alert', 'task']
      : ['task', 'alert'],
  };
}

/**
 * Génère la liste priorisée du jour à partir des données ERP existantes.
 */
export function buildDailyAdvisorRecommendations(dataMap = {}, options = {}) {
  const limit = options.limit ?? 12;
  const tasks = filterRealOpenTasks(arr(dataMap.taches || dataMap.tasks));
  const alerts = arr(dataMap.alertes_center || dataMap.alertes).filter((a) => !isAlertClosed(a));
  const context = { tasks, alerts };

  const health = runErpHealthEngine(dataMap);
  const advisorRules = evaluateAdvisorRules(dataMap);
  const merged = dedupeFindings([...health.findings, ...advisorRules])
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));

  const recommendations = merged
    .slice(0, limit)
    .map((finding) => findingToRecommendation(finding, context));

  const counts = {
    total: recommendations.length,
    elevee: recommendations.filter((r) => r.urgency === ADVISOR_URGENCY.ELEVEE).length,
    moyenne: recommendations.filter((r) => r.urgency === ADVISOR_URGENCY.MOYENNE).length,
    faible: recommendations.filter((r) => r.urgency === ADVISOR_URGENCY.FAIBLE).length,
    tracked: recommendations.filter((r) => r.already_tracked).length,
  };

  return {
    generated_at: new Date().toISOString(),
    health_score: health.score,
    recommendations,
    counts,
    sources: {
      engine_findings: health.findings.length,
      advisor_rules: advisorRules.length,
      alertes_ouvertes: alerts.length,
      taches_ouvertes: tasks.length,
      business_events: arr(dataMap.business_events || dataMap.businessEvents).length,
    },
    readOnly: true,
  };
}

export function getAdvisorRecommendationById(report = {}, id = '') {
  return arr(report.recommendations).find((r) => r.id === id) || null;
}

export default buildDailyAdvisorRecommendations;
