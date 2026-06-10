import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEVAGE_THRESHOLDS_DEFAULTS,
  mortalityAlertSeverity,
  resolveElevageThresholds,
  shouldAlertEggBreak,
} from '../../src/utils/elevageThresholds.js';
import {
  LAYING_RATE_NOT_CALCULABLE,
  aggregateSummaryLayingRate,
  computeLotOfficialLayingRate,
  computeOfficialLayingRate,
  formatOfficialLayingRate,
} from '../../src/utils/elevageLayingRate.js';
import {
  backfillElevageLogFarmId,
  resolveElevageLogFarmId,
  stampElevageLogFarmId,
} from '../../src/utils/elevageFarmScope.js';
import {
  ANIMAL_LOSS_NOT_CALCULABLE,
  buildMortalityAlert,
  commitElevageEggProduction,
  commitElevageFeeding,
  commitElevageMortality,
  commitElevageWeighing,
  validateElevageWeighingForm,
} from '../../src/utils/elevageWorkflow.js';
import {
  buildEggProductionStockMovementPayload,
  EGG_STOCK_GAP_MESSAGE,
  eggProductionStockDedupeKey,
} from '../../src/utils/stockConsumptionBridge.js';
import { MOVEMENT_SOURCE_TYPES } from '../../src/services/stockMovementHelpers.js';
import { computeLotMargin, formatMarginDetail } from '../../src/modules/elevage/elevageVisionHelpers.js';
import { FARM_SCOPED_CREATE_MODULES } from '../../src/utils/farmScopeCreate.js';
import { runBroilerLotScenario } from '../../src/utils/elevageWorkflow.js';

const FARM = 'farm-v2';
const LOT = { id: 'LOT-PONTE', type: 'Pondeuse', initial_count: 500, current_count: 480, effectif_actuel: 480, mortality: 20, morts: 20, farm_id: FARM };
const EGG_STOCK = { id: 'STK-OEUFS', produit: 'Œufs tablettes', quantite: 0, categorie: 'oeufs', farm_id: FARM };
const FEED_STOCK = { id: 'STK-ALIM', produit: 'Aliment', quantite: 100, prix_unitaire: 200, farm_id: FARM, categorie: 'aliment' };

test('V2 — taux de ponte officiel', () => {
  const result = computeOfficialLayingRate({ eggsProduced: 400, activeLayers: 500 });
  assert.equal(result.calculable, true);
  assert.equal(result.rate, 80);
});

test('V2 — taux de ponte non calculable sans effectif', () => {
  const result = computeOfficialLayingRate({ eggsProduced: 100, activeLayers: 0 });
  assert.equal(result.calculable, false);
  assert.equal(formatOfficialLayingRate(result), LAYING_RATE_NOT_CALCULABLE);
});

test('V2 — computeLotOfficialLayingRate depuis logs', () => {
  const logs = [{ id: 'P1', lot_id: 'LOT-PONTE', date: '2026-06-04', oeufs_produits: 384 }];
  const result = computeLotOfficialLayingRate(LOT, logs);
  assert.equal(result.rate, 80);
});

test('V2 — agrégat résumé ponte', () => {
  const summary = aggregateSummaryLayingRate([LOT], [{ lot_id: 'LOT-PONTE', date: '2026-06-04', oeufs_produits: 480 }], 7);
  assert.equal(summary.calculable, true);
  assert.equal(summary.rate, 100);
});

test('V2 — seuils mortalité officiels', () => {
  assert.equal(mortalityAlertSeverity(3.9), null);
  assert.equal(mortalityAlertSeverity(4), 'warning');
  assert.equal(mortalityAlertSeverity(8), 'critique');
  const custom = resolveElevageThresholds({ elevageThresholds: { mortalityAlertPct: 5 } });
  assert.equal(custom.mortalityAlertPct, 5);
  assert.equal(ELEVAGE_THRESHOLDS_DEFAULTS.mortalityAlertPct, 4);
});

test('V2 — seuil casse œufs officiel', () => {
  assert.equal(shouldAlertEggBreak(7.9), false);
  assert.equal(shouldAlertEggBreak(8), true);
});

test('V2 — buildMortalityAlert utilise seuil 4%', () => {
  assert.equal(buildMortalityAlert({ lot: LOT, rate: 3 }), null);
  const alert = buildMortalityAlert({ lot: LOT, rate: 5 });
  assert.ok(alert);
  assert.match(alert.message, /4%/);
});

