import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareTrial,
  commitTrial,
  prepareCloseTrial,
  commitCloseTrial,
  prepareHumanValidation,
  commitHumanValidation,
  proposeTrialDecision,
  computeTrialKpis,
} from '../../src/services/agriFeeds/feedTrialWorkflow.js';
import { MODULE_CONFIG } from '../../src/utils/constants.js';
import { CRUD_KEYS } from '../../src/config/modules.config.js';
import {
  computeAgriFeedsReadiness,
  normalizeAgriFeedsDataMap,
} from '../../src/services/agriFeeds/agriFeedsReadinessEngine.js';

const formula = {
  id: 'FF1',
  name: 'Chair croissance',
  status: 'internal_testing',
  target_species: 'broiler',
  target_stage: 'grower',
};
const version = {
  id: 'FFV1',
  formula_id: 'FF1',
  version_code: 'V1',
  theoretical_cost_per_kg: 250,
};

const lots = [
  { id: 'LOT1', nom: 'Chair test', type: 'Chair', initial_count: 500, current_count: 500, weight_avg: 0.05 },
];

const alimentationLogs = [
  { id: 'AL1', cible_id: 'LOT1', type_cible: 'lot_avicole', quantite: 1200, montant_total: 480000, date: '2026-01-05', fournisseur_id: 'F1' },
];

const baseData = {
  feed_formulas: [formula],
  feed_formula_versions: [version],
  feed_formula_ingredients: [],
  feed_finished_batches: [
    { id: 'FFB1', batch_code: 'AF-001', formula_version_id: 'FFV1', quality_status: 'accepted', unit_cost: 320, active: true },
  ],
  avicole: lots,
  animaux: [],
  alimentation_logs: alimentationLogs,
  fournisseurs: [{ id: 'F1', nom: 'NMA' }],
  sales_orders: [],
  production_oeufs_logs: [],
  feed_production_orders: [{ id: 'OF1', formula_version_id: 'FFV1', status: 'completed', real_cost_per_kg: 320 }],
  feed_quality_checks: [{ id: 'QC1', related_type: 'finished_batch', related_id: 'FFB1', result: 'accepted' }],
};

test('MODULE_CONFIG + CRUD_KEYS — étape 4', () => {
  assert.ok(MODULE_CONFIG.feed_trials);
  assert.ok(MODULE_CONFIG.feed_phase1_comparisons);
  assert.ok(CRUD_KEYS.includes('feed_trials'));
  assert.ok(CRUD_KEYS.includes('feed_phase1_comparisons'));
});

test('prepareTrial — version formule obligatoire', () => {
  const preview = prepareTrial({ animal_lot_id: 'LOT1' }, baseData);
  assert.equal(preview.ok, false);
  assert.match(preview.error, /formule/i);
});

test('prepareTrial — lot rejeté bloque', () => {
  const preview = prepareTrial({
    formula_version_id: 'FFV1',
    animal_lot_id: 'LOT1',
    finished_batch_id: 'FFBAD',
  }, {
    ...baseData,
    feed_finished_batches: [{ id: 'FFBAD', quality_status: 'rejected', active: true }],
  });
  assert.equal(preview.ok, false);
});

