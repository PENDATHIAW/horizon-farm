import { MODULE_AUDIT_ORDER, MODULE_TARGET_TABS, INTERCONNECTIONS } from '../config/horizonVision.config.js';
import { MODULE_REGISTRY } from '../config/modules.config.js';
import { runErpHealthEngine } from './erpHealthEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);

const MODULE_DATA_KEYS = {
  dashboard: ['sales_orders', 'payments', 'finances', 'animaux', 'avicole', 'stock', 'taches', 'alertes_center'],
  assistant_erp: ['sales_orders', 'finances', 'stock', 'taches', 'alertes_center'],
  centre_ia: ['sales_orders', 'payments', 'finances', 'stock', 'alertes_center', 'taches', 'business_events'],
  objectifs_croissance: ['sales_orders', 'finances', 'business_plans', 'investissements'],
  elevage: ['animaux', 'avicole', 'sante', 'alimentation_logs', 'production_oeufs_logs'],
  commercial: ['sales_orders', 'clients', 'payments', 'sales_opportunities'],
  achats_stock: ['stock', 'fournisseurs', 'finances', 'alimentation_logs'],
  finance_pilotage: ['finances', 'payments', 'investissements', 'business_plans'],
  activite_suivi: ['alertes_center', 'taches', 'tracabilite', 'business_events'],
  documents_rapports: ['documents', 'rapports', 'finances'],
  rh: ['equipements', 'finances', 'documents'],
  gestion_systeme: ['audit_logs'],
};

function scoreFromIssues(issues) {
  const critical = issues.filter((i) => i.severity === 'critique' || i.severity === 'haute').length;
  if (!issues.length) return { status: 'ok', label: 'Conforme', score: 100 };
  if (critical >= 3) return { status: 'bad', label: 'À corriger', score: Math.max(20, 100 - critical * 15 - issues.length * 3) };
  if (critical || issues.length >= 4) return { status: 'warn', label: 'À valider', score: Math.max(40, 100 - critical * 10 - issues.length * 4) };
  return { status: 'warn', label: 'Mineur', score: Math.max(60, 100 - issues.length * 5) };
}

function tabCheck(moduleId) {
  const expected = MODULE_TARGET_TABS[moduleId] || [];
  return { expected, count: expected.length, ok: expected.length > 0 };
}

function dataPresence(data, keys) {
  return keys.map((key) => ({ key, count: arr(data[key]).length, ok: arr(data[key]).length > 0 }));
}

/** Audit automatique vision 2026 — un module à la fois, ordre MODULE_AUDIT_ORDER. */
export function runVisionModuleAudit(data = {}) {
  const health = runErpHealthEngine(data);
  const modules = MODULE_AUDIT_ORDER.map((moduleId) => {
    const label = MODULE_REGISTRY[moduleId]?.label || moduleId;
    const tabs = tabCheck(moduleId);
    const dataKeys = MODULE_DATA_KEYS[moduleId] || [];
    const presence = dataPresence(data, dataKeys);
    const emptyEngines = presence.filter((p) => !p.ok && ['tracabilite', 'audit_logs'].includes(p.key) === false);
    const moduleFindings = health.findings.filter((f) => f.module === moduleId || f.module === moduleId.replace('_pilotage', ''));
    const moduleRisks = health.risks.filter((r) => r.module === moduleId);
    const issues = [];
    const improvements = [];

    if (tabs.count === 0) issues.push({ severity: 'haute', title: 'Onglets cibles absents', detail: 'MODULE_TARGET_TABS non défini' });
    emptyEngines.forEach((p) => {
      if (['dashboard', 'assistant_erp', 'gestion_systeme'].includes(moduleId) && p.key === 'audit_logs') return;
      improvements.push(`Alimenter ${p.key} pour enrichir ${label}`);
    });
    moduleFindings.slice(0, 6).forEach((f) => issues.push({ severity: f.severity || 'moyenne', title: f.title, detail: f.recommended_action || f.description }));
    moduleRisks.filter((r) => r.level === 'critique' || r.level === 'eleve').forEach((r) => issues.push({ severity: r.level === 'critique' ? 'critique' : 'haute', title: r.title, detail: r.detail }));

    const interconnections = Object.entries(INTERCONNECTIONS).flatMap(([event, targets]) =>
      targets.includes(moduleId) ? [{ event, role: 'cible interconnexion' }] : [],
    );

    const lost = [];
    if (moduleId === 'finance_pilotage' && !arr(data.business_plans).length) lost.push('Business plan non alimenté pour dossiers financeurs');
    if (moduleId === 'documents_rapports' && !arr(data.documents).length) lost.push('Bibliothèque documentaire vide');
    if (moduleId === 'elevage' && !arr(data.production_oeufs_logs).length && arr(data.avicole).length) lost.push('Production œufs non saisie malgré lots avicoles');

    const redundancies = [];
    if (moduleId === 'objectifs_croissance' && MODULE_REGISTRY.centre_ia) redundancies.push('Centre décisionnel parallèle — vérifier non-duplication des recommandations');

    const { status, label: statusLabel, score } = scoreFromIssues(issues);

    return {
      moduleId,
      label,
      status,
      statusLabel,
      score,
      tabs: tabs.expected,
      tabsCount: tabs.count,
      dataPresence: presence,
      issues,
      improvements,
      lostFeatures: lost,
      redundancies,
      interconnections,
      findingsCount: moduleFindings.length,
      risksCount: moduleRisks.length,
    };
  });

  const globalScore = Math.round(modules.reduce((s, m) => s + m.score, 0) / Math.max(modules.length, 1));

  return {
    generated_at: new Date().toISOString(),
    globalScore,
    healthScore: health.score,
    modules,
    summary: {
      ok: modules.filter((m) => m.status === 'ok').length,
      warn: modules.filter((m) => m.status === 'warn').length,
      bad: modules.filter((m) => m.status === 'bad').length,
      totalIssues: modules.reduce((s, m) => s + m.issues.length, 0),
      totalImprovements: modules.reduce((s, m) => s + m.improvements.length, 0),
    },
    interconnectionMap: INTERCONNECTIONS,
  };
}
