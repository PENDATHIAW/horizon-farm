import test from 'node:test';
import assert from 'node:assert/strict';
import { feedCostFromLog, calculateAvicoleLotCost } from '../../src/utils/costEngine.js';
import {
  commitElevageFeeding,
  commitElevageEggProduction,
} from '../../src/utils/elevageWorkflow.js';
import { MOVEMENT_SOURCE_TYPES } from '../../src/services/stockMovementHelpers.js';
import { EGG_PACKAGING_GAP_MESSAGE, feedingConsumptionDedupeKey } from '../../src/utils/stockConsumptionBridge.js';
import {
  buildElevageStartupProgress,
  isElevageStartupMode,
} from '../../src/modules/elevage/elevageStartupHelpers.js';

const FARM = 'farm-a';
const FEED_STOCK = { id: 'STK-ALIM', produit: 'Aliment pondeuse', quantite: 100, unite: 'kg', prix_unitaire: 250, farm_id: FARM, categorie: 'aliment' };
const LOT = { id: 'LOT-PONTE', name: 'Pondeuses A', type: 'Pondeuse', initial_count: 500, current_count: 480, farm_id: FARM };
const EGG_STOCK = { id: 'STK-OEUFS', produit: 'Œufs tablettes', quantite: 0, categorie: 'oeufs', farm_id: FARM };
const PACK_STOCK = { id: 'STK-PACK', produit: 'Alvéoles', quantite: 50, categorie: 'emballage', farm_id: FARM };

test('V1 — montant_total pris en compte dans feedCostFromLog', () => {
  assert.equal(feedCostFromLog({ montant_total: 7500 }), 7500);
  assert.equal(feedCostFromLog({ cout_total: 1000, montant_total: 7500 }), 7500);
  assert.equal(feedCostFromLog({ cout_total: 1000 }), 1000);
});

test('V1 — calculateAvicoleLotCost utilise montant_total alimentation', () => {
  const cost = calculateAvicoleLotCost({
    lot: LOT,
    alimentationLogs: [{ lot_id: 'LOT-PONTE', montant_total: 12000, quantite: 10 }],
  });
  assert.equal(cost.realFeedCost, 12000);
});

test('V1 — isElevageStartupMode détecte module vide', () => {
  assert.equal(isElevageStartupMode({}), true);
  assert.equal(isElevageStartupMode({ lots: [LOT] }), false);
  assert.equal(isElevageStartupMode({ feedLogs: [{ id: 'A1' }] }), false);
});

test('V1 — buildElevageStartupProgress checklist 7 étapes', () => {
  const progress = buildElevageStartupProgress({ lots: [LOT], feedStocks: [FEED_STOCK] });
  assert.equal(progress.steps.length, 7);
  assert.equal(progress.steps[0].done, true);
  assert.equal(progress.steps[2].done, true);
  assert.ok(progress.nextStep);
});

test('V1 — commitElevageFeeding crée log, finance et stock_movement', async () => {
  const logs = [];
  const movements = [];
  const finances = [];
  const stocks = [{ ...FEED_STOCK }];

  await commitElevageFeeding({
    form: {
      id: 'ALIM-V1-1',
      date: '2026-06-04',
      stock_id: 'STK-ALIM',
      lot_id: 'LOT-PONTE',
      quantite: 5,
    },
    context: {
      stocks,
      transactions: [],
      businessEvents: [],
      stockMovements: [],
      lots: [LOT],
    },
    handlers: {
      onCreateAlimentation: async (row) => logs.push(row),
      onUpdateStock: async (id, patch) => {
        const idx = stocks.findIndex((s) => s.id === id);
        if (idx >= 0) stocks[idx] = { ...stocks[idx], ...patch };
      },
      onCreateStockMovement: async (row) => movements.push(row),
      onCreateFinanceTransaction: async (row) => finances.push(row),
      onCreateBusinessEvent: async () => {},
      onUpdateLot: async () => {},
      existingStockMovements: [],
    },
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].montant_total, 1250);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].metadata.movement_kind, MOVEMENT_SOURCE_TYPES.FEEDING);
  assert.equal(finances.length, 1);
  assert.equal(stocks[0].quantite, 95);
});

