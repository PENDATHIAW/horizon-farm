import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHealthConsumptionMovementPayload,
  buildEggPackagingConsumptionPayload,
  healthConsumptionDedupeKey,
  eggPackagingConsumptionDedupeKey,
  HEALTH_CONSUMPTION_GAP_MESSAGE,
  EGG_PACKAGING_GAP_MESSAGE,
  CONSUMPTION_GAPS,
  persistConsumptionMovement,
} from '../../src/utils/stockConsumptionBridge.js';
import { MOVEMENT_SOURCE_TYPES, movementAlreadyExists } from '../../src/services/stockMovementHelpers.js';
import { runHealthStockConsumptionSideEffects } from '../../src/utils/healthSideEffects.js';
import { commitElevageEggProduction } from '../../src/utils/elevageWorkflow.js';
import { planStockMovementFromSaleLine } from '../../src/utils/stockMovementBridge.js';
import { buildStockDataQualitySnapshot } from '../../src/utils/stockDataQuality.js';
import { buildStartupProgress } from '../../src/modules/achatsStock/achatsStockVisionHelpers.js';

const FARM = 'farm-a';
const MED_STOCK = { id: 'STK-VAC', produit: 'Vaccin Newcastle', quantite: 50, unite: 'dose', farm_id: FARM, categorie: 'vaccin' };
const PACK_STOCK = { id: 'STK-PACK', produit: 'Alvéoles 30 œufs', quantite: 200, unite: 'u', farm_id: FARM, categorie: 'emballage' };

test('V3 — buildHealthConsumptionMovementPayload médicament', () => {
  const payload = buildHealthConsumptionMovementPayload({
    healthRecord: {
      id: 'SAN-1',
      nom: 'Antibiotique',
      type_intervention: 'curatif',
      module_lie: 'animaux',
      related_id: 'ANI-1',
      date: '2026-06-04',
    },
    stock: MED_STOCK,
    qty: 2,
    beforeQty: 50,
    afterQty: 48,
  });
  assert.equal(payload.movement_type, 'sortie');
  assert.equal(payload.source_module, 'sante');
  assert.equal(payload.metadata.movement_kind, MOVEMENT_SOURCE_TYPES.HEALTH);
  assert.equal(payload.metadata.sens, 'sortie');
  assert.equal(payload.dedupe_key, healthConsumptionDedupeKey('SAN-1', 'STK-VAC'));
});

test('V3 — buildHealthConsumptionMovementPayload vaccin lot avicole', () => {
  const payload = buildHealthConsumptionMovementPayload({
    healthRecord: {
      id: 'SAN-2',
      nom: 'Vaccin Gumboro',
      type_intervention: 'vaccination',
      module_lie: 'avicole',
      related_id: 'LOT-1',
    },
    stock: MED_STOCK,
    qty: 500,
    beforeQty: 500,
    afterQty: 0,
  });
  assert.equal(payload.metadata.lot_id, 'LOT-1');
  assert.equal(payload.metadata.intervention_type, 'vaccination');
});

test('V3 — santé sans stock_id documentée', () => {
  const payload = buildHealthConsumptionMovementPayload({
    healthRecord: { id: 'SAN-3', product_source: 'stock', quantite_utilisee: 1 },
    stock: {},
    qty: 1,
  });
  assert.equal(payload, null);
  assert.ok(CONSUMPTION_GAPS.some((gap) => gap.id === 'health_without_stock_id'));
  assert.match(HEALTH_CONSUMPTION_GAP_MESSAGE, /stock_id absent/);
});

test('V3 — runHealthStockConsumptionSideEffects idempotent', async () => {
  const movements = [];
  const handlers = {
    onCreateStockMovement: async (row) => movements.push(row),
    existingStockMovements: [],
  };
  await runHealthStockConsumptionSideEffects({
    healthRecord: { id: 'SAN-DUP', stock_id: 'STK-VAC', product_source: 'stock', quantite_utilisee: 1, nom: 'Vaccin' },
    stock: MED_STOCK,
    qty: 1,
    beforeQty: 50,
    afterQty: 49,
    handlers,
  });
  await runHealthStockConsumptionSideEffects({
    healthRecord: { id: 'SAN-DUP', stock_id: 'STK-VAC', product_source: 'stock', quantite_utilisee: 1, nom: 'Vaccin' },
    stock: { ...MED_STOCK, quantite: 49 },
    qty: 1,
    beforeQty: 49,
    afterQty: 48,
    handlers: {
      ...handlers,
      existingStockMovements: [{ dedupe_key: healthConsumptionDedupeKey('SAN-DUP', 'STK-VAC') }],
    },
  });
  assert.equal(movements.length, 1);
  assert.equal(movementAlreadyExists([{ dedupe_key: healthConsumptionDedupeKey('SAN-DUP', 'STK-VAC') }], healthConsumptionDedupeKey('SAN-DUP', 'STK-VAC')), true);
});

test('V3 — runHealthStockConsumptionSideEffects gap sans stock_id', async () => {
  const result = await runHealthStockConsumptionSideEffects({
    healthRecord: { id: 'SAN-GAP', product_source: 'stock', quantite_utilisee: 2 },
    stock: {},
    qty: 2,
    handlers: { onCreateStockMovement: async () => {} },
  });
  assert.equal(result.gap, HEALTH_CONSUMPTION_GAP_MESSAGE);
});