test('V2 — farm_id résolu depuis lot', () => {
  const farmId = resolveElevageLogFarmId({
    form: { lot_id: 'LOT-PONTE' },
    context: { lots: [LOT], animaux: [] },
  });
  assert.equal(farmId, FARM);
});

test('V2 — backfill farm_id log alimentation', () => {
  const filled = backfillElevageLogFarmId({ id: 'A1', lot_id: 'LOT-PONTE' }, { lots: [LOT] });
  assert.equal(filled.farm_id, FARM);
});

test('V2 — stamp farm_id sur log', () => {
  assert.equal(stampElevageLogFarmId({ id: 'P1' }, FARM).farm_id, FARM);
});

test('V2 — farm scoped create modules incluent logs élevage', () => {
  assert.ok(FARM_SCOPED_CREATE_MODULES.has('alimentation_logs'));
  assert.ok(FARM_SCOPED_CREATE_MODULES.has('production_oeufs_logs'));
  assert.ok(FARM_SCOPED_CREATE_MODULES.has('sante'));
});

test('V2 — production œufs sans stock œufs', async () => {
  const result = await commitElevageEggProduction({
    form: { id: 'PROD-NOSTK', lot_id: 'LOT-PONTE', oeufs_produits: 90, oeufs_casses: 0 },
    context: { stocks: [], lots: [LOT], stockMovements: [] },
    handlers: {
      onCreateProduction: async () => {},
      onCreateBusinessEvent: async () => {},
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.stockGap, EGG_STOCK_GAP_MESSAGE);
});

test('V2 — production œufs avec stock + movement', async () => {
  const stocks = [{ ...EGG_STOCK }];
  const movements = [];
  await commitElevageEggProduction({
    form: { id: 'PROD-STK2', lot_id: 'LOT-PONTE', oeufs_produits: 60, oeufs_casses: 0 },
    context: { stocks, lots: [LOT], stockMovements: movements },
    handlers: {
      onCreateProduction: async () => {},
      onUpdateStock: async (id, patch) => {
        const idx = stocks.findIndex((s) => s.id === id);
        if (idx >= 0) stocks[idx] = { ...stocks[idx], ...patch };
      },
      onCreateStockMovement: async (row) => movements.push(row),
      onCreateBusinessEvent: async () => {},
      existingStockMovements: [],
    },
  });
  assert.equal(stocks[0].quantite, 60);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].metadata.movement_kind, MOVEMENT_SOURCE_TYPES.EGG_PRODUCTION);
  assert.equal(movements[0].dedupe_key, eggProductionStockDedupeKey('PROD-STK2', 'STK-OEUFS'));
});

test('V2 — buildEggProductionStockMovementPayload', () => {
  const payload = buildEggProductionStockMovementPayload({
    log: { id: 'L1', lot_id: 'LOT-PONTE', date: '2026-06-04' },
    stock: EGG_STOCK,
    sellableEggs: 30,
    beforeQty: 0,
    afterQty: 30,
    farmId: FARM,
  });
  assert.ok(payload);
  assert.equal(payload.farm_id, FARM);
  assert.equal(payload.movement_type, 'entree');
});

test('V2 — alimentation_logs reçoit farm_id', async () => {
  const logs = [];
  await commitElevageFeeding({
    form: { id: 'ALIM-FARM', stock_id: 'STK-ALIM', lot_id: 'LOT-PONTE', quantite: 2 },
    context: { stocks: [FEED_STOCK], lots: [LOT], transactions: [], businessEvents: [], stockMovements: [] },
    handlers: {
      onCreateAlimentation: async (row) => logs.push(row),
      onUpdateStock: async () => {},
      onCreateFinanceTransaction: async () => {},
      onCreateBusinessEvent: async () => {},
      onUpdateLot: async () => {},
    },
  });
  assert.equal(logs[0].farm_id, FARM);
});

test('V2 — production_oeufs_logs reçoit farm_id et taux', async () => {
  const logs = [];
  await commitElevageEggProduction({
    form: { id: 'PROD-FARM', lot_id: 'LOT-PONTE', oeufs_produits: 480, oeufs_casses: 0 },
    context: { stocks: [EGG_STOCK], lots: [LOT], stockMovements: [] },
    handlers: {
      onCreateProduction: async (row) => logs.push(row),
      onUpdateStock: async () => {},
      onCreateStockMovement: async () => {},
      onCreateBusinessEvent: async () => {},
      existingStockMovements: [],
    },
  });
  assert.equal(logs[0].farm_id, FARM);
  assert.equal(logs[0].taux_ponte_calcule, 100);
});

