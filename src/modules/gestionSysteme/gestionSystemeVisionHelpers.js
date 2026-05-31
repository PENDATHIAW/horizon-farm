import { runVisionModuleAudit } from '../../services/visionModuleAuditEngine.js';
import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { evaluateErpUxAuditRules } from '../../services/erpRules/erpUxAuditRules.js';

export function buildGestionSystemeSnapshot(dataMap = {}) {
  const audit = runVisionModuleAudit(dataMap);
  const health = runErpHealthEngine(dataMap);
  const uxFindings = evaluateErpUxAuditRules().map((f) => ({
    ...f,
    module: 'gestion_systeme',
    auto_action: f.severity === 'haute' ? 'create_task' : 'create_alert',
  }));

  const priorityModules = audit.modules
    .filter((m) => m.status !== 'ok')
    .sort((a, b) => a.score - b.score);

  const topIssues = audit.modules.flatMap((mod) =>
    mod.issues.slice(0, 3).map((issue) => ({
      ...issue,
      moduleId: mod.moduleId,
      moduleLabel: mod.label,
      moduleScore: mod.score,
      finding: {
        id: `audit-${mod.moduleId}-${issue.title}`,
        module: mod.moduleId,
        severity: issue.severity || 'moyenne',
        auto_action: 'create_task',
        title: `${mod.label} : ${issue.title}`,
        description: issue.detail,
        recommended_action: `Corriger dans ${mod.label}`,
        confidence_score: 0.9,
      },
    })),
  ).slice(0, 12);

  return {
    audit,
    healthScore: health.score,
    globalScore: audit.globalScore,
    summary: audit.summary,
    priorityModules,
    uxFindings,
    topIssues,
    systemScore: Math.round((audit.globalScore + health.score) / 2),
  };
}

export function buildGestionSystemeCoherenceRows(snapshot) {
  const rows = [];
  (snapshot?.priorityModules || []).forEach((mod) => {
    if (mod.status === 'bad' || mod.score < 70) {
      rows.push({
        id: `mod-${mod.moduleId}`,
        moduleId: mod.moduleId,
        type: 'module',
        title: `${mod.label} — ${mod.statusLabel}`,
        detail: `${mod.issues.length} issue(s) · score ${mod.score}/100`,
        finding: {
          id: `sys-mod-${mod.moduleId}`,
          module: mod.moduleId,
          severity: mod.status === 'bad' ? 'haute' : 'moyenne',
          auto_action: 'create_task',
          title: `Audit ${mod.label} : ${mod.statusLabel}`,
          description: mod.issues[0]?.detail || 'Module à valider',
          recommended_action: `Ouvrir ${mod.label} et corriger les écarts`,
          confidence_score: 0.88,
        },
      });
    }
  });
  (snapshot?.uxFindings || []).slice(0, 4).forEach((f) => {
    rows.push({
      id: f.id,
      type: 'ux',
      title: f.title,
      detail: f.description,
      finding: f,
    });
  });
  return rows;
}
