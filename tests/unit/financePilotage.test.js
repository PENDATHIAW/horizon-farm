import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOperationalChargeRedirect,
  enrichFinanceTransaction,
  isAutomaticFinanceTransaction,
  isManualExceptionFinanceTransaction,
  ORIGIN_TYPES,
  resolveOriginType,
  splitTreasuryTransactions,
} from '../../src/utils/financeTransactionMeta.js';
import {
  buildFinanceFromPaymentRepair,
  buildFinanceReconciliationRows,
  reconciliationWouldDuplicate,
} from '../../src/utils/financeReconciliation.js';
import { buildPaidFinanceRow } from '../../src/utils/saleSideEffects.js';
import { findExistingFinanceForPayment } from '../../src/services/salesIntegrityService.js';
import { isStockableFinanceTransaction } from '../../src/utils/stockPurchaseWorkflow.js';

describe('financeTransactionMeta', () => {
  it('résout origin_type workflow pour encaissement vente', () => {
    const row = enrichFinanceTransaction(
      { created_from: 'record_sale_payment', side_effects_managed: true, source_module: 'ventes' },
      { origin_type: ORIGIN_TYPES.WORKFLOW, source_record_id: 'VTE-1' },
    );
    assert.equal(resolveOriginType(row), ORIGIN_TYPES.WORKFLOW);
    assert.ok(row.issue_key.includes('ventes'));
  });

  it('charge manuelle frais divers reste manual', () => {
    const row = enrichFinanceTransaction(
      { type: 'sortie', libelle: 'Frais bureau', categorie: 'divers' },
      { origin_type: ORIGIN_TYPES.MANUAL },
    );
    assert.equal(isManualExceptionFinanceTransaction(row), true);
    assert.equal(isAutomaticFinanceTransaction(row), false);
  });

  it('redirige aliment et médicament hors finance', () => {
    const feed = classifyOperationalChargeRedirect({ type: 'sortie', libelle: 'Achat aliment poulet' });
    assert.equal(feed?.module, 'achats_stock');
    const med = classifyOperationalChargeRedirect({ type: 'sortie', categorie: 'vaccin' });
    assert.equal(med?.module, 'sante');
    const misc = classifyOperationalChargeRedirect({ type: 'sortie', libelle: 'Frais transport' });
    assert.equal(misc, null);
  });

  it('sépare trésorerie auto vs manuel', () => {
    const txs = [
      { id: '1', montant: 100, created_from: 'sale_side_effects', source_module: 'ventes', side_effects_managed: true },
      { id: '2', montant: 50, origin_type: 'manual', type: 'sortie' },
    ];
    const { automatic, manualException } = splitTreasuryTransactions(txs);
    assert.equal(automatic.length, 1);
    assert.equal(manualException.length, 1);
  });
});

describe('financeReconciliation', () => {
  it('paiement client peut créer finance sans doublon', () => {
    const payment = { id: 'PAY-1', order_id: 'VTE-9', montant: 25000, date_paiement: '2026-06-01', moyen_paiement: 'wave' };
    const order = { id: 'VTE-9', client_nom: 'Amadou' };
    const built = buildFinanceFromPaymentRepair({ payment, order, transactions: [] });
    assert.equal(built.duplicate, false);
    assert.equal(built.row.origin_type, ORIGIN_TYPES.WORKFLOW);
    assert.equal(built.row.payment_id, 'PAY-1');

    const txs = [built.row];
    const dup = buildFinanceFromPaymentRepair({ payment, order, transactions: txs });
    assert.equal(dup.duplicate, true);
    assert.ok(reconciliationWouldDuplicate('payment_without_finance', { payment, transactions: txs }));
  });

  it('dépense stockable détectée pour rapprochement stock', () => {
    const tx = { id: 'FIN-1', type: 'sortie', montant: 10000, libelle: 'Achat provende', categorie: 'aliment' };
    assert.equal(isStockableFinanceTransaction(tx), true);
    const rows = buildFinanceReconciliationRows({
      transactions: [tx],
      payments: [],
      salesOrders: [],
      stocks: [],
    });
    assert.equal(rows.some((r) => r.kind === 'stockable_without_stock'), true);
  });

  it('findExistingFinanceForPayment évite doublon rapprochement', () => {
    const orderId = 'VTE-100';
    const paymentId = 'PAY-100';
    const row = buildPaidFinanceRow({
      orderId,
      paymentId,
      amount: 5000,
      date: '2026-06-02',
      clientLabel: 'Test',
    });
    const found = findExistingFinanceForPayment({
      orderId,
      paymentId,
      amount: 5000,
      transactions: [row],
      date: '2026-06-02',
      method: 'especes',
    });
    assert.ok(found);
  });
});