test('V2 — workflow pesée lot', async () => {
  const state = { lots: [{ id: 'LOT-CHAIR', poids_objectif_vente: 2, weight_history: [] }], events: [], weights: [] };
  const result = await commitElevageWeighing({
    form: { lot_id: 'LOT-CHAIR', poids: 1.9, date: '2026-06-04' },
    context: state,
    handlers: {
      onUpdateLot: async (id, patch) => { state.lots[0] = { ...state.lots[0], ...patch }; },
      onCreateWeightRecord: async (row) => state.weights.push(row),
      onCreateBusinessEvent: async (e) => state.events.push(e),
    },
  });
  assert.equal(result.ok, true);
  assert.equal(state.lots[0].poids_moyen_actuel, 1.9);
  assert.equal(state.events.length, 1);
  assert.equal(state.weights.length, 1);
});

test('V2 — workflow pesée animal', async () => {
  const state = { animaux: [{ id: 'ANI-1', farm_id: FARM }], events: [] };
  await commitElevageWeighing({
    form: { animal_id: 'ANI-1', poids: 450, unite: 'kg', date: '2026-06-04' },
    context: state,
    handlers: {
      onUpdateAnimal: async (id, patch) => { state.animaux[0] = { ...state.animaux[0], ...patch }; },
      onCreateBusinessEvent: async (e) => state.events.push(e),
    },
  });
  assert.equal(state.animaux[0].poids_actuel, 450);
});

test('V2 — validation pesée exige cible', () => {
  assert.match(validateElevageWeighingForm({ poids: 10 }), /lot ou animal/i);
});

test('V2 — mortalité animal avec coût', async () => {
  const finances = [];
  await commitElevageMortality({
    form: { animal_id: 'ANI-2', quantite: 1, date: '2026-06-04', notes: 'Maladie' },
    context: {
      animaux: [{ id: 'ANI-2', cout_achat: 250000, farm_id: FARM }],
      alertes: [],
      transactions: [],
      events: [],
    },
    handlers: {
      onUpdateAnimal: async () => {},
      onCreateFinanceTransaction: async (row) => finances.push(row),
      onCreateBusinessEvent: async () => {},
      onCreateAlert: async () => {},
    },
  });
  assert.equal(finances.length, 1);
  assert.equal(finances[0].montant, 250000);
});

test('V2 — mortalité animal sans coût', async () => {
  const result = await commitElevageMortality({
    form: { animal_id: 'ANI-3', quantite: 1, date: '2026-06-04' },
    context: {
      animaux: [{ id: 'ANI-3' }],
      alertes: [],
      transactions: [],
      events: [],
    },
    handlers: {
      onUpdateAnimal: async () => {},
      onCreateBusinessEvent: async () => {},
      onCreateAlert: async () => {},
    },
  });
  assert.equal(result.financialGap, ANIMAL_LOSS_NOT_CALCULABLE);
});

test('V2 — marge lot non fiable si données manquantes', () => {
  const row = computeLotMargin({ id: 'L1', name: 'Test' }, { feedLogs: [], productionLogs: [], healthEvents: [] });
  assert.equal(row.reliable, false);
  assert.match(formatMarginDetail(row), /non fiable/i);
});

test('V2 — coût par œuf calculable si données lot ponte', () => {
  const row = computeLotMargin(
    { id: 'LP', type: 'Pondeuse', cout_total_achat: 100000, revenu: 200000 },
    {
      feedLogs: [{ lot_id: 'LP', montant_total: 50000 }],
      productionLogs: [{ lot_id: 'LP', oeufs_produits: 1000 }],
      healthEvents: [{ lot_id: 'LP', cout: 10000 }],
    },
  );
  assert.ok(row.cost > 0);
});

test('V2 — scénario chair (régression broiler)', async () => {
  const { state, lot } = await runBroilerLotScenario();
  assert.equal(state.alimentation_logs.length, 1);
  assert.equal(lot.statut || lot.status, 'pret_vente');
  assert.ok(state.sante.length >= 1);
});
