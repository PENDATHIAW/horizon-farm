import test from 'node:test';
import assert from 'node:assert/strict';
import {
  proposeFifoBatches,
  prepareProductionOrder,
  commitProductionOrder,
  prepareCloseProductionOrder,
  commitCloseProductionOrder,
  buildPublicQrPayload,
  assertFinishedBatchSellable,
} from '../../src/services/agriFeeds/feedProductionWorkflow.js';
import { MODULE_CONFIG } from '../../src/utils/constants.js';
import { CRUD_KEYS } from '../../src/config/modules.config.js';

const materials = [
  { id: 'FRM1', name: 'Maïs', category: 'cereal', unit: 'kg' },
  { id: 'FRM2', name: 'Tourteau', category: 'oilcake', unit: 'kg' },
];

const acceptedBatches = [
  {
    id: 'BAT1',
    raw_material_id: 'FRM1',
    batch_code: 'MP-MAIS-1',
    quantity_available: 80,
    unit_cost: 200,
    quality_status: 'accepted',
    received_date: '2026-01-01',
    stock_id: 'STK1',
  },
  {
    id: 'BAT2',
    raw_material_id: 'FRM1',
    batch_code: 'MP-MAIS-2',
    quantity_available: 50,
    unit_cost: 220,
    quality_status: 'accepted',
    received_date: '2026-02-01',
    stock_id: 'STK2',
  },
  {
    id: 'BAT3',
    raw_material_id: 'FRM2',
    batch_code: 'MP-TOUR-1',
    quantity_available: 100,
    unit_cost: 400,
    quality_status: 'accepted',
    received_date: '2026-01-15',
    stock_id: 'STK3',
  },
];

const rejectedBatch = {
  id: 'BAT-REJ',
  raw_material_id: 'FRM1',
  batch_code: 'MP-REJ',
  quantity_available: 200,
  unit_cost: 180,
  quality_status: 'rejected',
  received_date: '2025-12-01',
  stock_id: 'STK-REJ',
};

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
  version_number: 1,
  theoretical_cost_per_kg: 260,
};

const ingredients = [
  { id: 'FFI1', formula_version_id: 'FFV1', raw_material_id: 'FRM1', percentage: 70, latest_unit_cost: 200 },
  { id: 'FFI2', formula_version_id: 'FFV1', raw_material_id: 'FRM2', percentage: 30, latest_unit_cost: 400 },
];

const baseData = {
  feed_raw_materials: materials,
  feed_raw_batches: acceptedBatches,
  feed_formulas: [formula],
  feed_formula_versions: [version],
  feed_formula_ingredients: ingredients,
  stock: [
    { id: 'STK1', quantite: 80 },
    { id: 'STK2', quantite: 50 },
    { id: 'STK3', quantite: 100 },
  ],
};

test('MODULE_CONFIG — collections AGRI FEEDS étape 3', () => {
  assert.ok(MODULE_CONFIG.feed_production_orders);
  assert.ok(MODULE_CONFIG.feed_finished_batches);
  assert.ok(MODULE_CONFIG.feed_quality_checks);
  assert.ok(CRUD_KEYS.includes('feed_production_orders'));
  assert.ok(CRUD_KEYS.includes('feed_finished_batches'));
  assert.ok(CRUD_KEYS.includes('feed_quality_checks'));
});

test('FIFO — plus ancien lot d’abord, ignore rejeté', () => {
  const fifo = proposeFifoBatches('FRM1', 90, {
    feed_raw_batches: [...acceptedBatches, rejectedBatch],
  });
  assert.equal(fifo.ok, true);
  assert.equal(fifo.allocations[0].batch_id, 'BAT1');
  assert.equal(fifo.allocations[0].quantity, 80);
  assert.equal(fifo.allocations[1].batch_id, 'BAT2');
  assert.equal(fifo.allocations[1].quantity, 10);
  assert.ok(!fifo.allocations.some((a) => a.batch_id === 'BAT-REJ'));
});

test('OF — stock insuffisant bloque', () => {
  const preview = prepareProductionOrder({
    formula_version_id: 'FFV1',
    planned_quantity: 500,
  }, baseData);
  assert.equal(preview.ok, false);
  assert.match(preview.error, /insuffisant/i);
});

test('OF — MP rejetée seule ne peut pas produire', () => {
  const preview = prepareProductionOrder({
    formula_version_id: 'FFV1',
    planned_quantity: 50,
  }, {
    ...baseData,
    feed_raw_batches: [rejectedBatch, {
      id: 'BAT3b',
      raw_material_id: 'FRM2',
      quantity_available: 100,
      unit_cost: 400,
      quality_status: 'accepted',
      received_date: '2026-01-15',
    }],
  });
  assert.equal(preview.ok, false);
  assert.match(preview.error, /insuffisant|rejet/i);
});

