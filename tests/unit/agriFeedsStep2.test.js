import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTheoreticalFormulaCost,
  compareFormulaCostToPrevious,
  computeCostVariance,
} from '../../src/services/agriFeeds/feedCostEngine.js';
import {
  prepareRawMaterialReception,
  commitRawMaterialReception,
  assertBatchUsableInProduction,
  supplierHints,
} from '../../src/services/agriFeeds/rawMaterialWorkflow.js';
import {
  prepareFormulaDraft,
  prepareFormulaStatusChange,
} from '../../src/services/agriFeeds/formulaWorkflow.js';
import {
  evaluateCommercializableGate,
  canTransitionFormulaStatus,
} from '../../src/services/agriFeeds/formulaLifecycleService.js';
import { MODULE_CONFIG } from '../../src/utils/constants.js';
import { CRUD_KEYS } from '../../src/config/modules.config.js';

const material = {
  id: 'FRM1',
  name: 'Maïs',
  category: 'cereal',
  unit: 'kg',
  standard_moisture_threshold: 14,
  is_experimental: false,
};

test('MODULE_CONFIG — collections AGRI FEEDS étape 2', () => {
  assert.ok(MODULE_CONFIG.feed_raw_materials);
  assert.ok(MODULE_CONFIG.feed_formulas);
  assert.ok(CRUD_KEYS.includes('feed_raw_batches'));
  assert.ok(CRUD_KEYS.includes('feed_formula_ingredients'));
});

test('coût théorique — 100 kg formule', () => {
  const cost = computeTheoreticalFormulaCost([
    { raw_material_id: 'A', percentage: 60, latest_unit_cost: 200 },
    { raw_material_id: 'B', percentage: 40, latest_unit_cost: 400 },
  ]);
  assert.equal(cost.total_percentage, 100);
  assert.equal(cost.cost_for_100kg, 60 * 200 + 40 * 400);
  assert.equal(cost.theoretical_cost_per_kg, cost.cost_for_100kg / 100);
});

test('écart coût — seuil 15 %', () => {
  const ok = computeCostVariance(100, 110, 15);
  assert.equal(ok.exceeds, false);
  const high = computeCostVariance(100, 120, 15);
  assert.equal(high.exceeds, true);
});

test('comparaison coût version précédente', () => {
  const higher = compareFormulaCostToPrevious(120, 100);
  assert.equal(higher.status, 'higher');
});

test('réception MP — entrée stock + finance', async () => {
  const preview = prepareRawMaterialReception({
    raw_material_id: 'FRM1',
    supplier_id: 'FOU1',
    quantity_received: 100,
    unit_cost: 250,
    quality_status: 'accepted',
    visual_check: 'conforme',
    smell_check: 'conforme',
    insect_check: 'absent',
    impurity_check: 'faible',
    payment_status: 'paye',
  }, { material, feed_raw_materials: [material] });

  assert.equal(preview.ok, true);
  assert.equal(preview.batch.quantity_available, 100);
  assert.equal(preview.stockPatch.categorie, 'matiere_premiere_aliment');
  assert.equal(preview.finance.montant, 25000);
  assert.equal(preview.quality.usable_in_production, true);

  const created = { batch: null, stock: null, finance: null, movement: null };
  await commitRawMaterialReception(preview, {
    onCreateBatch: async (b) => { created.batch = b; return b; },
    onCreateStock: async (s) => { created.stock = s; return s; },
    onCreateStockMovement: async (m) => { created.movement = m; return m; },
    onCreateFinance: async (f) => { created.finance = f; return f; },
    onCreateBusinessEvent: async () => ({}),
  });
  assert.ok(created.batch?.batch_code);
  assert.equal(created.stock.quantite, 100);
  assert.equal(created.finance.montant, 25000);
});

test('QC rejeté — production bloquée', () => {
  const preview = prepareRawMaterialReception({
    raw_material_id: 'FRM1',
    quantity_received: 50,
    unit_cost: 200,
    moisture_value: 20,
    quality_status: 'rejected',
    force_reject: true,
    visual_check: 'non conforme',
    smell_check: 'douteux',
  }, { material });

  assert.equal(preview.ok, true);
  assert.equal(preview.batch.quality_status, 'rejected');
  assert.equal(preview.batch.quantity_available, 0);
  assert.ok(preview.alert);

  const gate = assertBatchUsableInProduction(preview.batch);
  assert.equal(gate.ok, false);
  assert.match(gate.message, /rejet/i);
});

test('supplier hints — dernier prix', () => {
  const hints = supplierHints(
    { id: 'FOU1', nom: 'NMA', average_delivery_delay: 3 },
    {
      feed_raw_materials: [material],
      feed_raw_batches: [
        { supplier_id: 'FOU1', raw_material_id: 'FRM1', unit_cost: 220, received_date: '2026-03-01', quality_status: 'accepted', storage_location: 'Hangar MP' },
      ],
    },
  );
  assert.equal(hints.lastPriceByMaterial.FRM1, 220);
  assert.equal(hints.usualStorageLocation, 'Hangar MP');
  assert.equal(hints.usualMaterials[0].id, 'FRM1');
});

test('formule — coût théorique + draft', () => {
  const preview = prepareFormulaDraft({
    name: 'Chair croissance',
    target_species: 'broiler',
    target_stage: 'grower',
    ingredients: [
      { raw_material_id: 'FRM1', percentage: 70, latest_unit_cost: 200 },
      { raw_material_id: 'FRM2', percentage: 30, latest_unit_cost: 500 },
    ],
  }, {
    feed_raw_materials: [
      material,
      { id: 'FRM2', name: 'Tourteau', category: 'oilcake', unit: 'kg' },
    ],
  });
  assert.equal(preview.ok, true);
  assert.ok(preview.version.theoretical_cost_per_kg > 0);
  assert.equal(preview.ingredients.length, 2);
  assert.equal(preview.formula.status, 'draft');
});

test('commercialisable bloqué sans tests', () => {
  const formula = { id: 'FF1', status: 'internally_validated', name: 'Test' };
  const gate = evaluateCommercializableGate(formula, {});
  assert.equal(gate.allowed, false);
  assert.ok(gate.blockers.length >= 1);

  const change = prepareFormulaStatusChange(formula, 'commercializable', {});
  assert.equal(change.ok, false);
});

test('transitions statut — draft → commercializable interdit', () => {
  assert.equal(canTransitionFormulaStatus('draft', 'commercializable'), false);
  assert.equal(canTransitionFormulaStatus('draft', 'internal_testing'), true);
});
