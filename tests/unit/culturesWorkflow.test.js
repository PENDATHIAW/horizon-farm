import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commitCultureHarvest,
  commitCultureExpense,
  commitCultureStockSale,
  commitCultureTransformation,
  computeCultureSaleAmounts,
  validateCultureHarvestForm,
  validateCultureTransformationForm,
  runCultureScenario,
} from '../../src/utils/culturesWorkflow.js';
import { buildCulturesGapRows } from '../../src/utils/culturesIntegrity.js';

const stockQty = (row = {}) => Number(row?.quantite ?? row?.quantity ?? 0) || 0;

test('validateCultureHarvestForm requires culture and quantity', () => {
  assert.match(validateCultureHarvestForm({}), /Culture obligatoire/);
  assert.match(validateCultureHarvestForm({ culture_id: 'C1' }), /Quantité/);
  assert.equal(validateCultureHarvestForm({ culture_id: 'C1', quantite_recoltee: 10 }), '');
});

test('commitCultureHarvest creates harvest record and sellable stock', async () => {
  const state = { cultures: [], stocks: [], opportunities: [], transactions: [], events: [] };
  const handlers = {
    onUpdateCulture: async (id, patch) => {
      const i = state.cultures.findIndex((c) => c.id === id);
      if (i >= 0) state.cultures[i] = { ...state.cultures[i], ...patch };
    },
    onCreateHarvestRecord: async (row) => state.events.push(row),
    onCreateStock: async (row) => state.stocks.push(row),
    onCreateOpportunity: async (row) => state.opportunities.push(row),
    onCreateBusinessEvent: async (row) => state.events.push(row),
    onCreateFinanceTransaction: async (row) => state.transactions.push(row),
  };

  state.cultures.push({
    id: 'CULT-T',
    nom: 'Tomates test',
    cout_semences: 10000,
    statut: 'floraison',
  });

  const result = await commitCultureHarvest({
    form: {
      culture_id: 'CULT-T',
      quantite_recoltee: 100,
      unite: 'kg',
      prix_vente_unitaire: 300,
      date: '2026-06-01',
      destination: 'stock',
    },
    context: state,
    handlers,
  });

  assert.equal(result.ok, true);
  assert.equal(state.events.some((e) => e.event_type === 'culture_harvest_record'), true);
  assert.equal(state.stocks.length, 1);
  assert.ok(stockQty(state.stocks[0]) >= 100);
  assert.equal(state.cultures[0].quantite_recoltee, 100);
  assert.equal(state.opportunities.length, 1);
});

test('commitCultureStockSale paid records payment and reduces stock', async () => {
  const state = {
    cultures: [{ id: 'C1', nom: 'Oignons', quantite_recoltee: 200, revenu_reel: 0, cout_total_reel: 50000 }],
    stocks: [{
      id: 'STK-1',
      produit: 'Récolte Oignons',
      quantite: 200,
      unite: 'kg',
      culture_id: 'C1',
      prix_unitaire: 250,
      is_sellable: true,
    }],
    clients: [{ id: 'CLI-1', nom: 'Client test' }],
    salesOrders: [],
    payments: [],
    transactions: [],
    alertes: [],
    tasks: [],
  };
  const orders = [];
  const payments = [];
  const finances = [];

  await commitCultureStockSale({
    form: {
      client_id: 'CLI-1',
      source_id: 'STK-1',
      culture_id: 'C1',
      product_name: 'Récolte Oignons',
      quantity: 50,
      unit: 'kg',
      unit_price: 400,
      payment_status: 'paye',
      date: '2026-06-02',
      invoice_issued: true,
    },
    context: state,
    handlers: {
      onCreateOrder: async (row) => orders.push(row),
      onCreatePayment: async (row) => payments.push(row),
      onCreateInvoice: async (row) => { state.invoices = [row]; },
      onUpdateStock: async (id, patch) => {
        const s = state.stocks.find((x) => x.id === id);
        Object.assign(s, patch);
      },
      onUpdateCulture: async (id, patch) => {
        const c = state.cultures.find((x) => x.id === id);
        Object.assign(c, patch);
      },
      onCreateFinanceTransaction: async (row) => finances.push(row),
      onCreateBusinessEvent: async () => {},
      onCreateAlert: async () => {},
      onCreateTask: async () => {},
      onCreateTrace: async () => {},
      onUpdateClient: async () => {},
    },
  });

  assert.equal(orders.length, 1);
  assert.equal(orders[0].source_type, 'stock');
  assert.equal(payments.length, 1);
  assert.ok(stockQty(state.stocks[0]) <= 150);
  assert.ok(finances.some((t) => t.type === 'entree' || String(t.id).includes('PAY') || String(t.id).includes('SALE')));
});

