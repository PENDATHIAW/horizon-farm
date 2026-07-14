/**
 * AGRI FEEDS - reporting financeur, qualité, permissions et audit.
 */
import { fmtCurrency, fmtNumber, fmtPercent, toNumber } from '../../utils/format.js';
import { computeAgriFeedsReadiness, normalizeAgriFeedsDataMap } from './agriFeedsReadinessEngine.js';
import { computeAgriFeedsCommercialKpis } from './feedCommercialWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clean = (value = '') => String(value || '').trim();

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const AGRI_FEEDS_ACTION_PERMISSIONS = Object.freeze({
  view: ['admin', 'manager', 'responsable_agri_feeds', 'technicien_elevage', 'comptable', 'finance', 'commercial', 'lecteur_financeur'],
  manage_materials: ['admin', 'manager', 'responsable_agri_feeds'],
  manage_formulas: ['admin', 'manager', 'responsable_agri_feeds'],
  close_production_order: ['admin', 'manager', 'responsable_agri_feeds'],
  validate_formula: ['admin', 'manager', 'responsable_agri_feeds'],
  human_validate_trial: ['admin', 'manager', 'responsable_agri_feeds'],
  sell_feed: ['admin', 'manager', 'responsable_agri_feeds', 'commercial'],
  record_feedback: ['admin', 'manager', 'responsable_agri_feeds', 'commercial'],
  view_finance: ['admin', 'manager', 'responsable_agri_feeds', 'comptable', 'finance', 'lecteur_financeur'],
  export_report: ['admin', 'manager', 'responsable_agri_feeds', 'comptable', 'finance', 'lecteur_financeur'],
  view_audit: ['admin', 'manager', 'responsable_agri_feeds', 'lecteur_financeur'],
});

export function canPerformAgriFeedsAction(role = 'visiteur', action = 'view') {
  const allowed = AGRI_FEEDS_ACTION_PERMISSIONS[action] || AGRI_FEEDS_ACTION_PERMISSIONS.view;
  return allowed.includes(role) || role === 'admin';
}

export function buildAgriFeedsPermissionMatrix() {
  return Object.entries(AGRI_FEEDS_ACTION_PERMISSIONS).map(([action, roles]) => ({
    action,
    label: labelAgriFeedsAction(action),
    roles,
  }));
}

export function labelAgriFeedsAction(action = '') {
  const labels = {
    view: 'Voir AGRI FEEDS',
    manage_materials: 'Gérer matières & fournisseurs',
    manage_formulas: 'Créer / modifier formules',
    close_production_order: 'Clôturer un ordre de fabrication',
    validate_formula: 'Passer une formule en commercialisable',
    human_validate_trial: 'Valider humainement un essai',
    sell_feed: 'Vendre un lot AGRI FEEDS',
    record_feedback: 'Enregistrer retours clients',
    view_finance: 'Voir indicateurs financiers',
    export_report: 'Générer rapport financeur',
    view_audit: 'Voir audit sensible',
  };
  return labels[action] || action;
}

export function buildAgriFeedsAuditLog({
  action,
  actor = 'ERP Horizon Farm',
  recordId,
  metadata = {},
  device = 'web',
} = {}) {
  return {
    id: makeId('LOG'),
    actor,
    action: clean(action) || 'agri_feeds_action',
    module: 'agri_feeds',
    record_id: recordId || metadata.record_id || null,
    device,
    metadata: {
      ...metadata,
      created_from: 'agri_feeds_reporting_service',
    },
  };
}

export function buildAgriFeedsReportRow(report = {}, { actor = 'ERP Horizon Farm' } = {}) {
  const period = report.period || new Date().toISOString().slice(0, 7);
  return {
    id: makeId('RPT'),
    title: `Rapport AGRI FEEDS - ${period}`,
    report_type: 'agri_feeds_financeur',
    period,
    status: 'pret',
    channel: 'erp',
    summary: report.executive_summary || '',
    metadata: {
      module_source: 'agri_feeds',
      actor,
      report,
      created_from: 'agri_feeds_reporting_service',
    },
  };
}

