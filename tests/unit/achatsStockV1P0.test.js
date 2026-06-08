import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAchatsStockAnnexeDocuments } from '../../src/utils/achatsStockAnnexeFilter.js';
import {
  aggregateSupplierDebtsForScope,
  buildSupplierDebtPatchWithFarm,
  computeSupplierDebtByFarm,
} from '../../src/utils/supplierDebtByFarm.js';
import {
  buildStockMovementPayload,
  movementAlreadyExists,
  persistStockMovement,
} from '../../src/services/stockMovementHelpers.js';
import {
  CANONICAL_PURCHASE_ENTRY,
  PAYMENT_STATUS,
  commitStockPurchaseWorkflow,
  movementDedupeKey,
  prepareStockPurchaseWorkflow,
} from '../../src/utils/stockPurchaseWorkflow.js';
import { planStockMovementFromSaleLine } from '../../src/utils/stockMovementBridge.js';
import { isAchatsStockStartupMode } from '../../src/modules/achatsStock/achatsStockVisionHelpers.js';
import { resolveAchatsStockTab } from '../../src/utils/commercialNavigation.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm' };
const FARM_B = { id: 'farm-b', name: 'Site Thiès' };

test('P0-01 — filterAchatsStockAnnexeDocuments — factures et preuves stock', () => {
  const docs = filterAchatsStockAnnexeDocuments([
    { id: 'D1', title: 'Facture aliment', module_source: 'stock', document_category: 'facture' },
    { id: 'D2', title: 'Rapport RH', module_source: 'rh' },
    { id: 'D3', stock_id: 'STK-1', title: 'Bon réception' },
  ]);
  assert.equal(docs.length, 2);
});

test('P0-01 — resolveAchatsStockTab Annexe distinct de Graphiques', () => {
  assert.equal(resolveAchatsStockTab('Annexe'), 'Annexe');
  assert.equal(resolveAchatsStockTab('Graphiques'), 'Graphiques');
});

test('P0-02 — buildStockMovementPayload réception achat', () => {
  const payload = buildStockMovementPayload({
    before: { id: 'STK-1', quantite: 5 },
    after: { id: 'STK-1', quantite: 15, unite: 'kg', farm_id: FARM_A.id },
    patch: {
      last_movement_type: 'entree',
      source_module: 'stock',
      created_from: 'stock_purchase_workflow',
      movement_ref: 'WF-1',
      dedupe_key: 'stock-mvt:WF-1',
    },
  });
  assert.equal(payload.movement_type, 'entree');
  assert.equal(payload.quantity, 10);
  assert.equal(payload.farm_id, FARM_A.id);
  assert.equal(payload.dedupe_key, 'stock-mvt:WF-1');
});

test('P0-02 — idempotence mouvements via dedupe_key', async () => {
  const created = [];
  await persistStockMovement({
    before: { id: 'STK-1', quantite: 0 },
    after: { id: 'STK-1', quantite: 5, unite: 'kg' },
    patch: { dedupe_key: 'dup-1', last_movement_type: 'entree' },
    handlers: { onCreateStockMovement: async (row) => created.push(row) },
    existingMovements: [],
  });
  await persistStockMovement({
    before: { id: 'STK-1', quantite: 5 },
    after: { id: 'STK-1', quantite: 10, unite: 'kg' },
    patch: { dedupe_key: 'dup-1', last_movement_type: 'entree' },
    handlers: { onCreateStockMovement: async (row) => created.push(row) },
    existingMovements: [{ dedupe_key: 'dup-1' }],
  });
  assert.equal(created.length, 1);
  assert.equal(movementAlreadyExists([{ dedupe_key: 'dup-1' }], 'dup-1'), true);
});

test('P0-03 — chemin canonique documenté et prepare workflow', () => {
  assert.equal(CANONICAL_PURCHASE_ENTRY, 'StockPurchaseReceptionForm');
  const preview = prepareStockPurchaseWorkflow({
    produit: 'Aliment',
    quantite: 2,
    prix_unitaire: 1000,
    statut_paiement: PAYMENT_STATUS.PAYE,
    farm_id: FARM_A.id,
  }, { stocks: [], suppliers: [] });
  assert.ok(preview.records.movement_event.dedupe_key);
  assert.equal(preview.records.stock_patch.farm_id, FARM_A.id);
  assert.equal(
    movementDedupeKey(preview.records.stock_patch.id, preview.workflow_id, 'entree'),
    preview.records.movement_event.dedupe_key,
  );
});

