import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  connectedUserId,
  DAILY_ENTRY_CONTRACTS,
  DAILY_ENTRY_TYPES,
  dailyEntryConfirmation,
  resolveDailyEntryIdentity,
  uniqueRowId,
  validateDailyEntryContracts,
} from '../../src/utils/dailyQuickEntryContract.js';
import {
  commitElevageEggProduction,
  commitElevageFeeding,
  commitElevageMortality,
  commitElevageWeighing,
} from '../../src/utils/elevageWorkflow.js';
import {
  commitCultureHarvest,
  commitCultureIrrigation,
} from '../../src/utils/culturesWorkflow.js';
import {
  commitCommercialSale,
  prepareCommercialSaleCommit,
} from '../../src/utils/commercialSaleWorkflow.js';
import { SAISIES_QUOTIDIENNES } from '../../src/config/formulaires20s.config.js';
import { DAILY_FORM_TYPES, openDailyQuickEntry } from '../../src/utils/dailyQuickEntry.js';
import {
  clearPendingFormModals,
  subscribeFormModal,
} from '../../src/services/formModalManager.js';

const root = new URL('../../', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

test('les sept saisies respectent cinq champs et cinq interactions maximum', () => {
  const checks = validateDailyEntryContracts();
  assert.equal(checks.length, 7);
  assert.deepEqual(new Set(checks.map((row) => row.type)), new Set(Object.values(DAILY_ENTRY_TYPES)));
  checks.forEach((row) => {
    assert.equal(row.valid, true, `${row.type} dépasse le contrat`);
    assert.ok(row.requiredCount <= 5);
    assert.ok(row.maxInteractions <= 5);
  });
  assert.equal(Object.keys(DAILY_ENTRY_CONTRACTS).length, 7);
});

test('chaque saisie rapide navigue puis transmet directement le bon formulaire', () => {
  clearPendingFormModals();
  const navigation = [];
  const received = [];
  const unsubscribe = subscribeFormModal((detail) => {
    received.push(detail);
    return true;
  }, { modules: SAISIES_QUOTIDIENNES.map((entry) => entry.module), replayPending: false });

  SAISIES_QUOTIDIENNES.forEach((entry) => {
    assert.equal(openDailyQuickEntry(entry, (module, options) => navigation.push({ module, options })), true);
  });
  unsubscribe();

  assert.equal(navigation.length, 7);
  assert.equal(received.length, 7);
  SAISIES_QUOTIDIENNES.forEach((entry, index) => {
    assert.deepEqual(navigation[index], { module: entry.module, options: { tab: entry.onglet } });
    assert.equal(received[index].module, entry.module);
    assert.equal(received[index].draft.form_type, DAILY_FORM_TYPES[entry.id]);
    assert.equal(received[index].draft.draft_fields.source, 'saisie_rapide_globale');
  });
});

test('un module chargé après le clic rejoue une seule fois le formulaire en attente', async () => {
  clearPendingFormModals();
  const entry = SAISIES_QUOTIDIENNES.find((item) => item.id === 'vente');
  assert.equal(openDailyQuickEntry(entry, () => {}), true);

  const received = [];
  const unsubscribe = subscribeFormModal((detail) => {
    received.push(detail);
    return true;
  }, { modules: ['commercial'] });
  await new Promise((resolve) => queueMicrotask(resolve));
  unsubscribe();

  assert.equal(received.length, 1);
  assert.equal(received[0].draft.form_type, 'sale_record');

  const replay = [];
  const unsubscribeReplay = subscribeFormModal((detail) => {
    replay.push(detail);
    return true;
  }, { modules: ['commercial'] });
  await new Promise((resolve) => queueMicrotask(resolve));
  unsubscribeReplay();
  assert.equal(replay.length, 0);
});

test('date, unité, utilisateur, cible unique et identité sont déterministes', () => {
  assert.equal(connectedUserId({ id: 'USR-1' }), 'USR-1');
  assert.equal(uniqueRowId([{ id: 'ONLY' }]), 'ONLY');
  assert.equal(uniqueRowId([{ id: 'A' }, { id: 'B' }]), '');
  assert.equal(DAILY_ENTRY_CONTRACTS.feeding.defaultUnit, 'kg');

  const form = { entry_id: 'ENTRY-1', date: '2026-07-12', lot_id: 'LOT-1' };
  const first = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.FEEDING, form, { farmId: 'FARM-1' });
  const replay = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.FEEDING, form, { farmId: 'FARM-1' });
  const distinct = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.FEEDING, { ...form, entry_id: 'ENTRY-2' }, { farmId: 'FARM-1' });
  assert.equal(first.eventKey, replay.eventKey);
  assert.equal(first.eventId, replay.eventId);
  assert.notEqual(first.eventKey, distinct.eventKey);
});