export function computeTraceabilityCompleteness(dataMap = {}) {
  const batches = arr(dataMap.feed_finished_batches);
  if (!batches.length) {
    return { score: 0, total: 0, complete: 0, missing: ['Aucun lot fini AGRI FEEDS.'] };
  }
  const checks = arr(dataMap.feed_quality_checks);
  const orders = arr(dataMap.feed_production_orders);
  const versions = arr(dataMap.feed_formula_versions);
  const formulas = arr(dataMap.feed_formulas);
  let complete = 0;
  const missing = [];
  batches.forEach((batch) => {
    const order = orders.find((o) => String(o.id) === String(batch.production_order_id));
    const version = versions.find((v) => String(v.id) === String(batch.formula_version_id));
    const formula = formulas.find((f) => String(f.id) === String(version?.formula_id));
    const qc = checks.some((c) => String(c.related_type) === 'finished_batch' && String(c.related_id) === String(batch.id));
    const hasCore = batch.batch_code && batch.production_date && version?.id && formula?.id && order?.id && qc && batch.qr_code_payload;
    if (hasCore) complete += 1;
    else missing.push(batch.batch_code || batch.id);
  });
  return {
    score: batches.length ? (complete / batches.length) * 100 : 0,
    total: batches.length,
    complete,
    missing,
  };
}

export function computeQualitySummary(dataMap = {}) {
  const checks = arr(dataMap.feed_quality_checks);
  const rawBatches = arr(dataMap.feed_raw_batches);
  const finished = arr(dataMap.feed_finished_batches);
  const rejectedRaw = rawBatches.filter((b) => norm(b.quality_status) === 'rejected').length;
  const acceptedRaw = rawBatches.filter((b) => norm(b.quality_status) === 'accepted').length;
  const finishedAccepted = finished.filter((b) => norm(b.quality_status) === 'accepted').length;
  const complaints = arr(dataMap.business_events).filter((e) => norm(e.event_type).includes('reclamation') && norm(e.module_source) === 'agri_feeds');
  return {
    checks_count: checks.length,
    raw_batches_count: rawBatches.length,
    accepted_raw_batches: acceptedRaw,
    rejected_raw_batches: rejectedRaw,
    finished_batches_count: finished.length,
    accepted_finished_batches: finishedAccepted,
    complaints_count: complaints.length,
    quality_attention: rejectedRaw > 0 || complaints.length > 0,
  };
}

export function computeAgriFeedsOperationalSummary(dataMap = {}) {
  const formulas = arr(dataMap.feed_formulas);
  const versions = arr(dataMap.feed_formula_versions);
  const orders = arr(dataMap.feed_production_orders);
  const finished = arr(dataMap.feed_finished_batches);
  const trials = arr(dataMap.feed_trials);
  const comparisons = arr(dataMap.feed_phase1_comparisons);
  const producedKg = finished.reduce((sum, b) => sum + toNumber(b.quantity_produced), 0);
  const availableKg = finished.reduce((sum, b) => sum + toNumber(b.quantity_available), 0);
  const completedOrders = orders.filter((o) => norm(o.status) === 'completed');
  const realCostValues = completedOrders.map((o) => toNumber(o.real_cost_per_kg)).filter((v) => v > 0);
  const avgRealCost = realCostValues.length ? realCostValues.reduce((s, v) => s + v, 0) / realCostValues.length : 0;
  return {
    formulas_count: formulas.length,
    formula_versions_count: versions.length,
    commercializable_formulas: formulas.filter((f) => norm(f.status) === 'commercializable').length,
    production_orders_count: orders.length,
    completed_orders_count: completedOrders.length,
    finished_batches_count: finished.length,
    produced_kg: producedKg,
    available_kg: availableKg,
    avg_real_cost_per_kg: avgRealCost,
    trials_count: trials.length,
    closed_trials_count: trials.filter((t) => norm(t.status) === 'closed').length,
    human_validated_trials: trials.filter((t) => t.reviewed_by_human).length,
    phase1_comparisons_count: comparisons.length,
  };
}

