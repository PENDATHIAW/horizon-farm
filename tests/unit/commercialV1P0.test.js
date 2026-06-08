import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommercialSaleRecords,
  prepareCommercialSaleCommit,
  validateCommercialSaleForm,
} from '../../src/utils/commercialSaleWorkflow.js';
import {
  applySourceImpactFromSaleLines,
  buildPaidFinanceRow,
  buildReceivableFinanceRow,
  runNewSaleSideEffects,
} from '../../src/utils/saleSideEffects.js';
import {
  buildCommercialFarmContext,
  enrichPaymentWithFarmId,
  stampFarmIdOnCommercialRecords,
  validateCommercialSaleFarmContext,
} from '../../src/utils/commercialFarmScope.js';
import {
  buildStockInsufficientMessage,
  validateSaleStockAvailability,
} from '../../src/utils/commercialStockValidation.js';
import { backfillCommercialFarmId } from '../../src/utils/commercialFarmBackfill.js';
import { filterPaymentsByFarmScope } from '../../src/utils/applyFarmScope.js';
import { DEFAULT_FARM_ID, filterRowsByFarmScope } from '../../src/utils/farmScope.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true };
const FARM_B = { id: 'farm-b', name: 'Site avicole' };
const filterCtx = { forceFilter: true };

const baseForm = (overrides = {}) => ({
  date: '2026-06-04',
  client_id: 'CLI-1',
  source_type: 'stock',
  source_id: 'STK-1',
  product_name: 'Provende',
  quantity: 10,
  unit: 'kg',
  unit_price: 500,
  payment_status: 'paye',
  payment_method: 'especes',
  fulfillment_mode: 'recupere',
  delivery_fee: 0,
  invoice_issued: true,
  ...overrides,
});

describe('Commercial V1 P0 — farm_id', () => {
  it('stampe farm_id actif sur toutes les entités vente', () => {
    const records = buildCommercialSaleRecords({
      form: baseForm(),
      orderId: 'CMD-FARM',
      farmId: FARM_A.id,
    });
    assert.equal(records.order.farm_id, FARM_A.id);
    assert.equal(records.items[0].farm_id, FARM_A.id);
    assert.equal(records.delivery.farm_id, FARM_A.id);
    assert.equal(records.invoice.farm_id, FARM_A.id);
    assert.equal(records.payment.farm_id, FARM_A.id);
    assert.equal(records.businessEvent.farm_id, FARM_A.id);
  });

  it('bloque création vente en mode toutes les fermes sans farm_id', () => {
    const farmContext = buildCommercialFarmContext({ mode: 'all' }, [FARM_A, FARM_B], null, filterCtx);
    const check = validateCommercialSaleFarmContext(farmContext);
    assert.equal(check.ok, false);
    assert.match(check.message, /ferme active/i);

    const err = validateCommercialSaleForm(baseForm(), {
      farmScope: { mode: 'all' },
      accessibleFarms: [FARM_A, FARM_B],
      filteringEnabled: true,
    });
    assert.match(err, /ferme active/i);
  });

  it('prepareCommercialSaleCommit injecte farm_id actif', () => {
    const { records, farmId } = prepareCommercialSaleCommit({
      form: baseForm(),
      orderId: 'CMD-PREP',
      clientLabel: 'Client',
      farmScope: { mode: 'single', farmId: FARM_A.id },
      accessibleFarms: [FARM_A, FARM_B],
      activeFarm: FARM_A,
      explicitFarmId: FARM_A.id,
    });
    assert.equal(farmId, FARM_A.id);
    assert.equal(records.order.farm_id, FARM_A.id);
  });

  it('finances générées héritent farm_id commande', () => {
    const order = { id: 'CMD-FIN', farm_id: FARM_A.id, source_type: 'stock' };
    const paid = buildPaidFinanceRow({
      orderId: order.id,
      amount: 1000,
      paymentId: 'PAY-1',
      order,
      farmId: FARM_A.id,
    });
    const receivable = buildReceivableFinanceRow({
      orderId: order.id,
      amount: 500,
      order,
      farmId: FARM_A.id,
    });
    assert.equal(paid.farm_id, FARM_A.id);
    assert.equal(receivable.farm_id, FARM_A.id);
  });
});