test('alimentation rejouée ne redéduit ni stock ni coût', async () => {
  const state = {
    stocks: [{ id: 'STK-FEED', produit: 'Aliment', quantite: 100, unite: 'kg', prix_unitaire: 400, farm_id: 'FARM-1' }],
    lots: [{ id: 'LOT-1', current_count: 20, cout_aliment: 0, farm_id: 'FARM-1' }],
    alimentationLogs: [], businessEvents: [], transactions: [], tasks: [], alertes: [], stockMovements: [],
  };
  const handlers = {
    onCreateAlimentation: async (row) => state.alimentationLogs.push(row),
    onUpdateStock: async (id, patch) => Object.assign(state.stocks.find((row) => row.id === id), patch),
    onUpdateLot: async (id, patch) => Object.assign(state.lots.find((row) => row.id === id), patch),
    onCreateStockMovement: async (row) => state.stockMovements.push(row),
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
  };
  const args = {
    form: { entry_id: 'FEED-1', date: '2026-07-12', stock_id: 'STK-FEED', lot_id: 'LOT-1', quantite: 10, farm_id: 'FARM-1' },
    context: state,
    handlers,
  };
  const first = await commitElevageFeeding(args);
  const eventCount = state.businessEvents.length;
  const second = await commitElevageFeeding(args);
  assert.equal(first.replayed, undefined);
  assert.equal(second.replayed, true);
  assert.equal(state.stocks[0].quantite, 90);
  assert.equal(state.alimentationLogs.length, 1);
  assert.equal(state.businessEvents.length, eventCount);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].cash_effect, false);
  assert.equal(state.transactions[0].source_type, 'consommation_stock');
});

test('mortalité rejouée garde un seul impact effectif et une perte non cash', async () => {
  const state = {
    lots: [{ id: 'LOT-M', initial_count: 100, current_count: 100, mortality: 0, prix_unitaire_sujet: 1000, farm_id: 'FARM-1' }],
    animaux: [], businessEvents: [], transactions: [], alertes: [],
  };
  const handlers = {
    onUpdateLot: async (id, patch) => Object.assign(state.lots.find((row) => row.id === id), patch),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
    onCreateAlert: async (row) => state.alertes.push(row),
  };
  const args = { form: { entry_id: 'MORT-1', date: '2026-07-12', lot_id: 'LOT-M', quantite: 2 }, context: state, handlers };
  const first = await commitElevageMortality(args);
  const second = await commitElevageMortality(args);
  assert.equal(first.activeCount, 98);
  assert.equal(second.replayed, true);
  assert.equal(state.lots[0].current_count, 98);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].cash_effect, false);
});

