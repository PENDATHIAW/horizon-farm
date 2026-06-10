import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applySourceImpactFromSaleLines,
  buildPaidFinanceRow,
  buildReceivableFinanceRow,
  financeIds,
  runNewSaleSideEffects,
} from '../../src/utils/saleSideEffects.js';
import { movementAlreadyExists } from '../../src/services/stockMovementHelpers.js';

describe('Commercial idempotence V1', () => {
  it('financeIds créance et encaissement déterministes', () => {
    assert.equal(financeIds.receivable('CMD-1'), financeIds.receivable('CMD-1'));
    assert.equal(financeIds.paid('CMD-1', 'PAY-1'), financeIds.paid('CMD-1', 'PAY-1'));
  });

  it('double encaissement : même id finance paid', () => {
    const row1 = buildPaidFinanceRow({ orderId: 'CMD-1', paymentId: 'PAY-1', amount: 1000, clientLabel: 'Client' });
    const row2 = buildPaidFinanceRow({ orderId: 'CMD-1', paymentId: 'PAY-1', amount: 1000, clientLabel: 'Client' });
    assert.equal(row1.id, row2.id);
  });

  it('double créance : même id finance receivable', () => {
    const row1 = buildReceivableFinanceRow({ orderId: 'CMD-2', amount: 5000, clientLabel: 'Client' });
    const row2 = buildReceivableFinanceRow({ orderId: 'CMD-2', amount: 5000, clientLabel: 'Client' });
    assert.equal(row1.id, row2.id);
  });

  it('ligne stock déjà impactée ignorée', async () => {
    const calls = { stock: 0 };
    const handlers = {
      onUpdateStock: async () => { calls.stock += 1; },
      existingStockMovements: [{ dedupe_key: 'stock-mvt:sale:CMD-1:stock:STK-1' }],
    };
    const result = await applySourceImpactFromSaleLines({
      handlers,
      orderItems: [
        { id: 'LINE-1', source_type: 'stock', source_id: 'STK-1', quantity: 5, source_impact_applied: true },
        { id: 'LINE-2', source_type: 'stock', source_id: 'STK-2', quantity: 3 },
      ],
      order: { id: 'CMD-1' },
      orderId: 'CMD-1',
      stocks: [{ id: 'STK-2', quantite: 20, categorie: 'produit_fini', vendable: true }],
    });
    assert.deepEqual(result.applied, ['LINE-2']);
    assert.ok(result.skipped.includes('LINE-1'));
    assert.equal(calls.stock, 1);
  });

  it('movementAlreadyExists bloque doublon mouvement stock', () => {
    const movements = [{ dedupe_key: 'stock-mvt:sale:CMD-1:stock:STK-1' }];
    assert.equal(movementAlreadyExists(movements, 'stock-mvt:sale:CMD-1:stock:STK-1'), true);
    assert.equal(movementAlreadyExists(movements, 'stock-mvt:sale:CMD-2:stock:STK-1'), false);
  });

  it('runNewSaleSideEffects ne recrée pas finance existante', async () => {
    const created = [];
    const trxId = financeIds.paid('CMD-99', 'PAY-99');
    await runNewSaleSideEffects({
      order: { id: 'CMD-99', montant_total: 10000, product_name: 'Test' },
      orderId: 'CMD-99',
      form: { payment_status: 'paye', payment_method: 'especes', date: '2026-06-01' },
      paid: 10000,
      remaining: 0,
      paymentId: 'PAY-99',
      transactions: [{ id: trxId, montant: 10000 }],
      handlers: {
        onCreateFinanceTransaction: async (row) => created.push(row.id),
      },
      skipSourceImpact: true,
    });
    assert.equal(created.length, 0);
  });
});