describe('Commercial V1 P0 — stock multi-lignes', () => {
  it('impact stock ligne 1 et ligne 2', async () => {
    const stockUpdates = [];
    const lotUpdates = [];
    const handlers = {
      onUpdateStock: async (id, patch) => { stockUpdates.push({ id, patch }); },
      onUpdateLot: async (id, patch) => { lotUpdates.push({ id, patch }); },
      onUpdateItem: async (id, patch) => { /* noop */ },
    };
    const stocks = [{ id: 'STK-1', quantite: 100, vendus: 0 }];
    const lots = [{ id: 'LOT-1', current_count: 50, vendus: 0, initial_count: 50 }];

    const items = [
      { id: 'L1', source_type: 'stock', source_id: 'STK-1', quantity: 5, line_total: 2500, source_impact_applied: false },
      { id: 'L2', source_type: 'lot_avicole', source_id: 'LOT-1', quantity: 3, line_total: 9000, source_impact_applied: false },
    ];

    const result = await applySourceImpactFromSaleLines({
      handlers,
      orderItems: items,
      orderId: 'CMD-ML',
      date: '2026-06-04',
      stocks,
      lots,
      cultures: [],
      animaux: [],
    });

    assert.equal(result.applied.length, 2);
    assert.equal(stockUpdates.length, 1);
    assert.equal(lotUpdates.length, 1);
    assert.equal(stockUpdates[0].patch.quantite, 95);
    assert.equal(lotUpdates[0].patch.current_count, 47);
  });

  it('ne double-décrémente pas si source_impact_applied', async () => {
    let stockCalls = 0;
    const handlers = {
      onUpdateStock: async () => { stockCalls += 1; },
      onUpdateItem: async () => {},
    };
    const items = [
      { id: 'L1', source_type: 'stock', source_id: 'STK-1', quantity: 5, line_total: 2500, source_impact_applied: true },
    ];
    await applySourceImpactFromSaleLines({
      handlers,
      orderItems: items,
      orderId: 'CMD-IDEM',
      stocks: [{ id: 'STK-1', quantite: 100 }],
    });
    assert.equal(stockCalls, 0);
  });

  it('service / autre sans impact stock', async () => {
    let stockCalls = 0;
    const handlers = {
      onUpdateStock: async () => { stockCalls += 1; },
      onUpdateItem: async () => {},
    };
    const items = [
      { id: 'L1', source_type: 'service', source_id: '', quantity: 1, line_total: 1000, source_impact_applied: false },
      { id: 'L2', source_type: 'autre', source_id: '', quantity: 2, line_total: 2000, source_impact_applied: false },
    ];
    const result = await applySourceImpactFromSaleLines({ handlers, orderItems: items, orderId: 'CMD-SVC' });
    assert.equal(result.applied.length, 0);
    assert.equal(stockCalls, 0);
  });

  it('runNewSaleSideEffects parcourt orderItems', async () => {
    const stockUpdates = [];
    await runNewSaleSideEffects({
      order: { id: 'CMD-RUN', montant_total: 5000, farm_id: FARM_A.id },
      orderId: 'CMD-RUN',
      orderItems: [
        { id: 'I1', source_type: 'stock', source_id: 'STK-2', quantity: 2, line_total: 1000, source_impact_applied: false },
        { id: 'I2', source_type: 'stock', source_id: 'STK-3', quantity: 4, line_total: 2000, source_impact_applied: false },
      ],
      form: { date: '2026-06-04' },
      paid: 0,
      remaining: 5000,
      farmId: FARM_A.id,
      stocks: [
        { id: 'STK-2', quantite: 20 },
        { id: 'STK-3', quantite: 10 },
      ],
      handlers: {
        onUpdateStock: async (id, patch) => { stockUpdates.push({ id, ...patch }); },
        onUpdateItem: async () => {},
        onCreateFinanceTransaction: async () => {},
        onCreateAlert: async () => {},
      },
      transactions: [],
      alertes: [],
    });
    assert.equal(stockUpdates.length, 2);
  });
});

describe('Commercial V1 P0 — stock insuffisant', () => {
  it('bloque vente si quantité > disponible', () => {
    const msg = validateSaleStockAvailability(baseForm({ quantity: 20 }), {
      stocks: [{ id: 'STK-1', quantite: 12 }],
    });
    assert.match(msg, /Stock insuffisant/i);
    assert.match(msg, /12/);
    assert.match(msg, /20/);
  });

  it('validateCommercialSaleForm propage le blocage stock', () => {
    const msg = validateCommercialSaleForm(baseForm({ quantity: 50 }), {
      stocks: [{ id: 'STK-1', quantite: 12 }],
    });
    assert.match(msg, /Stock insuffisant/i);
  });

  it('service sans blocage stock', () => {
    const msg = validateSaleStockAvailability(baseForm({
      source_type: 'service',
      source_id: '',
      quantity: 999,
    }), { stocks: [] });
    assert.equal(msg, '');
  });

  it('message stock insuffisant explicite', () => {
    const msg = buildStockInsufficientMessage({ productName: 'Maïs', available: 12, requested: 20, unit: 'kg' });
    assert.match(msg, /12/);
    assert.match(msg, /20/);
    assert.match(msg, /Maïs/);
  });
});

