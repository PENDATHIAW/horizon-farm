import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFeedingConsumptionMovementPayload,
  buildCultureConsumptionMovementPayload,
  feedingConsumptionDedupeKey,
  cultureConsumptionDedupeKey,
  CONSUMPTION_GAPS,
} from '../../src/utils/stockConsumptionBridge.js';
import { movementAlreadyExists, persistStockMovement } from '../../src/services/stockMovementHelpers.js';
import { runFeedingSideEffects } from '../../src/utils/feedingSideEffects.js';
import { runCultureInputSideEffects } from '../../src/utils/cultureSideEffects.js';
import {
  convertEggQuantity,
  EGGS_PER_TABLET,
  isKnownEggConversion,
  unitsForStockCategory,
} from '../../src/utils/agriculturalUnits.js';
import { computeWeightedAverageCost } from '../../src/utils/stockValuation.js';
import {
  buildExpirySnapshot,
  buildExpiryLossPatch,
  expiryRiskLevel,
  EXPIRY_RISK_LEVELS,
} from '../../src/utils/stockExpiry.js';
import {
  prepareFarmTransfer,
  validateFarmTransfer,
  commitFarmTransfer,
  TRANSFER_STATUS,
} from '../../src/utils/farmTransferWorkflow.js';
import {
  buildStartupProgress,
  buildAchatsStockOperationalData,
  buildStockIaRecommendations,
} from '../../src/modules/achatsStock/achatsStockVisionHelpers.js';
const STOCK = { id: 'STK-ALIM', produit: 'Aliment pondeuses', quantite: 100, unite: 'kg', farm_id: 'farm-a' };
const CULTURE = { id: 'CULT-1', nom: 'Tomates', farm_id: 'farm-a' };

test('V2 — buildFeedingConsumptionMovementPayload élevage', () => {
  const payload = buildFeedingConsumptionMovementPayload({
    log: { id: 'ALIM-1', stock_id: 'STK-ALIM', quantite: 12, lot_id: 'LOT-1', source_module: 'elevage', date: '2026-06-01' },
    stock: STOCK,
    beforeQty: 100,
    afterQty: 88,
  });
  assert.equal(payload.movement_type, 'sortie');
  assert.equal(payload.quantity, 12);
  assert.equal(payload.source_module, 'elevage');
  assert.equal(payload.dedupe_key, feedingConsumptionDedupeKey('ALIM-1', 'STK-ALIM'));
  assert.equal(payload.metadata.movement_kind, 'consommation_elevage');
});

test('V2 — buildCultureConsumptionMovementPayload cultures', () => {
  const payload = buildCultureConsumptionMovementPayload({
    culture: CULTURE,
    stock: { ...STOCK, id: 'STK-ENG' },
    qty: 5,
    beforeQty: 40,
    afterQty: 35,
    motif: 'Engrais parcelle A',
    date: '2026-06-02',
  });
  assert.equal(payload.source_module, 'cultures');
  assert.equal(payload.quantity, 5);
  assert.equal(payload.dedupe_key, cultureConsumptionDedupeKey('CULT-1', 'STK-ENG', '2026-06-02'));
});

test('V2 — idempotence consommation alimentation', async () => {
  const created = [];
  const log = { id: 'ALIM-DUP', stock_id: 'STK-ALIM', quantite: 3, date: '2026-06-01', source_module: 'elevage' };
  const handlers = {
    onCreateAlimentation: async (row) => created.push(row),
    onUpdateStock: async () => {},
    onCreateStockMovement: async (row) => created.push(row),
    existingStockMovements: [],
  };
  await runFeedingSideEffects({ log, stock: STOCK, handlers });
  await runFeedingSideEffects({
    log,
    stock: { ...STOCK, quantite: 97 },
    existingLogs: [log],
    handlers: { ...handlers, existingStockMovements: [{ dedupe_key: feedingConsumptionDedupeKey('ALIM-DUP', 'STK-ALIM') }] },
  });
  const movements = created.filter((row) => row.movement_type === 'sortie');
  assert.equal(movements.length, 1);
  assert.equal(movementAlreadyExists([{ dedupe_key: feedingConsumptionDedupeKey('ALIM-DUP', 'STK-ALIM') }], feedingConsumptionDedupeKey('ALIM-DUP', 'STK-ALIM')), true);
});

test('V2 — runCultureInputSideEffects crée mouvement stock', async () => {
  const movements = [];
  await runCultureInputSideEffects({
    culture: CULTURE,
    stock: { id: 'STK-SEM', produit: 'Semences', quantite: 20, unite: 'kg', prix_unitaire: 500 },
    qty: 2,
    motif: 'Semis',
    handlers: {
      onUpdateStock: async () => {},
      onUpdateCulture: async () => {},
      onCreateStockMovement: async (row) => movements.push(row),
    },
  });
  assert.equal(movements.length, 1);
  assert.equal(movements[0].source_module, 'cultures');
});

