import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuoteRecords,
  commitCommercialQuote,
  convertQuoteToOrder,
  isQuoteOrder,
  prepareCommercialQuoteCommit,
  QUOTE_STATUSES,
  quoteStatusOf,
  updateQuoteStatus,
} from '../../src/utils/commercialQuoteWorkflow.js';
import {
  applyCommercialDiscounts,
  enrichSaleFormWithClientPricing,
  readClientCommercialTerms,
  resolveDefaultUnitPrice,
} from '../../src/utils/commercialPricing.js';
import {
  buildSellableStockSaleOptions,
  isSellableStock,
} from '../../src/utils/sellableStock.js';
import {
  buildCommercialStartupJourney,
  isCommercialStartupMode,
} from '../../src/utils/commercialStartup.js';
import {
  buildWhatsAppLogPayload,
  normalizeWhatsAppStatus,
  WHATSAPP_STATUSES,
  whatsAppStatusLabel,
} from '../../src/utils/whatsappCommercial.js';
import { buildCommercialReconciliationRows } from '../../src/utils/commercialReconciliation.js';
import { buildConsolidatedCommercialKpis } from '../../src/utils/commercialKpiConsolidated.js';
import { buildCommercialRelanceRows } from '../../src/utils/commercialRelances.js';
import {
  planStockMovementFromSaleLine,
  planStockMovementsForOrder,
} from '../../src/utils/stockMovementBridge.js';
import { prepareCommercialSaleCommit } from '../../src/utils/commercialSaleWorkflow.js';
import { applySourceImpactFromSaleLines } from '../../src/utils/saleSideEffects.js';
const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true };

describe('Commercial V2 P1 — Annexe & devis', () => {
  it('devis identifié via type_document sans impact stock initial', () => {
    const { records } = prepareCommercialQuoteCommit({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'service',
        product_name: 'Devis provende',
        quantity: 10,
        unit: 'kg',
        unit_price: 500,
      },
      clientLabel: 'Client Test',
      explicitFarmId: FARM_A.id,
      quoteStatus: QUOTE_STATUSES.DRAFT,
    });
    assert.equal(isQuoteOrder(records.order), true);
    assert.equal(records.order.stock_impact_applied, false);
    assert.equal(records.order.farm_id, FARM_A.id);
    assert.equal(records.delivery, null);
    assert.equal(records.invoice, null);
  });

  it('commitCommercialQuote ne déclenche pas side effects stock', async () => {
    const { records } = prepareCommercialQuoteCommit({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'stock',
        source_id: 'STK-1',
        product_name: 'Œufs',
        quantity: 5,
        unit: 'tablette',
        unit_price: 3000,
      },
      clientLabel: 'Client Test',
      explicitFarmId: FARM_A.id,
    });
    const calls = { stock: 0, order: 0, item: 0 };
    await commitCommercialQuote(records, {
      onCreateOrder: () => { calls.order += 1; },
      onCreateItem: () => { calls.item += 1; },
      onUpdateStock: () => { calls.stock += 1; },
    });
    assert.equal(calls.order, 1);
    assert.equal(calls.item, 1);
    assert.equal(calls.stock, 0);
  });

  it('conversion devis en commande avec farm_id conservé', async () => {
    const quote = buildQuoteRecords({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'service',
        product_name: 'Devis',
        quantity: 1,
        unit: 'forfait',
        unit_price: 10000,
      },
      orderId: 'DEV-1',
      clientLabel: 'Client Test',
      farmId: FARM_A.id,
    }).order;

    const handlers = {
      onUpdateOrder: async () => {},
      onCreateDelivery: async () => {},
      onCreateInvoice: async () => {},
      onCreateDocument: async () => {},
      onCreateBusinessEvent: async () => {},
      onRefreshWorkflow: async () => {},
    };
    const result = await convertQuoteToOrder({
      quote,
      items: [],
      form: { payment_status: 'non_paye', invoice_issued: true },
      handlers,
      context: {
        farmScope: { mode: 'single', farmId: FARM_A.id },
        accessibleFarms: [FARM_A],
        activeFarm: FARM_A,
        sideEffectHandlers: handlers,
        stocks: [],
        lots: [],
        cultures: [],
        animaux: [],
        clients: [{ id: 'CLI-1', nom: 'Client Test' }],
        salesOrders: [],
        payments: [],
        transactions: [],
        tasks: [],
        alertes: [],
      },
    });
    assert.equal(result.converted, true);
    assert.equal(quoteStatusOf({ ...quote, quote_status: QUOTE_STATUSES.CONVERTED }), QUOTE_STATUSES.CONVERTED);
  });

  it('updateQuoteStatus — statuts devis attendus', async () => {
    const quote = { id: 'DEV-2', type_document: 'devis', quote_status: 'brouillon' };
    let patch = null;
    await updateQuoteStatus(quote, QUOTE_STATUSES.SENT, {
      onUpdateOrder: async (_id, p) => { patch = p; },
    });
    assert.equal(patch.quote_status, QUOTE_STATUSES.SENT);
  });
});