test('V3 — buildEggPackagingConsumptionPayload avec stock_id', () => {
  const payload = buildEggPackagingConsumptionPayload({
    log: { id: 'PROD-1', lot_id: 'LOT-PONTE', packaging_stock_id: 'STK-PACK', date: '2026-06-04' },
    stock: PACK_STOCK,
    qty: 10,
    beforeQty: 200,
    afterQty: 190,
  });
  assert.equal(payload.movement_type, 'sortie');
  assert.equal(payload.source_module, 'elevage');
  assert.equal(payload.metadata.movement_kind, MOVEMENT_SOURCE_TYPES.PACKAGING);
  assert.equal(payload.dedupe_key, eggPackagingConsumptionDedupeKey('PROD-1', 'STK-PACK'));
});

test('V3 — emballage œufs sans stock_id documenté', () => {
  const payload = buildEggPackagingConsumptionPayload({
    log: { id: 'PROD-2', lot_id: 'LOT-PONTE' },
    stock: {},
    qty: 5,
  });
  assert.equal(payload, null);
  assert.match(EGG_PACKAGING_GAP_MESSAGE, /emballage/);
});

test('V3 — commitElevageEggProduction emballage tracé', async () => {
  const movements = [];
  const productions = [];
  await commitElevageEggProduction({
    form: {
      id: 'PROD-EGG-1',
      lot_id: 'LOT-PONTE',
      date: '2026-06-04',
      oeufs_produits: 300,
      oeufs_casses: 0,
      packaging_stock_id: 'STK-PACK',
    },
    context: {
      stocks: [
        { id: 'STK-OEUFS', produit: 'Œufs tablettes', quantite: 0, categorie: 'oeufs' },
        PACK_STOCK,
      ],
      stockMovements: [],
    },
    handlers: {
      onCreateProduction: async (row) => productions.push(row),
      onUpdateStock: async () => {},
      onCreateStockMovement: async (row) => movements.push(row),
      onCreateBusinessEvent: async () => {},
      existingStockMovements: [],
    },
  });
  assert.equal(productions.length, 1);
  assert.equal(productions[0].packaging_stock_id, 'STK-PACK');
  const packaging = movements.find((m) => m.metadata?.movement_kind === MOVEMENT_SOURCE_TYPES.PACKAGING);
  assert.ok(packaging);
  assert.ok(movements.some((m) => m.metadata?.movement_kind === MOVEMENT_SOURCE_TYPES.EGG_PRODUCTION));
});

test('V3 — commitElevageEggProduction gap emballage sans bloquer', async () => {
  const result = await commitElevageEggProduction({
    form: { id: 'PROD-EGG-2', lot_id: 'LOT-PONTE', oeufs_produits: 60, oeufs_casses: 0 },
    context: { stocks: [{ id: 'STK-OEUFS', produit: 'Œufs', quantite: 0 }], stockMovements: [] },
    handlers: {
      onCreateProduction: async () => {},
      onUpdateStock: async () => {},
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.packagingGap, EGG_PACKAGING_GAP_MESSAGE);
});

test('V3 — Commercial planned vs ready cohérent (ready = officiel)', () => {
  const plan = planStockMovementFromSaleLine({
    orderItem: { id: 'LI-1', quantity: 2, source_impact_applied: true, line_index: 1 },
    order: { id: 'CMD-1', farm_id: FARM },
    patchPlan: { id: 'STK-1', module: 'stock' },
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.movement.status, 'ready');
});

test('V3 — buildStockDataQualitySnapshot détecte écarts', () => {
  const snapshot = buildStockDataQualitySnapshot({
    stocks: [
      { id: 'S1', produit: 'Aliment', quantite: 10 },
      { id: 'S2', produit: 'Engrais', quantite: 5, unite: 'kg', seuil: 2, prix_unitaire: 100, farm_id: FARM },
    ],
    stockMovements: [{ id: 'M1', movement_type: 'sortie', notes: 'Orphelin' }],
    santeRecords: [{ id: 'H1', nom: 'Vaccin', product_source: 'stock', quantite_utilisee: 1 }],
    productionLogs: [{ id: 'P1', lot_id: 'L1', tablettes: 2 }],
    suppliers: [{ id: 'F1', nom: 'Agro', dettes: 5000 }],
    transactions: [{ id: 'T1', farm_id: FARM, montant: 1000 }],
  });
  assert.ok(snapshot.totalIssues >= 4);
  assert.ok(snapshot.issues.some((issue) => issue.title.includes('sans unité')));
  assert.ok(snapshot.issues.some((issue) => issue.detail.includes('stock_id absent')));
  assert.ok(snapshot.issues.some((issue) => issue.detail.includes('emballage')));
});

test('V3 — non-régression startup progress V1/V2', () => {
  const progress = buildStartupProgress({
    stocks: [{ id: 'S1', unite: 'kg', seuil: 5 }],
    suppliers: [{ id: 'F1' }],
    purchases: [{ id: 'A1' }],
    stockMovements: [{ movement_type: 'entree' }],
  });
  assert.ok(progress.completed >= 4);
  assert.equal(progress.total, 9);
});

test('V3 — persistConsumptionMovement santé via bridge', async () => {
  const created = [];
  const payload = buildHealthConsumptionMovementPayload({
    healthRecord: { id: 'SAN-P', nom: 'Désinfectant', type_intervention: 'biosecurite' },
    stock: { id: 'STK-DES', produit: 'Désinfectant', quantite: 20, unite: 'L', farm_id: FARM },
    qty: 3,
    beforeQty: 20,
    afterQty: 17,
  });
  await persistConsumptionMovement({
    before: { id: 'STK-DES', quantite: 20 },
    after: { id: 'STK-DES', quantite: 17 },
    payload,
    handlers: { onCreateStockMovement: async (row) => created.push(row) },
    existingMovements: [],
  });
  assert.equal(created.length, 1);
  assert.equal(created[0].source_module, 'sante');
});