test('V2 — unités agricoles et conversion œufs/tablettes', () => {
  assert.ok(unitsForStockCategory('produit_fini_oeufs').includes('tablette'));
  assert.equal(convertEggQuantity(2, 'tablette', 'unité'), 2 * EGGS_PER_TABLET);
  assert.equal(isKnownEggConversion('tablette', 'unité'), true);
  assert.equal(convertEggQuantity(1, 'kg', 'tablette'), null);
});

test('V2 — péremption proche et marquer perte', () => {
  const ref = new Date('2026-06-04T12:00:00');
  const stock = {
    id: 'STK-FRAIS',
    produit: 'Œufs',
    quantite: 10,
    categorie: 'produit_fini_oeufs',
    date_peremption: '2026-06-06',
  };
  const snap = buildExpirySnapshot([stock], ref);
  assert.ok(snap.soon.length >= 1);
  assert.equal(expiryRiskLevel(stock, ref), EXPIRY_RISK_LEVELS.warning);
  const lossPatch = buildExpiryLossPatch(stock, 'Péremption');
  assert.equal(lossPatch.quantite, 0);
  assert.match(lossPatch.last_movement_type, /perte/);
});

test('V2 — CMUP calculable et non calculable', () => {
  const withData = computeWeightedAverageCost(
    { id: 'STK-1', quantite: 10, prix_unitaire: 100 },
    [{ stock_id: 'STK-1', movement_type: 'entree', quantity: 10, movement_date: '2026-06-01', metadata: { unit_cost: 100 } }],
    [],
  );
  assert.equal(withData.calculable, true);
  assert.ok(withData.avgCost > 0);

  const without = computeWeightedAverageCost({ id: 'STK-EMPTY', quantite: 5 }, [], []);
  assert.equal(without.calculable, false);
  assert.match(without.reason, /non calculable/i);
});

test('V2 — transfert inter-fermes validation et commit', async () => {
  assert.match(validateFarmTransfer({ sourceFarmId: 'a', destFarmId: 'a', stock: STOCK, qty: 1 }), /différentes/i);
  const preview = prepareFarmTransfer({
    sourceFarmId: 'farm-a',
    destFarmId: 'farm-b',
    stock: STOCK,
    qty: 10,
    motif: 'Réallocation',
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.transfer.status, TRANSFER_STATUS.REQUESTED);

  const movements = [];
  const result = await commitFarmTransfer({
    transfer: { ...preview.transfer, status: TRANSFER_STATUS.ACCEPTED },
    stock: STOCK,
    handlers: {
      onUpdateStock: async () => {},
      onCreateStockMovement: async (row) => movements.push(row),
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.equal(result.ok, true);
  assert.equal(movements.length, 2);
});

test('V2 — mode démarrage avancé progression', () => {
  const progress = buildStartupProgress({
    stocks: [{ id: 'S1', unite: 'kg', seuil: 5 }],
    suppliers: [{ id: 'F1' }],
    purchases: [],
    documents: [],
    stockMovements: [],
  });
  assert.equal(progress.total, 9);
  assert.ok(progress.completed >= 2);
  assert.ok(progress.nextStep);
});

test('V2 — données opérationnelles achats', () => {
  const ops = buildAchatsStockOperationalData({
    stocks: [{ id: 'S1', quantite: 1, seuil: 10 }],
    lowStock: [{ id: 'S1', quantite: 1, seuil: 10 }],
    purchases: [{ id: 'T1', libelle: 'Achat', montant: 1000, statut: 'impaye' }],
    stockMovements: [{ id: 'M1', movement_type: 'entree', movement_date: '2026-06-01', stock_id: 'S1', quantity: 5 }],
    supplierDebts: [{ id: 'F1', name: 'Fournisseur', total: 5000 }],
  });
  assert.ok(ops.recentReceptions.length);
  assert.ok(ops.restockNeeds.length);
  assert.ok(ops.unpaidPurchases.length);
});

test('V2 — IA stock recommandations non gadget', () => {
  const recs = buildStockIaRecommendations({
    stocks: [{ id: 'S1', produit: 'Aliment', quantite: 0, seuil: 10 }],
    lowStock: [{ id: 'S1', produit: 'Aliment', quantite: 0, seuil: 10 }],
    stockMovements: [],
    purchases: [],
    documents: [],
    supplierDebts: [],
  });
  assert.ok(recs.some((row) => /rupture/i.test(row.title)));
});

test('V2 — gaps consommation documentés', () => {
  assert.ok(CONSUMPTION_GAPS.length >= 1);
  assert.ok(CONSUMPTION_GAPS.every((gap) => gap.description && gap.status));
});

test('V2 — non-régression persistStockMovement V1', async () => {
  const created = [];
  await persistStockMovement({
    before: { id: 'STK-1', quantite: 5 },
    after: { id: 'STK-1', quantite: 10, unite: 'kg' },
    patch: { dedupe_key: 'v1-regression', last_movement_type: 'entree' },
    handlers: { onCreateStockMovement: async (row) => created.push(row) },
  });
  assert.equal(created.length, 1);
});
