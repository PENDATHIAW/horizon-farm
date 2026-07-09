import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgriFeedsAuditLog,
  buildAgriFeedsFinanceurReport,
  buildAgriFeedsPermissionMatrix,
  buildAgriFeedsReportRow,
  canPerformAgriFeedsAction,
  commitAgriFeedsReport,
  computeQualitySummary,
  computeTraceabilityCompleteness,
  prepareAgriFeedsReportCommit,
} from '../../src/services/agriFeeds/agriFeedsReportingService.js';

const dataMap = {
  alimentation_logs: Array.from({ length: 20 }, (_, i) => ({
    id: `A${i}`, quantite: 20, montant_total: 10000, cible_id: 'LOT1', type_cible: 'lot_avicole', date: '2026-01-05',
  })),
  avicole: [{ id: 'LOT1', type: 'Chair', initial_count: 500, current_count: 485, mortality: 15, indice_consommation: 1.8 }],
  fournisseurs: [{ id: 'F1', nom: 'NMA', supplier_type: 'matiere_premiere' }, { id: 'F2', supplier_type: 'technique' }],
  veterinaires: [{ id: 'V1' }],
  finances: [{ id: 'T1', type: 'depense', categorie: 'aliment', montant: 300000 }],
  equipements: [{ id: 'EQ1', type: 'forage' }],
  payments: [{ id: 'P1', montant: 400000 }],
  invoices: [],
  sales_orders: [
    { id: 'SO1', client_id: 'CLI1', module_source: 'agri_feeds', order_date: '2026-07-02', montant_total: 20000, reste_a_payer: 5000 },
  ],
  sales_order_items: [{ id: 'I1', source_type: 'feed_finished_batch', margin: 4000 }],
  clients: [{ id: 'CLI1', nom: 'Ferme Diop', repeat_purchase_score: 1 }],
  feed_facility_zones: [
    { id: 'z1', zone_type: 'raw_material_storage', status: 'in_use' },
    { id: 'z2', zone_type: 'production_area', status: 'in_use' },
    { id: 'z3', zone_type: 'finished_goods_storage', status: 'in_use' },
    { id: 'z4', zone_type: 'quality_control', status: 'in_use' },
  ],
  feed_raw_materials: [{ id: 'MP1' }, { id: 'MP2' }, { id: 'MP3' }],
  feed_raw_batches: [
    { id: 'B1', raw_material_id: 'MP1', quality_status: 'accepted', quantity_available: 100 },
    { id: 'B2', raw_material_id: 'MP2', quality_status: 'accepted', quantity_available: 80 },
    { id: 'B3', raw_material_id: 'MP3', quality_status: 'rejected', quantity_available: 0 },
  ],
  feed_formulas: [{ id: 'FF1', name: 'Chair croissance', status: 'commercializable' }],
  feed_formula_versions: [{ id: 'FFV1', formula_id: 'FF1', status: 'commercializable', version_code: 'V1' }],
  feed_production_orders: [{ id: 'OF1', formula_version_id: 'FFV1', real_cost_per_kg: 320, status: 'completed' }],
  feed_finished_batches: [{
    id: 'FFB1', batch_code: 'AF-001', formula_version_id: 'FFV1', production_order_id: 'OF1',
    production_date: '2026-07-01', quantity_produced: 100, quantity_available: 60, quality_status: 'accepted',
    qr_code_payload: '{}', unit_cost: 320, active: true, destination: 'commercial_sale',
  }],
  feed_quality_checks: [{ id: 'QC1', related_type: 'finished_batch', related_id: 'FFB1', result: 'accepted' }],
  feed_trials: [{ id: 'FTR1', status: 'closed', decision: 'validate', reviewed_by_human: true, phase1_comparison: true, phase1_comparison_id: 'FPC1' }],
  feed_phase1_comparisons: [{ id: 'FPC1', trial_id: 'FTR1', overall_status: 'favorable', reviewed_by_human: true }],
  business_events: [{ id: 'EVT1', event_type: 'agri_feeds_reclamation_client', module_source: 'agri_feeds' }],
  alertes_center: [],
};

test('permissions AGRI FEEDS — actions sensibles réservées', () => {
  assert.equal(canPerformAgriFeedsAction('commercial', 'sell_feed'), true);
  assert.equal(canPerformAgriFeedsAction('commercial', 'validate_formula'), false);
  assert.equal(canPerformAgriFeedsAction('lecteur_financeur', 'export_report'), true);
  const matrix = buildAgriFeedsPermissionMatrix();
  assert.ok(matrix.some((row) => row.action === 'human_validate_trial'));
});

test('qualité et traçabilité — calcule les indicateurs clés', () => {
  const quality = computeQualitySummary(dataMap);
  assert.equal(quality.checks_count, 1);
  assert.equal(quality.rejected_raw_batches, 1);
  assert.equal(quality.complaints_count, 1);
  assert.equal(quality.quality_attention, true);

  const trace = computeTraceabilityCompleteness(dataMap);
  assert.equal(trace.total, 1);
  assert.equal(trace.complete, 1);
  assert.equal(trace.score, 100);
});

test('rapport financeur — construit une synthèse sans inventer de données', () => {
  const report = buildAgriFeedsFinanceurReport(dataMap, { now: new Date('2026-07-09') });
  assert.equal(report.period, '2026-07');
  assert.ok(report.executive_summary.includes('Mode recommandé'));
  assert.ok(report.indicators.length >= 10);
  assert.equal(report.quality.complaints_count, 1);
  assert.equal(report.traceability.score, 100);
  assert.equal(report.commercial.receivables, 5000);
});

test('audit + rapport — prépare les lignes ERP attendues', async () => {
  const report = buildAgriFeedsFinanceurReport(dataMap, { now: new Date('2026-07-09') });
  const reportRow = buildAgriFeedsReportRow(report, { actor: 'manager' });
  assert.equal(reportRow.report_type, 'agri_feeds_financeur');

  const audit = buildAgriFeedsAuditLog({ action: 'agri_feeds_report_generated', actor: 'manager', recordId: reportRow.id });
  assert.equal(audit.module, 'agri_feeds');
  assert.equal(audit.record_id, reportRow.id);

  const preview = prepareAgriFeedsReportCommit(report, { actor: 'manager' });
  const committed = {};
  await commitAgriFeedsReport(preview, {
    onCreateReport: async (row) => { committed.report = row; return row; },
    onCreateAuditLog: async (row) => { committed.audit = row; return row; },
    onCreateBusinessEvent: async (row) => { committed.event = row; return row; },
  });
  assert.equal(committed.report.report_type, 'agri_feeds_financeur');
  assert.equal(committed.audit.action, 'agri_feeds_report_generated');
  assert.equal(committed.event.event_type, 'agri_feeds_rapport_financeur');
});