test('ponte rejouée n’ajoute les œufs qu’une fois', async () => {
  const state = {
    lots: [{ id: 'LOT-P', initial_count: 30, current_count: 30, type: 'pondeuse', farm_id: 'FARM-1' }],
    stocks: [{ id: 'STK-EGG', produit: 'Œufs', categorie: 'oeufs', quantite: 0, unite: 'oeuf', farm_id: 'FARM-1' }],
    productionLogs: [], businessEvents: [], stockMovements: [],
  };
  const handlers = {
    onCreateProduction: async (row) => state.productionLogs.push(row),
    onUpdateStock: async (id, patch) => Object.assign(state.stocks.find((row) => row.id === id), patch),
    onCreateStockMovement: async (row) => state.stockMovements.push(row),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
  };
  const args = { form: { entry_id: 'EGG-1', date: '2026-07-12', lot_id: 'LOT-P', oeufs_produits: 60 }, context: state, handlers };
  const first = await commitElevageEggProduction(args);
  const second = await commitElevageEggProduction(args);
  assert.equal(first.tablet.tablettes, 2);
  assert.equal(first.layingRate, 200);
  assert.equal(second.replayed, true);
  assert.equal(state.stocks[0].quantite, 60);
  assert.equal(state.productionLogs.length, 1);
});

test('pesée rejouée conserve une seule ligne d’historique', async () => {
  const state = { lots: [{ id: 'LOT-W', current_count: 10, weight_history: [] }], animaux: [], weightRecords: [], businessEvents: [] };
  const handlers = {
    onCreateWeightRecord: async (row) => state.weightRecords.push(row),
    onUpdateLot: async (id, patch) => Object.assign(state.lots.find((row) => row.id === id), patch),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
  };
  const args = { form: { entry_id: 'WEIGHT-1', date: '2026-07-12', lot_id: 'LOT-W', poids: 1.4 }, context: state, handlers };
  await commitElevageWeighing(args);
  const replay = await commitElevageWeighing(args);
  assert.equal(replay.replayed, true);
  assert.equal(state.weightRecords.length, 1);
  assert.equal(state.lots[0].weight_history.length, 1);
});

test('irrigation rejouée cumule une seule fois et ne crée pas de décaissement', async () => {
  const state = {
    cultures: [{ id: 'CULT-I', nom: 'Oignon', statut: 'en_cours', cout_eau: 0, cout_total_reel: 0, irrigation_history: [] }],
    businessEvents: [], tasks: [], alertes: [], transactions: [],
  };
  const handlers = {
    onUpdateCulture: async (id, patch) => Object.assign(state.cultures.find((row) => row.id === id), patch),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
    onCreateTask: async (row) => state.tasks.push(row),
    onCreateAlert: async (row) => state.alertes.push(row),
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
  };
  const args = { form: { entry_id: 'IRR-1', date: '2026-07-12', culture_id: 'CULT-I', volume_litres: 100, cout_unitaire_litre: 2 }, context: state, handlers };
  const first = await commitCultureIrrigation(args);
  const replay = await commitCultureIrrigation(args);
  assert.equal(first.cost, 200);
  assert.equal(replay.replayed, true);
  assert.equal(state.cultures[0].eau_consommee_litres, 100);
  assert.equal(state.cultures[0].irrigation_history.length, 1);
  assert.equal(state.transactions.length, 0);
});

test('récolte ventile qualité, stocke uniquement le vendable et ne reconnaît pas de CA', async () => {
  const state = {
    cultures: [{ id: 'CULT-H', nom: 'Tomate', statut: 'en_cours', quantite_recoltee: 0, quantite_disponible: 0, cout_total_reel: 10000 }],
    stocks: [], opportunities: [], businessEvents: [], harvestRecords: [], transactions: [],
  };
  const handlers = {
    onUpdateCulture: async (id, patch) => Object.assign(state.cultures.find((row) => row.id === id), patch),
    onCreateHarvestRecord: async (row) => { state.harvestRecords.push(row); state.businessEvents.push(row); },
    onCreateStock: async (row) => state.stocks.push(row),
    onCreateOpportunity: async (row) => state.opportunities.push(row),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
  };
  const args = {
    form: { entry_id: 'HARV-1', date: '2026-07-12', culture_id: 'CULT-H', quantite_recoltee: 100, quantite_declassee: 10, quantite_perdue: 5, unite: 'kg', prix_vente_unitaire: 500 },
    context: state,
    handlers,
  };
  const first = await commitCultureHarvest(args);
  const stockCount = state.stocks.length;
  const replay = await commitCultureHarvest(args);
  assert.equal(first.sellableQty, 85);
  assert.equal(first.downgradedQty, 10);
  assert.equal(first.lossQty, 5);
  assert.equal(state.stocks[0].quantite, 85);
  assert.equal(state.cultures[0].quantite_recoltee, 100);
  assert.equal(state.cultures[0].quantite_disponible, 85);
  assert.equal(replay.replayed, true);
  assert.equal(state.stocks.length, stockCount);
  assert.equal(state.transactions.length, 0);
});

