import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFeedBatchCanBeSold,
  buildAgriFeedsCommercialDecisionCards,
  buildRepurchaseSuggestions,
  commitCustomerFeedback,
  commitFeedSaleOrder,
  computeAgriFeedsCommercialKpis,
  listCommercializableFeedBatches,
  prepareCustomerFeedback,
  prepareFeedSaleOrder,
} from '../../src/services/agriFeeds/feedCommercialWorkflow.js';

const baseData = {
  clients: [
    { id: 'CLI1', nom: 'Ferme Diop', last_purchase_date: '2026-05-01', usual_volume: 50, repeat_purchase_score: 1 },
    { id: 'CLI2', nom: 'Éleveur Ndiaye' },
  ],
  feed_formulas: [
    { id: 'FF1', name: 'Chair croissance', status: 'commercializable' },
    { id: 'FF2', name: 'Ponte test', status: 'internal_testing' },
  ],
  feed_formula_versions: [
    { id: 'FFV1', formula_id: 'FF1', version_code: 'V1', status: 'commercializable' },
    { id: 'FFV2', formula_id: 'FF2', version_code: 'V1', status: 'internal_testing' },
  ],
  feed_finished_batches: [
    {
      id: 'FFB1', batch_code: 'AF-001', formula_version_id: 'FFV1', quantity_available: 100,
      unit_cost: 300, quality_status: 'accepted', destination: 'commercial_sale', active: true, stock_id: 'STK1', production_date: '2026-07-01',
    },
    {
      id: 'FFB2', batch_code: 'AF-002', formula_version_id: 'FFV2', quantity_available: 100,
      unit_cost: 290, quality_status: 'accepted', destination: 'commercial_sale', active: true, stock_id: 'STK2',
    },
  ],
  feed_quality_checks: [
    { id: 'QC1', related_type: 'finished_batch', related_id: 'FFB1', result: 'accepted', status: 'pass' },
    { id: 'QC2', related_type: 'finished_batch', related_id: 'FFB2', result: 'accepted', status: 'pass' },
  ],
  stock: [
    { id: 'STK1', feed_finished_batch_id: 'FFB1', quantite: 100, prixUnit: 300 },
    { id: 'STK2', feed_finished_batch_id: 'FFB2', quantite: 100, prixUnit: 290 },
  ],
  sales_orders: [],
  sales_order_items: [],
};

test('listCommercializableFeedBatches — filtre uniquement les formules commercialisables avec QC', () => {
  const rows = listCommercializableFeedBatches(baseData);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].batch.id, 'FFB1');
});

test('assertFeedBatchCanBeSold — bloque une formule non commercialisable', () => {
  const batch = baseData.feed_finished_batches[1];
  const formula = baseData.feed_formulas[1];
  const gate = assertFeedBatchCanBeSold(batch, formula, baseData);
  assert.equal(gate.ok, false);
  assert.match(gate.message, /commercialisable/i);
});

test('prepareFeedSaleOrder — crée commande, ligne, sortie stock, finance, client et marge', async () => {
  const preview = prepareFeedSaleOrder({
    client_id: 'CLI1',
    feed_finished_batch_id: 'FFB1',
    quantity_kg: 40,
    unit_price: 450,
    paid_amount: 10000,
    order_date: '2026-07-09',
  }, baseData);

  assert.equal(preview.ok, true);
  assert.equal(preview.saleOrder.module_source, 'agri_feeds');
  assert.equal(preview.orderItem.source_type, 'feed_finished_batch');
  assert.equal(preview.metrics.total, 18000);
  assert.equal(preview.metrics.remaining, 8000);
  assert.equal(preview.metrics.margin, 6000);
  assert.equal(preview.finishedBatchPatch.quantity_available, 60);
  assert.equal(preview.stockPatch.quantite, 60);
  assert.equal(preview.financeTransaction.montant, 10000);

  const committed = {};
  await commitFeedSaleOrder(preview, {
    onCreateSaleOrder: async (row) => { committed.order = row; return row; },
    onCreateSaleOrderItem: async (row) => { committed.item = row; return row; },
    onUpdateFinishedBatch: async (id, patch) => { committed.batch = { id, ...patch }; return committed.batch; },
    onUpdateStock: async (id, patch) => { committed.stock = { id, ...patch }; return committed.stock; },
    onCreateStockMovement: async (row) => { committed.movement = row; return row; },
    onCreateFinanceTransaction: async (row) => { committed.finance = row; return row; },
    onUpdateClient: async (id, patch) => { committed.client = { id, ...patch }; return committed.client; },
    onCreateBusinessEvent: async (row) => { committed.event = row; return row; },
  });

  assert.equal(committed.order.id, preview.saleOrder.id);
  assert.equal(committed.item.order_id, preview.saleOrder.id);
  assert.equal(committed.batch.quantity_available, 60);
  assert.equal(committed.client.last_purchase_date, '2026-07-09');
});