test('trial workflow — ouvre puis clôture avec décision proposée', async () => {
  const openPreview = prepareTrial({
    formula_version_id: 'FFV1',
    animal_lot_id: 'LOT1',
    finished_batch_id: 'FFB1',
    start_date: '2026-02-01',
    starting_count: 500,
    starting_weight_avg: 0.05,
  }, baseData);
  assert.equal(openPreview.ok, true);
  assert.equal(openPreview.trial.status, 'in_progress');

  let stored = null;
  await commitTrial(openPreview, {
    onCreateTrial: async (t) => { stored = t; return t; },
    onCreateBusinessEvent: async () => ({}),
  });
  assert.ok(stored?.trial_code);

  const dataWithTrial = { ...baseData, feed_trials: [stored] };

  const closeBad = prepareCloseTrial({
    trial_id: stored.id,
    ending_count: 480,
    total_feed_consumed: 0,
  }, dataWithTrial);
  assert.equal(closeBad.ok, false);
  assert.match(closeBad.error, /aliment/i);

  const closePreview = prepareCloseTrial({
    trial_id: stored.id,
    end_date: '2026-03-01',
    ending_count: 480,
    ending_weight_avg: 1.9,
    total_feed_consumed: 1150,
    total_feed_cost: 380000,
    mortality_count: 20,
    revenue: 900000,
  }, dataWithTrial);

  assert.equal(closePreview.ok, true);
  assert.equal(closePreview.trialPatch.status, 'closed');
  assert.ok(closePreview.trialPatch.feed_conversion_ratio > 0);
  assert.ok(closePreview.trialPatch.mortality_rate > 0);
  assert.ok(closePreview.comparisonRow.id.startsWith('FPC'));
  assert.ok(closePreview.proposal.value);
  assert.ok(['validate', 'improve', 'abandon', 'retest'].includes(closePreview.proposal.value));

  const commits = { trial: null, comparison: null };
  await commitCloseTrial(closePreview, {
    onUpdateTrial: async (id, patch) => { commits.trial = { id, ...patch }; return commits.trial; },
    onCreateComparison: async (row) => { commits.comparison = row; return row; },
    onCreateBusinessEvent: async () => ({}),
    onCreateAlert: async () => ({}),
  });
  assert.equal(commits.trial.status, 'closed');
  assert.equal(commits.comparison.trial_id, stored.id);
  assert.ok(commits.comparison.metrics.length > 0);
});

test('proposeTrialDecision — mortalité élevée propose abandon', () => {
  const proposal = proposeTrialDecision({
    trial: { mortality_rate: 15, feed_conversion_ratio: 2 },
    comparison: { status: 'donnees_insuffisantes', comparison: [] },
  });
  assert.equal(proposal.value, 'abandon');
});

test('proposeTrialDecision — comparaison favorable propose validate', () => {
  const proposal = proposeTrialDecision({
    trial: { mortality_rate: 4, feed_conversion_ratio: 1.7 },
    comparison: {
      status: 'favorable',
      comparison: [
        { result: 'favorable' }, { result: 'favorable' }, { result: 'favorable' }, { result: 'equivalent' },
      ],
    },
  });
  assert.equal(proposal.value, 'validate');
});

test('proposeTrialDecision — comparaison moins performante propose improve', () => {
  const proposal = proposeTrialDecision({
    trial: { mortality_rate: 6, feed_conversion_ratio: 2.2 },
    comparison: {
      status: 'moins_performant',
      comparison: [
        { result: 'moins_performant' }, { result: 'moins_performant' }, { result: 'equivalent' },
      ],
    },
  });
  assert.equal(proposal.value, 'improve');
});

test('validation humaine — refuse essai non clôturé', () => {
  const preview = prepareHumanValidation({
    trial_id: 'T1',
    decision: 'validate',
    reviewed_by: 'DG',
  }, {
    feed_trials: [{ id: 'T1', status: 'in_progress' }],
  });
  assert.equal(preview.ok, false);
  assert.match(preview.error, /clôturé/i);
});