describe('Commercial V2 P1 — prix client / remises', () => {
  it('prix spécial client appliqué', () => {
    const client = {
      id: 'CLI-G',
      nom: 'Grossiste',
      price_tier: 'grossiste',
      commercial_terms: { special_prices: { 'STK-1': 4200 } },
    };
    const price = resolveDefaultUnitPrice({
      basePrice: 5000,
      sourceRow: { id: 'STK-1', prix_unitaire: 5000 },
      client,
      productKey: 'STK-1',
    });
    assert.equal(price, 4200);
  });

  it('remise pourcentage', () => {
    const result = applyCommercialDiscounts({ unitPrice: 1000, quantity: 2, discountPct: 10 });
    assert.equal(result.lineTotal, 1800);
    assert.equal(result.discountApplied, 200);
  });

  it('remise montant', () => {
    const result = applyCommercialDiscounts({ unitPrice: 1000, quantity: 1, discountAmount: 150 });
    assert.equal(result.lineTotal, 850);
  });

  it('enrichSaleFormWithClientPricing expose conditions commerciales', () => {
    const client = {
      id: 'CLI-1',
      conditions_paiement: '30 jours',
      commercial_terms: { remise_pct: 5 },
    };
    const enriched = enrichSaleFormWithClientPricing(
      { quantity: 2, unit_price: 1000 },
      { client, sourceRow: { id: 'P1' } },
    );
    assert.equal(enriched.conditions_paiement, '30 jours');
    assert.equal(readClientCommercialTerms(client).discountPct, 5);
  });
});

describe('Commercial V2 P1 — stock vendable unifié', () => {
  it('œufs vendables', () => {
    assert.equal(isSellableStock({ id: 'STK-O', quantite: 10, categorie: 'produit_fini', produit: 'Œufs tablettes', vendable: true }), true);
  });

  it('poulets / viande vendables si ready_for_sale', () => {
    assert.equal(isSellableStock({ id: 'STK-V', quantite: 3, categorie: 'produit_fini', produit: 'Poulet entier', ready_for_sale: true }), true);
    assert.equal(isSellableStock({ id: 'STK-M', quantite: 2, categorie: 'produit_fini', produit: 'Viande bovine', sale_ready: true }), true);
  });

  it('culture récolte vendable', () => {
    assert.equal(isSellableStock({ id: 'STK-C', quantite: 50, categorie: 'recolte', produit: 'Tomates' }), true);
  });

  it('aliment non vendable', () => {
    assert.equal(isSellableStock({ id: 'STK-A', quantite: 100, categorie: 'aliment', produit: 'Provende' }), false);
  });

  it('buildSellableStockSaleOptions cohérent', () => {
    const options = buildSellableStockSaleOptions([
      { id: 'STK-1', quantite: 5, categorie: 'recolte', produit: 'Maïs', prix_unitaire: 300, unite: 'kg' },
      { id: 'STK-2', quantite: 0, categorie: 'recolte', produit: 'Vide' },
    ]);
    assert.equal(options.length, 1);
    assert.equal(options[0].value, 'STK-1');
  });
});

describe('Commercial V2 P1 — mode démarrage', () => {
  it('startup mode quand aucune activité', () => {
    assert.equal(isCommercialStartupMode({ clients: [], salesOrders: [], payments: [], sellableStocks: [] }), true);
  });

  it('buildCommercialStartupJourney — checklist 7 étapes', () => {
    const journey = buildCommercialStartupJourney({ clients: [], salesOrders: [], payments: [] });
    assert.equal(journey.total, 7);
    assert.match(journey.steps[0].label, /client/i);
    assert.equal(journey.isEmpty, true);
  });
});

describe('Commercial V2 P1 — WhatsApp fiable', () => {
  it('statut préparé sans fausse confirmation API', () => {
    const payload = buildWhatsAppLogPayload({
      client: { id: 'CLI-1', whatsapp: '+221771234567' },
      message: 'Bonjour',
      status: WHATSAPP_STATUSES.PREPARE,
      logId: 'WALOG-1',
      orderId: 'CMD-1',
    });
    assert.equal(payload.status, 'prepare');
    assert.equal(payload.api_confirmed, false);
    assert.equal(payload.delivery_confirmed, false);
    assert.equal(payload.order_id, 'CMD-1');
  });

  it('statut envoyé manuel distinct', () => {
    const payload = buildWhatsAppLogPayload({
      client: { id: 'CLI-1' },
      message: 'Merci',
      status: WHATSAPP_STATUSES.SENT_MANUAL,
      logId: 'WALOG-2',
    });
    assert.equal(payload.manual_send_confirmed, true);
    assert.equal(whatsAppStatusLabel(WHATSAPP_STATUSES.SENT_MANUAL), 'Envoyé manuellement');
  });

  it('normalisation statuts WhatsApp', () => {
    assert.equal(normalizeWhatsAppStatus('ouvert'), WHATSAPP_STATUSES.OPENED);
    assert.equal(normalizeWhatsAppStatus('a_relancer'), WHATSAPP_STATUSES.TO_RELANCE);
  });
});