test('prepareFeedSaleOrder — alerte stock bas après vente', () => {
  const preview = prepareFeedSaleOrder({
    client_id: 'CLI1',
    feed_finished_batch_id: 'FFB1',
    quantity_kg: 60,
    unit_price: 450,
    paid_amount: 0,
  }, baseData);
  assert.equal(preview.ok, true);
  assert.ok(preview.alert);
  assert.match(preview.alert.title, /Stock AGRI FEEDS bas/i);
});

test('prepareFeedSaleOrder — refuse quantité supérieure au disponible', () => {
  const preview = prepareFeedSaleOrder({
    client_id: 'CLI1',
    feed_finished_batch_id: 'FFB1',
    quantity_kg: 101,
    unit_price: 450,
  }, baseData);
  assert.equal(preview.ok, false);
  assert.match(preview.error, /stock/i);
});

test('buildRepurchaseSuggestions — détecte client régulier à relancer', () => {
  const suggestions = buildRepurchaseSuggestions({
    ...baseData,
    sales_orders: [
      { id: 'SO1', client_id: 'CLI1', module_source: 'agri_feeds', order_date: '2026-05-01', montant_total: 20000 },
    ],
  }, { now: new Date('2026-07-09'), delayDays: 45 });
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].client.id, 'CLI1');
});

test('prepareCustomerFeedback — réclamation crée un événement et une alerte', async () => {
  const preview = prepareCustomerFeedback({
    client_id: 'CLI1',
    feed_finished_batch_id: 'FFB1',
    satisfaction_score: 2,
    complaint_type: 'odeur',
    notes: 'Le client signale une odeur inhabituelle.',
  }, baseData);
  assert.equal(preview.ok, true);
  assert.ok(preview.alert);
  assert.equal(preview.event.event_type, 'agri_feeds_reclamation_client');

  const committed = {};
  await commitCustomerFeedback(preview, {
    onCreateBusinessEvent: async (row) => { committed.event = row; return row; },
    onCreateAlert: async (row) => { committed.alert = row; return row; },
  });
  assert.equal(committed.alert.module_source, 'agri_feeds');
});

test('computeAgriFeedsCommercialKpis + decision cards', () => {
  const data = {
    ...baseData,
    sales_orders: [
      { id: 'SO1', client_id: 'CLI1', module_source: 'agri_feeds', order_date: '2026-07-02', montant_total: 20000, reste_a_payer: 5000 },
      { id: 'SO2', client_id: 'CLI1', module_source: 'agri_feeds', order_date: '2026-07-04', montant_total: 15000, reste_a_payer: 0 },
    ],
    sales_order_items: [
      { id: 'I1', source_type: 'feed_finished_batch', margin: 4000 },
      { id: 'I2', source_type: 'feed_finished_batch', margin: 2500 },
    ],
  };
  const kpis = computeAgriFeedsCommercialKpis(data, { now: new Date('2026-07-09') });
  assert.equal(kpis.revenue_month, 35000);
  assert.equal(kpis.margin_month, 6500);
  assert.equal(kpis.receivables, 5000);

  const cards = buildAgriFeedsCommercialDecisionCards(data);
  assert.ok(cards.some((c) => /Créances/i.test(c.title)));
});