test('validation humaine — met à jour trial + comparaison', async () => {
  const preview = prepareHumanValidation({
    trial_id: 'T1',
    decision: 'validate',
    reviewed_by: 'DG Horizon',
    decision_notes: 'Validation directeur',
  }, {
    feed_trials: [{ id: 'T1', status: 'closed', trial_code: 'TR-1', phase1_comparison_id: 'FPC1' }],
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.trialPatch.reviewed_by_human, true);
  assert.equal(preview.trialPatch.decision, 'validate');
  assert.ok(preview.comparisonPatch);

  const applied = { trial: null, comparison: null };
  await commitHumanValidation(preview, {
    onUpdateTrial: async (id, patch) => { applied.trial = { id, ...patch }; return applied.trial; },
    onUpdateComparison: async (id, patch) => { applied.comparison = { id, ...patch }; return applied.comparison; },
    onCreateBusinessEvent: async () => ({}),
  });
  assert.equal(applied.trial.reviewed_by, 'DG Horizon');
  assert.equal(applied.comparison.reviewed_by_human, true);
});

test('validation humaine — alimente les portes Phase 2B du readiness', () => {
  const dataMap = normalizeAgriFeedsDataMap({
    alimentation_logs: Array.from({ length: 20 }, (_, i) => ({
      id: `A${i}`, quantite: 20, montant_total: 10000, cible_id: 'LOT1', type_cible: 'lot_avicole',
    })),
    avicole: [
      { id: 'LOT1', type: 'Chair', initial_count: 500, mortality: 15, current_count: 485, indice_consommation: 1.8 },
    ],
    fournisseurs: [
      { id: 'F1', nom: 'NMA', supplier_type: 'matiere_premiere' },
      { id: 'F2', supplier_type: 'technique' },
    ],
    veterinaires: [{ id: 'V1' }],
    finances: [{ id: 'T1', type: 'depense', categorie: 'aliment', montant: 300000 }],
    equipements: [{ id: 'EQ1', type: 'forage' }],
    payments: [{ id: 'P1', montant: 400000 }],
    invoices: [],
    sales_orders: [{ id: 'SO1', montant_total: 500000 }],
    feed_facility_zones: [
      { id: 'z1', zone_type: 'raw_material_storage', status: 'in_use' },
      { id: 'z2', zone_type: 'production_area', status: 'in_use' },
      { id: 'z3', zone_type: 'finished_goods_storage', status: 'in_use' },
      { id: 'z4', zone_type: 'quality_control', status: 'in_use' },
    ],
    feed_raw_materials: [
      { id: 'MP1' }, { id: 'MP2' }, { id: 'MP3' },
    ],
    feed_raw_batches: [
      { id: 'B1', raw_material_id: 'MP1', quality_status: 'accepted', quantity_available: 100 },
      { id: 'B2', raw_material_id: 'MP2', quality_status: 'accepted', quantity_available: 80 },
      { id: 'B3', raw_material_id: 'MP3', quality_status: 'accepted', quantity_available: 50 },
    ],
    feed_formulas: [{ id: 'FF1', status: 'commercializable' }],
    feed_formula_versions: [{ id: 'FFV1', formula_id: 'FF1', status: 'commercializable' }],
    feed_production_orders: [{ id: 'OF1', real_cost_per_kg: 320, status: 'completed' }],
    feed_finished_batches: [{ id: 'FFB1', quality_status: 'accepted', active: true, unit_cost: 320 }],
    feed_quality_checks: [{ id: 'QC1', related_type: 'finished_batch', related_id: 'FFB1', result: 'accepted' }],
    feed_trials: [{
      id: 'FTR1',
      status: 'closed',
      decision: 'validate',
      reviewed_by_human: true,
      reviewed_by: 'DG',
      phase1_comparison: true,
      phase1_comparison_id: 'FPC1',
    }],
    feed_phase1_comparisons: [{
      id: 'FPC1',
      trial_id: 'FTR1',
      overall_status: 'favorable',
      reviewed_by_human: true,
    }],
    alertes_center: [],
  });

  const readiness = computeAgriFeedsReadiness(dataMap);
  assert.equal(readiness.per_mode.PROGRESSIVE_SALES.gates.formulaTested, true);
  assert.equal(readiness.per_mode.PROGRESSIVE_SALES.gates.humanValidation, true);
  assert.equal(readiness.per_mode.PROGRESSIVE_SALES.gates.phase1Comparison, true);
  assert.equal(readiness.recommendedMode, 'PROGRESSIVE_SALES');
});

test('computeTrialKpis — calcule IC, mortalité, coût / sujet', () => {
  const kpis = computeTrialKpis({
    starting_count: 500,
    ending_count: 480,
    starting_weight_avg: 0.05,
    ending_weight_avg: 1.9,
    total_feed_consumed: 1150,
    total_feed_cost: 380000,
    mortality_count: 20,
    start_date: '2026-02-01',
    end_date: '2026-03-01',
  });
  assert.ok(kpis.feed_conversion_ratio > 0);
  assert.equal(kpis.mortality_count, 20);
  assert.equal(kpis.mortality_rate, 4);
  assert.ok(kpis.cost_feed_per_animal > 0);
});