export function buildAgriFeedsFinanceurReport(dataMap = {}, options = {}) {
  const normalized = normalizeAgriFeedsDataMap(dataMap);
  const period = options.period || new Date().toISOString().slice(0, 7);
  const readiness = computeAgriFeedsReadiness(normalized);
  const operational = computeAgriFeedsOperationalSummary(normalized);
  const quality = computeQualitySummary(normalized);
  const traceability = computeTraceabilityCompleteness(normalized);
  const commercial = computeAgriFeedsCommercialKpis(normalized, { now: options.now || new Date() });

  const executiveSummary = [
    `Mode recommandé : ${readiness.recommendedMode}.`,
    `Score readiness : ${Math.round(readiness.readiness_score || 0)}/100.`,
    `Production AGRI FEEDS : ${fmtNumber(Math.round(operational.produced_kg))} kg produits, ${fmtNumber(Math.round(operational.available_kg))} kg disponibles.`,
    `Vente progressive : ${fmtCurrency(commercial.revenue_month)} de chiffre d’affaires mensuel suivi et ${fmtCurrency(commercial.receivables)} de créances à surveiller.`,
    `Traçabilité : ${fmtPercent(traceability.score, 0)} des lots finis ont une chaîne documentaire complète selon les données disponibles.`,
  ].join(' ');

  return {
    period,
    generated_at: new Date().toISOString(),
    executive_summary: executiveSummary,
    readiness: {
      score: readiness.readiness_score || 0,
      recommendedMode: readiness.recommendedMode,
      blockers: readiness.blockers || [],
      warnings: readiness.warnings || [],
      priority_actions: readiness.priority_actions || [],
      human_validation_required: readiness.human_validation_required !== false,
    },
    operational,
    quality,
    traceability,
    commercial,
    indicators: [
      { label: 'Score readiness', value: `${Math.round(readiness.readiness_score || 0)}/100` },
      { label: 'Formules commercialisables', value: fmtNumber(operational.commercializable_formulas) },
      { label: 'Lots finis', value: fmtNumber(operational.finished_batches_count) },
      { label: 'Kg produits', value: fmtNumber(Math.round(operational.produced_kg)) },
      { label: 'Essais clôturés', value: fmtNumber(operational.closed_trials_count) },
      { label: 'Validations humaines', value: fmtNumber(operational.human_validated_trials) },
      { label: 'Contrôles qualité', value: fmtNumber(quality.checks_count) },
      { label: 'Traçabilité lots finis', value: fmtPercent(traceability.score, 0) },
      { label: 'CA AGRI FEEDS du mois', value: fmtCurrency(commercial.revenue_month) },
      { label: 'Marge estimée du mois', value: fmtCurrency(commercial.margin_month) },
      { label: 'Créances AGRI FEEDS', value: fmtCurrency(commercial.receivables) },
      { label: 'Clients à relancer', value: fmtNumber(commercial.clients_to_follow) },
    ],
    narrative: buildFinanceurNarrative({ readiness, operational, quality, traceability, commercial }),
  };
}

export function buildFinanceurNarrative({ readiness = {}, operational = {}, quality = {}, traceability = {}, commercial = {} } = {}) {
  const lines = [];
  lines.push('AGRI FEEDS reste rattaché à Horizon Farm et progresse selon les données observées dans l’ERP.');
  if (readiness.recommendedMode === 'REFERENCE') {
    lines.push('La priorité reste la consolidation de la référence Phase 1 avant toute montée en production.');
  } else if (readiness.recommendedMode === 'PILOT_INTERNAL') {
    lines.push('La production pilote interne peut être préparée ou poursuivie après confirmation.');
  } else {
    lines.push('La vente progressive est envisageable uniquement sur les formules validées et les lots contrôlés.');
  }
  if (quality.quality_attention) {
    lines.push('Des points qualité ou réclamations nécessitent un suivi avant élargissement commercial.');
  }
  if (traceability.score < 80 && traceability.total > 0) {
    lines.push('La traçabilité des lots finis doit être renforcée pour sécuriser le reporting et les réclamations.');
  }
  if (commercial.receivables > 0) {
    lines.push('Les créances AGRI FEEDS doivent être suivies avant d’élargir le portefeuille clients.');
  }
  if (operational.human_validated_trials > 0) {
    lines.push('Les validations humaines enregistrées renforcent la fiabilité des décisions de commercialisation.');
  }
  return lines;
}

export function prepareAgriFeedsReportCommit(report = {}, { actor = 'ERP Horizon Farm' } = {}) {
  const reportRow = buildAgriFeedsReportRow(report, { actor });
  const auditLog = buildAgriFeedsAuditLog({
    action: 'agri_feeds_report_generated',
    actor,
    recordId: reportRow.id,
    metadata: {
      period: report.period,
      readiness_score: report.readiness?.score,
      recommended_mode: report.readiness?.recommendedMode,
    },
  });
  const businessEvent = {
    id: makeId('EVT'),
    event_type: 'agri_feeds_rapport_financeur',
    module_source: 'agri_feeds',
    entity_type: 'report',
    entity_id: reportRow.id,
    title: `Rapport AGRI FEEDS - ${report.period}`,
    description: report.executive_summary,
    event_date: new Date().toISOString().slice(0, 10),
    severity: report.readiness?.blockers?.length ? 'moyenne' : 'info',
    metadata: { created_from: 'agri_feeds_reporting_service' },
  };
  return { reportRow, auditLog, businessEvent };
}

export async function commitAgriFeedsReport(preview = {}, handlers = {}) {
  const results = {};
  if (handlers.onCreateReport && preview.reportRow) {
    results.report = await handlers.onCreateReport(preview.reportRow);
  }
  if (handlers.onCreateAuditLog && preview.auditLog) {
    results.auditLog = await handlers.onCreateAuditLog(preview.auditLog);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    results.businessEvent = await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  return results;
}