test('V1 — commitElevageFeeding idempotent mouvement stock', async () => {
  let movementCreates = 0;
  const handlers = {
    onCreateAlimentation: async () => {},
    onUpdateStock: async () => {},
    onCreateStockMovement: async () => { movementCreates += 1; },
    onCreateFinanceTransaction: async () => {},
    onCreateBusinessEvent: async () => {},
    onUpdateLot: async () => {},
    existingStockMovements: [],
  };
  const base = {
    form: { id: 'ALIM-DUP', date: '2026-06-04', stock_id: 'STK-ALIM', lot_id: 'LOT-PONTE', quantite: 2 },
    context: { stocks: [FEED_STOCK], transactions: [], businessEvents: [], stockMovements: [], lots: [LOT] },
    handlers,
  };

  await commitElevageFeeding(base);
  await commitElevageFeeding({
    ...base,
    handlers: {
      ...handlers,
      existingStockMovements: [{ dedupe_key: feedingConsumptionDedupeKey('ALIM-DUP', 'STK-ALIM') }],
    },
  });

  assert.equal(movementCreates, 1);
});

test('V1 — commitElevageEggProduction crée log production officiel', async () => {
  const productions = [];
  await commitElevageEggProduction({
    form: { id: 'PROD-V1', lot_id: 'LOT-PONTE', date: '2026-06-04', oeufs_produits: 120, oeufs_casses: 2 },
    context: { stocks: [EGG_STOCK], stockMovements: [] },
    handlers: {
      onCreateProduction: async (row) => productions.push(row),
      onUpdateStock: async () => {},
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.equal(productions.length, 1);
  assert.equal(productions[0].oeufs_vendables, 118);
  assert.equal(productions[0].source_module, 'elevage');
});

test('V1 — commitElevageEggProduction entrée stock œufs si disponible', async () => {
  const stocks = [{ ...EGG_STOCK }];
  await commitElevageEggProduction({
    form: { id: 'PROD-STK', lot_id: 'LOT-PONTE', oeufs_produits: 60, oeufs_casses: 0 },
    context: { stocks, stockMovements: [] },
    handlers: {
      onCreateProduction: async () => {},
      onUpdateStock: async (id, patch) => {
        const idx = stocks.findIndex((s) => s.id === id);
        if (idx >= 0) stocks[idx] = { ...stocks[idx], ...patch };
      },
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.equal(stocks[0].quantite, 60);
});

test('V1 — commitElevageEggProduction emballage tracé', async () => {
  const movements = [];
  await commitElevageEggProduction({
    form: {
      id: 'PROD-PKG',
      lot_id: 'LOT-PONTE',
      oeufs_produits: 300,
      oeufs_casses: 0,
      packaging_stock_id: 'STK-PACK',
    },
    context: { stocks: [EGG_STOCK, PACK_STOCK], stockMovements: [] },
    handlers: {
      onCreateProduction: async () => {},
      onUpdateStock: async () => {},
      onCreateStockMovement: async (row) => movements.push(row),
      onCreateBusinessEvent: async () => {},
      existingStockMovements: [],
    },
  });
  assert.ok(movements.some((m) => m.metadata?.movement_kind === MOVEMENT_SOURCE_TYPES.PACKAGING));
  const packaging = movements.find((m) => m.metadata?.movement_kind === MOVEMENT_SOURCE_TYPES.PACKAGING);
  assert.ok(packaging);
});

test('V1 — commitElevageEggProduction sans emballage ne bloque pas', async () => {
  const result = await commitElevageEggProduction({
    form: { id: 'PROD-GAP', lot_id: 'LOT-PONTE', oeufs_produits: 90, oeufs_casses: 0 },
    context: { stocks: [EGG_STOCK], stockMovements: [] },
    handlers: {
      onCreateProduction: async () => {},
      onUpdateStock: async () => {},
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.packagingGap, EGG_PACKAGING_GAP_MESSAGE);
});

test('V1 — résumé digeste : startup progress percent cohérent', () => {
  const empty = buildElevageStartupProgress({});
  assert.equal(empty.percent, 0);
  const partial = buildElevageStartupProgress({ lots: [LOT], animaux: [{ id: 'A1' }], feedStocks: [FEED_STOCK], feedLogs: [{ id: 'F1' }] });
  assert.ok(partial.percent >= 40);
  assert.ok(partial.percent < 100);
});