test('commitCultureStockSale credit leaves receivable', () => {
  const amounts = computeCultureSaleAmounts({
    quantity: 80,
    unit_price: 350,
    payment_status: 'non_paye',
    fulfillment_mode: 'recupere',
  });
  assert.equal(amounts.paid, 0);
  assert.equal(amounts.remaining, amounts.grandTotal);
  assert.equal(amounts.paymentStatus, 'non_paye');
});

test('commitCultureExpense links finance and document proof', async () => {
  const state = {
    cultures: [{ id: 'C1', nom: 'Maïs', cout_traitement: 0, cout_total_reel: 0 }],
    transactions: [],
    documents: [],
    events: [],
  };
  await commitCultureExpense({
    form: {
      culture_id: 'C1',
      montant: 12000,
      categorie: 'cout_traitement',
      date: '2026-06-03',
      preuve_url: 'https://example.com/preuve.pdf',
    },
    context: state,
    handlers: {
      onCreateBusinessEvent: async (row) => state.events.push(row),
      onCreateFinanceTransaction: async (row) => state.transactions.push(row),
      onCreateDocument: async (row) => state.documents.push(row),
      onUpdateCulture: async (id, patch) => {
        Object.assign(state.cultures[0], patch);
      },
    },
  });
  assert.equal(state.transactions.length, 1);
  assert.equal(state.documents.length, 1);
  assert.ok(num(state.cultures[0].cout_traitement) >= 12000);
});

test('runCultureScenario produces culture margin after harvest and sales', async () => {
  const { state, culture, stock } = await runCultureScenario();
  assert.ok(culture);
  assert.ok(stock);
  assert.ok(num(culture.quantite_recoltee) >= 500);
  assert.ok(num(culture.quantite_vendue) >= 200);
  assert.ok(state.orders.length >= 2);
  const gaps = buildCulturesGapRows({
    cultures: state.cultures,
    stocks: state.stocks,
    businessEvents: state.events,
    transactions: state.transactions,
    salesOrders: state.orders,
    payments: state.payments,
  });
  assert.ok(Array.isArray(gaps));
});

test('validateCultureTransformationForm requires stock and quantities', () => {
  assert.match(validateCultureTransformationForm({}), /Stock matière première/);
  assert.match(validateCultureTransformationForm({ source_stock_id: 'S1', quantite: 5 }), /produit transformé/);
});

test('commitCultureTransformation exits source and creates finished stock', async () => {
  const state = {
    stocks: [{ id: 'STK-1', produit: 'Récolte Tomates', quantite: 100, unite: 'kg', culture_id: 'C1', prix_unitaire: 200 }],
    events: [],
    finances: [],
  };
  const handlers = {
    onUpdateStock: async (id, patch) => {
      const i = state.stocks.findIndex((s) => s.id === id);
      state.stocks[i] = { ...state.stocks[i], ...patch };
    },
    onCreateStock: async (row) => { state.stocks.push(row); },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
    onCreateFinanceTransaction: async (row) => { state.finances.push(row); },
  };
  const result = await commitCultureTransformation({
    form: {
      source_stock_id: 'STK-1',
      quantite: 40,
      produit_fini: 'Concentré tomate',
      quantite_produit_fini: 10,
      cout_transformation: 5000,
      date: '2026-06-09',
    },
    context: state,
    handlers,
  });
  assert.equal(result.ok, true);
  assert.equal(stockQty(state.stocks.find((s) => s.id === 'STK-1')), 60);
  assert.ok(state.stocks.some((s) => s.produit === 'Concentré tomate'));
  assert.equal(state.finances.length, 1);
});

function num(value) {
  return Number(value || 0) || 0;
}
