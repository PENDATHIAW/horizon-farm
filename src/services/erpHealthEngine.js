import { computeErpAuditFindings } from './erpRules/index.js';
import { evaluateCoherenceRules } from './erpRules/coherenceRules.js';
import { evaluateRiskRules } from './erpRules/riskRules.js';
import { evaluatePredictiveRules } from './erpRules/predictiveRules.js';
import { evaluateProfitabilityRules } from './erpRules/profitabilityRules.js';
import { syncRecommendationsToSupabase } from './aiRecommendationsService.js';

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
    source_data: { source_records: finding.source_records || [] },
    created_by_ai: true,
  };
}

/** Moteur ERP Health — détecte, explique, propose, suit. */
export function runErpHealthEngine(data = {}) {
  const audit = computeErpAuditFindings(data);
  const coherence = evaluateCoherenceRules(data);
  const risks = evaluateRiskRules(data);
  const predictions = evaluatePredictiveRules(data);
  const profitability = evaluateProfitabilityRules(data);

  const findings = [...audit, ...coherence, ...profitability, ...predictions.map((p) => ({
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
    risks,
    predictions,
    recommendations,
    autoTasks,
    autoAlerts,
    counts: {
      total: findings.length,
      critical,
      coherence: coherence.length,
      risks: risks.filter((r) => r.level === 'critique' || r.level === 'eleve').length,
      predictions: predictions.length,
      unreliableMargins: profitability.length,
    },
    generated_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ score, counts: report.counts, generated_at: report.generated_at }));
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

/** Planification : toutes les heures + à chaque modification critique (appel manuel). */
export function scheduleErpHealthEngine(getData, onReport, intervalMs = 60 * 60 * 1000) {
  const tick = async () => {
    const data = typeof getData === 'function' ? getData() : getData;
    const report = await runErpHealthEngineAndSync(data);
    onReport?.(report);
  };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