test('OF → consomme MP → lot fini + QR', async () => {
  const preview = prepareProductionOrder({
    formula_version_id: 'FFV1',
    planned_quantity: 100,
    production_date: '2026-07-09',
    responsible_person: 'Chef atelier',
  }, baseData);

  assert.equal(preview.ok, true);
  assert.ok(preview.order.order_code.startsWith('OF-'));
  assert.ok(preview.fifoAllocations.length >= 2);
  assert.ok(preview.theoretical_cost_per_kg > 0);

  const created = {
    order: null,
    batchPatches: [],
    stockPatches: [],
    movements: [],
  };

  await commitProductionOrder(preview, {
    onCreateOrder: async (o) => { created.order = o; return o; },
    onUpdateBatch: async (id, patch) => { created.batchPatches.push({ id, ...patch }); },
    onUpdateStock: async (id, patch) => { created.stockPatches.push({ id, ...patch }); },
    onCreateStockMovement: async (m) => { created.movements.push(m); return m; },
    onCreateBusinessEvent: async () => ({}),
  });

  assert.equal(created.order.status, 'in_progress');
  assert.ok(created.batchPatches.length >= 2);
  assert.ok(created.movements.some((m) => m.movement_type === 'consommation_production'));

  const dataAfterOrder = {
    ...baseData,
    feed_production_orders: [created.order],
  };

  const closeBlocked = prepareCloseProductionOrder({
    order_id: created.order.id,
    actual_quantity: 0,
    qc_result: 'accepted',
  }, dataAfterOrder);
  assert.equal(closeBlocked.ok, false);
  assert.match(closeBlocked.error, /quantit/i);

  const closeNoQc = prepareCloseProductionOrder({
    order_id: created.order.id,
    actual_quantity: 95,
  }, dataAfterOrder);
  assert.equal(closeNoQc.ok, false);
  assert.match(closeNoQc.error, /qualit/i);

  const closeRejected = prepareCloseProductionOrder({
    order_id: created.order.id,
    actual_quantity: 95,
    qc_result: 'rejected',
  }, dataAfterOrder);
  assert.equal(closeRejected.ok, false);
  assert.match(closeRejected.error, /non conforme|bloqu/i);

  const closePreview = prepareCloseProductionOrder({
    order_id: created.order.id,
    actual_quantity: 95,
    qc_result: 'accepted',
    package_size: '25kg',
    destination: 'internal_test',
    packaging_cost: 1000,
  }, dataAfterOrder);

  assert.equal(closePreview.ok, true);
  assert.ok(closePreview.finishedBatch.batch_code);
  assert.ok(closePreview.qrUrl.includes('qrserver.com'));
  assert.equal(closePreview.finishedBatch.quantity_produced, 95);
  assert.ok(closePreview.real.real_cost_per_kg > 0);
  assert.equal(closePreview.qualityCheck.related_type, 'finished_batch');
  assert.equal(closePreview.stockPatch.categorie, 'aliment_agri_feeds');

  const qr = JSON.parse(closePreview.finishedBatch.qr_code_payload);
  assert.ok(qr.lot);
  assert.ok(!JSON.stringify(qr).toLowerCase().includes('maïs') || !JSON.stringify(qr).includes('70'));
  assert.equal(qr.product, 'Chair croissance');

  const closed = {
    order: null,
    finished: null,
    stock: null,
    qc: null,
    alert: null,
  };

  await commitCloseProductionOrder(closePreview, {
    onUpdateOrder: async (id, patch) => { closed.order = { id, ...patch }; return closed.order; },
    onCreateFinishedBatch: async (b) => { closed.finished = b; return b; },
    onCreateStock: async (s) => { closed.stock = s; return s; },
    onCreateStockMovement: async (m) => m,
    onCreateQualityCheck: async (q) => { closed.qc = q; return q; },
    onCreateBusinessEvent: async () => ({}),
    onCreateAlert: async (a) => { closed.alert = a; return a; },
  });

  assert.equal(closed.order.status, 'completed');
  assert.equal(closed.finished.quality_status, 'accepted');
  assert.equal(closed.stock.quantite, 95);
  assert.equal(closed.qc.result, 'accepted');
});

test('QR public — pas de recette complète', () => {
  const payload = buildPublicQrPayload({
    batchCode: 'AF-001',
    productName: 'Chair HF',
    feedType: 'broiler · grower',
    productionDate: '2026-07-09',
    quantityKg: 100,
    packageSize: '25kg',
    qualityStatus: 'accepted',
  });
  assert.equal(payload.lot, 'AF-001');
  assert.ok(payload.conseils);
  assert.ok(!payload.ingredients);
  assert.ok(!payload.recipe);
});

test('lot vendable — formule non commercializable bloque vente', () => {
  const gate = assertFinishedBatchSellable(
    { id: 'FFB1', active: true, quality_status: 'accepted', quantity_available: 50, destination: 'commercial_sale' },
    { status: 'internal_testing' },
  );
  assert.equal(gate.ok, false);
  assert.match(gate.message, /commercialisable/i);
});