describe('Commercial V1 P0 — paiements orphelins', () => {
  it('paiement lié à commande hérite farm_id', () => {
    const payment = enrichPaymentWithFarmId(
      { id: 'PAY-1', order_id: 'O1', montant: 100 },
      {
        order: { id: 'O1', farm_id: FARM_A.id },
        farmContext: buildCommercialFarmContext({ mode: 'single', farmId: FARM_A.id }, [FARM_A, FARM_B], FARM_A, filterCtx),
      },
    );
    assert.equal(payment.farm_id, FARM_A.id);
  });

  it('paiement orphelin reçoit farm_id actif', () => {
    const payment = enrichPaymentWithFarmId(
      { id: 'PAY-ORPH', montant: 50 },
      {
        farmContext: buildCommercialFarmContext({ mode: 'single', farmId: FARM_A.id }, [FARM_A, FARM_B], FARM_A, filterCtx),
      },
    );
    assert.equal(payment.farm_id, FARM_A.id);
  });

  it('paiement orphelin avec farm_id filtré hors scope', () => {
    const payments = filterPaymentsByFarmScope(
      [
        { id: 'P1', order_id: 'O1', montant: 100 },
        { id: 'P2', farm_id: FARM_B.id, montant: 30 },
        { id: 'P3', montant: 20 },
      ],
      [{ id: 'O1', farm_id: FARM_A.id }],
      { mode: 'single', farmId: FARM_A.id },
      [FARM_A, FARM_B],
    );
    assert.equal(payments.length, 2);
    assert.ok(payments.some((p) => p.id === 'P1'));
    assert.ok(payments.some((p) => p.id === 'P3'));
    assert.equal(payments.some((p) => p.id === 'P2'), false);
  });

  it('historique sans farm_id reste visible en compatibilité', () => {
    const props = filterPaymentsByFarmScope(
      [{ id: 'P-LEG', montant: 10 }],
      [],
      { mode: 'single', farmId: FARM_A.id },
      [FARM_A],
    );
    assert.equal(props.length, 1);
  });
});

describe('Commercial V1 P0 — backfill historique', () => {
  it('backfill idempotent rattache à ferme default', () => {
    const input = {
      sales_orders: [{ id: 'O1', montant_total: 1000 }, { id: 'O2', montant_total: 500, farm_id: FARM_B.id }],
      sales_order_items: [{ id: 'I1', order_id: 'O1' }],
      payments: [{ id: 'P1', order_id: 'O1' }, { id: 'P2', montant: 20 }],
      deliveries: [{ id: 'D1', order_id: 'O1' }],
      invoices: [{ id: 'F1', order_id: 'O1' }],
      finances: [{ id: 'FIN1', order_id: 'O1' }],
      business_events: [{ id: 'E1', entity_id: 'O1' }],
    };
    const first = backfillCommercialFarmId(input, { defaultFarmId: DEFAULT_FARM_ID });
    assert.equal(first.stats.sales_orders, 1);
    assert.equal(first.data.sales_orders[0].farm_id, DEFAULT_FARM_ID);
    assert.equal(first.data.payments[0].farm_id, DEFAULT_FARM_ID);
    assert.equal(first.data.payments[1].farm_id, DEFAULT_FARM_ID);

    const second = backfillCommercialFarmId(first.data, { defaultFarmId: DEFAULT_FARM_ID });
    assert.equal(second.stats.sales_orders, 0);
    assert.equal(second.stats.payments, 0);
  });

  it('stampFarmIdOnCommercialRecords ne remplace pas farm_id existant', () => {
    const records = stampFarmIdOnCommercialRecords({
      order: { id: 'O1', farm_id: FARM_B.id },
      items: [{ id: 'I1' }],
      delivery: { id: 'D1' },
      payment: null,
      businessEvent: { id: 'E1' },
    }, FARM_A.id);
    assert.equal(records.order.farm_id, FARM_B.id);
    assert.equal(records.items[0].farm_id, FARM_A.id);
  });
});

describe('Commercial V1 P0 — non-régression farm scope', () => {
  it('commandes sans farm_id restent visibles en compatibilité', () => {
    const orders = [
      { id: 'O-LEG', montant_total: 100 },
      { id: 'O-B', montant_total: 200, farm_id: FARM_B.id },
    ];
    const filtered = filterRowsByFarmScope(orders, { mode: 'single', farmId: FARM_A.id }, [FARM_A, FARM_B]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'O-LEG');
  });
});
