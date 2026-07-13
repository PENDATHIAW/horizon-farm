import { runErpAuditEngine } from './erpAuditEngine.js';
import { runRiskEngine } from './riskEngine.js';
import { evaluatePredictiveRules } from './erpRules/predictiveRules.js';
import { evaluateProfitabilityRules } from './erpRules/profitabilityRules.js';
import { evaluateSurveillanceUxRules } from './erpRules/surveillanceUxRules.js';
import { evaluateErpUxAuditRules } from './erpRules/erpUxAuditRules.js';
import { syncRecommendationsToSupabase } from './aiRecommendationsService.js';
import { applyErpHealthAutoActions } from './erpHealthAutoActions.js';



const STORAGE_KEY = 'horizon-erp-health-engine-last';

const severityRank = { critique: 0, haute: 1, eleve: 1, moyenne: 2, moyen: 2, basse: 3, faible: 3 };

function toRecommendation(finding) {
  return {
    id: finding.id,
    title: finding.title,
    summary: finding.description || '',
    recommendation_type: finding.category || finding.type || 'audit',
    module_target: finding.module,
    priority: finding.severity || 'moyenne',
    status: 'nouvelle',
    action_recommandee: finding.recommended_action,
    confidence_score: Math.round((finding.confidence_score || 0.85) * 100),
    source_data: { source_records: finding.source_records || [], issue_key: finding.issue_key },
    issue_key: finding.issue_key,
    created_by_ai: true,
  };
}

/** Moteur ERP Health - détecte, explique, propose, suit. */
export function runErpHealthEngine(data = {}) {
  const auditReport = runErpAuditEngine(data);
  const riskReport = runRiskEngine({ ...data, auditReport });
  const audit = auditReport.findings;
  const predictions = evaluatePredictiveRules(data);
  const profitability = evaluateProfitabilityRules(data);
  const uxSurveillance = evaluateSurveillanceUxRules();
  const uxAudit = evaluateErpUxAuditRules();

  const findings = [...audit, ...profitability, ...uxSurveillance, ...uxAudit, ...predictions.map((p) => ({
    ...p,
    category: 'predictive',
    recommended_action: p.recommended_action,
  }))].sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));

  const critical = findings.filter((f) => f.severity === 'critique' || f.severity === 'haute').length;
  const score = Math.max(0, Math.round(100 - critical * 8 - findings.length * 2));

  const recommendations = findings.slice(0, 50).map(toRecommendation);
  const autoTasks = findings.filter((f) => f.auto_action === 'create_task').slice(0, 5);
  const autoAlerts = findings.filter((f) => f.auto_action === 'create_alert').slice(0, 5);

  const report = {
    score,
    findings,
    risks: riskReport.domainRisks,
    issueGroups: riskReport.issueGroups,
    operationalPriorities: riskReport.operationalPriorities,
    auditReport,
    predictions,
    recommendations,
    autoTasks,
    autoAlerts,
    counts: {
      total: findings.length,
      critical,
      coherence: auditReport.counts.interconnection,
      risks: riskReport.counts.criticalGroups,
      issueGroups: riskReport.counts.groups,
      predictions: predictions.length,
      unreliableMargins: profitability.length,
      ux: uxSurveillance.length + uxAudit.length,
      coverageGaps: auditReport.counts.coverageGaps,
    },
    generated_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ score, counts: report.counts, generated_at: report.generated_at, autoExecution: report.autoExecution || null }));
  } catch { /* ignore */ }

  return report;
}

/** Exécute le moteur et synchronise les recommandations Supabase. */
export async function runErpHealthEngineAndSync(data = {}, { sync = true } = {}) {
  const report = runErpHealthEngine(data);
  if (sync) {
    await syncRecommendationsToSupabase(data).catch(() => {});
  }
  return report;
}

export function loadLastHealthEngineSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

/** Déclenchement différé après modification critique des données (debounce 45s). */
export function scheduleErpHealthOnCriticalChange(getData, onReport, autoActions = null, debounceMs = 45_000) {
  let timer = null;
  let lastFingerprint = '';
  const run = async () => {
    const data = typeof getData === 'function' ? getData() : getData;
    const fingerprint = JSON.stringify([
      (data.sales_orders || data.salesOrders || []).length,
      (data.finances || data.transactions || []).length,
      (data.stock || data.stocks || []).length,
      (data.avicole || data.lots || []).length,
      (data.taches || data.tasks || []).length,
      (data.alertes_center || data.alertes || []).length,
    ]);
    if (fingerprint === lastFingerprint) return;
    lastFingerprint = fingerprint;
    const report = await runErpHealthEngineAndSync(data);
    if (autoActions && typeof autoActions === 'function') {
      report.autoExecution = await applyErpHealthAutoActions(report, autoActions(data, report));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          score: report.score,
          counts: report.counts,
          generated_at: report.generated_at,
          autoExecution: report.autoExecution,
        }));
      } catch { /* ignore */ }
    }
    onReport?.(report);
  };
  return (data) => {
    clearTimeout(timer);
    timer = setTimeout(() => run(data), debounceMs);
    return () => clearTimeout(timer);
  };
}

/** Planification : toutes les heures + à chaque modification critique (appel manuel). */
export function scheduleErpHealthEngine(getData, onReport, intervalMs = 60 * 60 * 1000, autoActions = null) {
  const tick = async () => {
    const data = typeof getData === 'function' ? getData() : getData;
    const report = await runErpHealthEngineAndSync(data);
    if (autoActions && typeof autoActions === 'function') {
      report.autoExecution = await applyErpHealthAutoActions(report, autoActions(data, report));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          score: report.score,
          counts: report.counts,
          generated_at: report.generated_at,
          autoExecution: report.autoExecution,
        }));
      } catch { /* ignore */ }
    }
    onReport?.(report);
  };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