test('vente prépare les mêmes identifiants et le second commit est un replay', async () => {
  const form = {
    entry_id: 'SALE-1', date: '2026-07-12', client_id: 'client_passage', source_type: 'stock', source_id: 'STK-S',
    product_name: 'Tomates', quantity: 2, unit: 'kg', unit_price: 500, payment_status: 'paye', payment_method: 'especes',
    fulfillment_mode: 'recupere', invoice_issued: true,
  };
  const prepare = () => prepareCommercialSaleCommit({ form, clientLabel: 'Client de passage', explicitFarmId: 'FARM-1', userId: 'USR-1' }).records;
  const records = prepare();
  const duplicateRecords = prepare();
  assert.equal(records.eventKey, duplicateRecords.eventKey);
  assert.equal(records.order.id, duplicateRecords.order.id);
  assert.equal(records.payment.id, duplicateRecords.payment.id);
  assert.equal(records.businessEvent.id, duplicateRecords.businessEvent.id);
  assert.equal(records.order.recorded_by, 'USR-1');

  const state = { salesOrders: [], businessEvents: [], items: [], deliveries: [], invoices: [], documents: [], payments: [] };
  const handlers = {
    onCreateOrder: async (row) => state.salesOrders.push(row),
    onCreateItem: async (row) => state.items.push(row),
    onCreateDelivery: async (row) => state.deliveries.push(row),
    onCreateInvoice: async (row) => state.invoices.push(row),
    onCreateDocument: async (row) => state.documents.push(row),
    onCreatePayment: async (row) => state.payments.push(row),
    onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
  };
  const context = { form, salesOrders: state.salesOrders, businessEvents: state.businessEvents, stocks: [], payments: state.payments };
  const first = await commitCommercialSale(records, handlers, context);
  const replay = await commitCommercialSale(records, handlers, context);
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(state.salesOrders.length, 1);
  assert.equal(state.items.length, 1);
  assert.equal(state.payments.length, 1);
});

test('confirmations détaillées et formulaires actifs portent les ancrages E2E', () => {
  Object.values(DAILY_ENTRY_TYPES).forEach((type) => {
    assert.notEqual(dailyEntryConfirmation(type, {}), 'Saisie enregistrée.');
  });
  const replay = dailyEntryConfirmation(DAILY_ENTRY_TYPES.SALE, { replayed: true });
  assert.match(replay, /aucun doublon/i);

  const quickActions = source('src/config/formulaires20s.config.js');
  ['distribution', 'ponte', 'mortalite', 'pesee', 'irrigation', 'recolte', 'vente'].forEach((id) => {
    assert.match(quickActions, new RegExp(`id: '${id}'`));
  });
  const elevagePanels = source('src/modules/elevage/ElevageWorkflowPanels.jsx');
  assert.match(elevagePanels, /testId="daily-feeding"/);
  assert.match(elevagePanels, /data-testid=\{`\$\{testId\}-submit`\}/);
  assert.match(source('src/modules/cultures/CulturesIrrigationQuickForm.jsx'), /daily-irrigation-submit/);
  assert.match(source('src/modules/cultures/CulturesHarvestPanel.jsx'), /daily-harvest-submit/);
  assert.match(source('src/modules/commercial/DailySaleModal.jsx'), /daily-sale-submit/);
  assert.doesNotMatch(source('src/modules/VentesTerrainV3.jsx'), /STEPS|Étape 5|formulaire guidé/i);
});