describe('Commercial V2 P1 — réconciliation & KPI & relances', () => {
  it('détecte paiement orphelin', () => {
    const rows = buildCommercialReconciliationRows({
      orders: [{ id: 'CMD-1', montant_total: 5000, client_id: 'CLI-1', farm_id: FARM_A.id }],
      payments: [{ id: 'PAY-ORPH', order_id: 'CMD-MISSING', montant: 1000, farm_id: FARM_A.id }],
      transactions: [],
    });
    assert.ok(rows.some((r) => r.kind === 'payment_without_order'));
  });

  it('KPI consolidés excluent devis du CA', () => {
    const kpis = buildConsolidatedCommercialKpis({
      orders: [
        { id: 'CMD-1', montant_total: 10000, type_document: 'commande', client_id: 'CLI-1', farm_id: FARM_A.id },
        { id: 'DEV-1', montant_total: 5000, type_document: 'devis', client_id: 'CLI-1', farm_id: FARM_A.id },
      ],
      payments: [{ id: 'PAY-1', order_id: 'CMD-1', montant: 10000 }],
      clients: [{ id: 'CLI-1', nom: 'Client' }],
    });
    assert.equal(kpis.ca, 10000);
    assert.equal(kpis.quoteCount, 1);
  });

  it('relances créance avec priorité et message', () => {
    const rows = buildCommercialRelanceRows({
      clients: [{ id: 'CLI-1', nom: 'Client A', whatsapp: '+221771234567' }],
      orders: [{
        id: 'CMD-1',
        client_id: 'CLI-1',
        montant_total: 50000,
        date: '2026-01-01',
        date_echeance: '2026-01-15',
        farm_id: FARM_A.id,
      }],
      payments: [],
    });
    assert.ok(rows.length >= 1);
    assert.ok(rows[0].message);
    assert.ok(rows[0].priority);
    assert.equal(rows[0].channel, 'WhatsApp');
  });
});

describe('Commercial V2 P1 — stock_movements futur', () => {
  it('planStockMovementFromSaleLine quand impact appliqué', () => {
    const plan = planStockMovementFromSaleLine({
      orderItem: { id: 'LI-1', quantity: 2, unit: 'kg', source_impact_applied: true, line_index: 1 },
      order: { id: 'CMD-1', farm_id: FARM_A.id },
      patchPlan: { id: 'STK-1', module: 'stock' },
    });
    assert.equal(plan.ready, true);
    assert.equal(plan.movement.status, 'planned');
    assert.match(plan.movement.movement_ref, /sale:CMD-1/);
  });

  it('applySourceImpactFromSaleLines documente stock_movement_planned', async () => {
    const updates = [];
    await applySourceImpactFromSaleLines({
      handlers: {
        onUpdateStock: async () => ({ id: 'STK-1' }),
        onUpdateItem: async (id, patch) => updates.push({ id, patch }),
      },
      orderItems: [{
        id: 'LI-1',
        source_type: 'stock',
        source_id: 'STK-1',
        quantity: 1,
        line_total: 1000,
      }],
      order: { id: 'CMD-1', farm_id: FARM_A.id },
      orderId: 'CMD-1',
      stocks: [{ id: 'STK-1', quantite: 10, categorie: 'recolte', produit: 'Maïs' }],
    });
    assert.ok(updates.some((u) => u.patch.stock_movement_ready === true));
  });

  it('planStockMovementsForOrder multi-lignes', () => {
    const plans = planStockMovementsForOrder({
      order: { id: 'CMD-2' },
      orderItems: [{ id: 'LI-1', source_impact_applied: true }],
      appliedPatches: [{ itemId: 'LI-1', patchPlan: { id: 'STK-2', module: 'stock' } }],
    });
    assert.equal(plans.length, 1);
  });
});

describe('Commercial V2 P1 — non-régression V1 farm_id', () => {
  it('prepareCommercialSaleCommit conserve farm_id sur commande', () => {
    const { records } = prepareCommercialSaleCommit({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'service',
        product_name: 'Service',
        quantity: 1,
        unit: 'forfait',
        unit_price: 1000,
        payment_status: 'paye',
        invoice_issued: true,
      },
      orderId: 'CMD-FARM-V2',
      clientLabel: 'Client',
      explicitFarmId: FARM_A.id,
    });
    assert.equal(records.order.farm_id, FARM_A.id);
    assert.equal(records.items[0].farm_id, FARM_A.id);
  });
});
