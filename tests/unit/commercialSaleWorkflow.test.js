import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommercialSaleRecords,
  buildFinanceRowForSalePayment,
  buildSaleIssueKey,
  computeSaleAmounts,
  normalizeSaleLines,
  PAYMENT_STATUS,
  validateCommercialSaleForm,
} from '../../src/utils/commercialSaleWorkflow.js';
import { buildCommercialSaleGapRows } from '../../src/utils/commercialSaleIntegrity.js';
import { findExistingFinanceForPayment } from '../../src/services/salesIntegrityService.js';
import { financeIds } from '../../src/utils/sideEffectIds.js';

const baseForm = (overrides = {}) => ({
  date: '2026-06-02',
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
  notes: '',
  ...overrides,
});

describe('commercialSaleWorkflow', () => {
  it('vente payée : montants et paiement complets', () => {
    const amounts = computeSaleAmounts(baseForm());
    assert.equal(amounts.paymentStatus, PAYMENT_STATUS.PAYE);
    assert.equal(amounts.paid, amounts.grandTotal);
    assert.equal(amounts.remaining, 0);
    const records = buildCommercialSaleRecords({ form: baseForm(), orderId: 'CMD-1', clientLabel: 'Amadou' });
    assert.ok(records.payment);
    assert.ok(records.invoice);
    assert.ok(records.items.length >= 1);
    assert.ok(records.issueKey.includes('CMD-1'));
  });

  it('vente partielle : reste à payer', () => {
    const amounts = computeSaleAmounts(baseForm({ payment_status: 'partiel', paid_amount: 2000 }));
    assert.equal(amounts.paymentStatus, PAYMENT_STATUS.PARTIEL);
    assert.equal(amounts.paid, 2000);
    assert.ok(amounts.remaining > 0);
    const records = buildCommercialSaleRecords({ form: baseForm({ payment_status: 'partiel', paid_amount: 2000 }), orderId: 'CMD-2' });
    assert.ok(records.payment);
    assert.equal(records.remaining, amounts.remaining);
  });

  it('vente crédit : pas de paiement immédiat', () => {
    const amounts = computeSaleAmounts(baseForm({ payment_status: 'non_paye' }));
    assert.equal(amounts.paid, 0);
    assert.ok(amounts.remaining > 0);
    const records = buildCommercialSaleRecords({ form: baseForm({ payment_status: 'non_paye' }), orderId: 'CMD-3' });
    assert.equal(records.payment, null);
  });

  it('vente stock : source_module stock', () => {
    const records = buildCommercialSaleRecords({ form: baseForm({ source_type: 'stock' }), orderId: 'CMD-4' });
    assert.equal(records.order.source_module, 'stock');
    assert.equal(records.items[0].source_type, 'stock');
  });

  it('vente animal : type animal', () => {
    const records = buildCommercialSaleRecords({
      form: baseForm({ source_type: 'animal', source_id: 'ANI-1', quantity: 1, unit: 'tête' }),
      orderId: 'CMD-5',
    });
    assert.equal(records.order.source_module, 'animaux');
  });

  it('vente lot avicole', () => {
    const records = buildCommercialSaleRecords({
      form: baseForm({ source_type: 'lot_avicole', source_id: 'LOT-1' }),
      orderId: 'CMD-6',
    });
    assert.equal(records.order.source_module, 'avicole');
  });

  it('vente culture', () => {
    const records = buildCommercialSaleRecords({
      form: baseForm({ source_type: 'culture', source_id: 'CUL-1', unit: 'kg' }),
      orderId: 'CMD-7',
    });
    assert.equal(records.order.source_module, 'cultures');
  });

  it('facture et document si demandés', () => {
    const records = buildCommercialSaleRecords({ form: baseForm({ invoice_issued: true }), orderId: 'CMD-8' });
    assert.ok(records.invoice);
    assert.ok(records.document);
    assert.equal(records.document.invoice_id, records.invoice.id);
  });

  it('livraison planifiée', () => {
    const records = buildCommercialSaleRecords({
      form: baseForm({ fulfillment_mode: 'a_livrer', delivery_fee: 1500 }),
      orderId: 'CMD-9',
    });
    assert.equal(records.delivery.statut, 'a_livrer');
    assert.equal(records.order.frais_livraison, 1500);
  });

  it('lignes multiples agrégées', () => {
    const lines = normalizeSaleLines({
      lines: [
        { product_name: 'A', quantity: 2, unit_price: 100 },
        { product_name: 'B', quantity: 1, unit_price: 50 },
      ],
    });
    assert.equal(lines.length, 2);
    const amounts = computeSaleAmounts({ lines, payment_status: 'paye' });
    assert.equal(amounts.productTotal, 250);
  });

  it('pas de double finance sur même paiement', () => {
    const orderId = 'CMD-10';
    const payId = 'PAY-10';
    const payment = { id: payId, order_id: orderId, montant: 5000, date_paiement: '2026-06-02', moyen_paiement: 'especes' };
    const order = { id: orderId, product_name: 'Test' };
    const row = buildFinanceRowForSalePayment({ payment, order });
    const dup = findExistingFinanceForPayment({
      orderId,
      paymentId: payId,
      amount: 5000,
      transactions: [row],
      date: '2026-06-02',
      method: 'especes',
    });
    assert.ok(dup);
    assert.equal(row.id, financeIds.paid(orderId, payId));
  });

  it('issue_key stable', () => {
    assert.equal(buildSaleIssueKey('CMD-X', 'payment:P1'), 'sale:ventes:CMD-X:payment:P1');
  });
});

describe('commercialSaleIntegrity', () => {
  it('détecte paiement sans finance', () => {
    const gaps = buildCommercialSaleGapRows({
      orders: [{ id: 'O1', montant_total: 5000, product_name: 'X' }],
      items: [{ order_id: 'O1', product_name: 'X', quantity: 1 }],
      payments: [{ id: 'P1', order_id: 'O1', montant: 5000, date_paiement: '2026-06-02' }],
      transactions: [],
    });
    assert.ok(gaps.some((g) => g.kind === 'payment_without_finance'));
  });

  it('détecte vente sans lignes', () => {
    const gaps = buildCommercialSaleGapRows({
      orders: [{ id: 'O2', montant_total: 1000, product_name: 'Y' }],
      items: [],
    });
    assert.ok(gaps.some((g) => g.kind === 'sale_without_lines'));
  });

  it('validation refuse client passage crédit', () => {
    const err = validateCommercialSaleForm(baseForm({
      client_id: 'client_passage',
      payment_status: 'non_paye',
    }), { walkInOnlyPaid: true });
    assert.ok(err);
  });
});