test('P0-02 — commitStockPurchaseWorkflow crée mouvement stock', async () => {
  const preview = prepareStockPurchaseWorkflow({
    produit: 'Semences',
    quantite: 3,
    prix_unitaire: 500,
    statut_paiement: PAYMENT_STATUS.PAYE,
    farm_id: FARM_A.id,
  }, { stocks: [], suppliers: [] });
  const movements = [];
  const events = [];
  await commitStockPurchaseWorkflow(preview, {
    context: { stocks: [], transactions: [], stock_movements: [] },
    onCreateStock: async (row) => {},
    onCreateBusinessEvent: async (row) => events.push(row),
    onCreateStockMovement: async (row) => movements.push(row),
  });
  assert.equal(movements.length, 1);
  assert.equal(movements[0].movement_type, 'entree');
  assert.ok(events.length >= 1);
});

test('P0-04 — dette fournisseur ventilée par ferme', () => {
  const suppliers = [{ id: 'FOUR-1', nom: 'Provende', dettes: 5000, debt_by_farm: { [FARM_A.id]: 3000 } }];
  const transactions = [
    { id: 'T1', fournisseur_id: 'FOUR-1', montant: 2000, reste_a_payer: 2000, farm_id: FARM_B.id, statut: 'a_payer' },
  ];
  const rows = computeSupplierDebtByFarm(suppliers, transactions, { defaultFarmId: FARM_A.id });
  assert.ok(rows.some((r) => r.farmId === FARM_A.id));
  assert.ok(rows.some((r) => r.farmId === FARM_B.id));
});

test('P0-04 — aggregateSupplierDebtsForScope mode ferme active', () => {
  const suppliers = [{ id: 'FOUR-1', nom: 'Provende', debt_by_farm: { [FARM_A.id]: 1000, [FARM_B.id]: 4000 } }];
  const scoped = aggregateSupplierDebtsForScope(suppliers, [], { mode: 'single', farmId: FARM_B.id }, [FARM_A, FARM_B]);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].total, 4000);
});

test('P0-04 — aggregateSupplierDebtsForScope toutes les fermes consolidé', () => {
  const suppliers = [{ id: 'FOUR-1', nom: 'Provende', debt_by_farm: { [FARM_A.id]: 1000, [FARM_B.id]: 4000 } }];
  const scoped = aggregateSupplierDebtsForScope(suppliers, [], { mode: 'all' }, [FARM_A, FARM_B]);
  assert.equal(scoped[0].total, 5000);
  assert.equal(scoped[0].byFarm.length, 2);
});

test('P0-04 — buildSupplierDebtPatchWithFarm conserve global et par ferme', () => {
  const patch = buildSupplierDebtPatchWithFarm({ dettes: 1000, debt_by_farm: { [FARM_A.id]: 1000 } }, 500, FARM_B.id, FARM_A.id);
  assert.equal(patch.dettes, 1500);
  assert.equal(patch.debt_by_farm[FARM_B.id], 500);
});

test('P0-05 — mode démarrage minimal', () => {
  assert.equal(isAchatsStockStartupMode({ stocks: [], suppliers: [], purchases: [] }), true);
  assert.equal(isAchatsStockStartupMode({ stocks: [{ id: 'S1' }], suppliers: [], purchases: [] }), false);
});

test('Commercial V3 — planStockMovementFromSaleLine prêt à persister', () => {
  const plan = planStockMovementFromSaleLine({
    orderItem: { id: 'LI-1', quantity: 2, source_impact_applied: true, source_module: 'stock' },
    order: { id: 'O-1', farm_id: FARM_A.id },
    patchPlan: { id: 'STK-1', module: 'stock' },
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.movement.movement_type, 'sortie');
  assert.equal(plan.movement.dedupe_key, 'stock-mvt:sale:O-1:line:LI-1');
});
