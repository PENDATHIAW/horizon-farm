import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ENTRY_KINDS,
  PAYMENT_STATUS,
  computePurchaseAmounts,
  financeTransactionHasStockLink,
  isStockableFinanceTransaction,
  prepareStockPurchaseWorkflow,
} from '../../src/utils/stockPurchaseWorkflow.js';

describe('stockPurchaseWorkflow', () => {
  it('achat payé prépare stock, mouvement, finance et document', () => {
    const preview = prepareStockPurchaseWorkflow({
      produit: 'Aliment poulet',
      quantite: 10,
      prix_unitaire: 5000,
      statut_paiement: PAYMENT_STATUS.PAYE,
      fournisseur_id: 'FOUR-1',
      proof_url: 'https://example.com/facture.pdf',
      date: '2026-06-01',
    }, { stocks: [], suppliers: [{ id: 'FOUR-1', dettes: 0 }] });

    assert.equal(preview.workflow_type, 'stock_purchase');
    assert.ok(preview.records.stock_patch);
    assert.ok(preview.records.movement_event);
    assert.ok(preview.records.finance);
    assert.equal(preview.records.finance.montant, 50000);
    assert.ok(preview.records.document);
    assert.equal(preview.records.supplier_patch, null);
  });

  it('achat à crédit prépare dette fournisseur sans finance', () => {
    const preview = prepareStockPurchaseWorkflow({
      produit: 'Semences',
      quantite: 5,
      prix_unitaire: 2000,
      statut_paiement: PAYMENT_STATUS.A_PAYER,
      fournisseur_id: 'FOUR-2',
    }, { stocks: [], suppliers: [{ id: 'FOUR-2', dettes: 1000 }] });

    assert.equal(preview.records.finance, null);
    assert.ok(preview.records.supplier_patch);
    assert.equal(preview.records.supplier_patch.dettes, 11000);
  });

  it('achat partiel prépare finance partielle et dette restante', () => {
    const preview = prepareStockPurchaseWorkflow({
      produit: 'Engrais',
      quantite: 2,
      prix_unitaire: 15000,
      statut_paiement: PAYMENT_STATUS.PARTIEL,
      montant_paye: 10000,
      fournisseur_id: 'FOUR-3',
    }, { stocks: [], suppliers: [{ id: 'FOUR-3', dettes: 0 }] });

    assert.equal(preview.records.finance.montant, 10000);
    assert.equal(preview.records.supplier_patch.dettes, 20000);
  });

  it('stock initial / don / correction sans finance automatique', () => {
    for (const entry_kind of [ENTRY_KINDS.STOCK_INITIAL, ENTRY_KINDS.DON, ENTRY_KINDS.CORRECTION]) {
      const preview = prepareStockPurchaseWorkflow({
        produit: 'Test',
        quantite: 3,
        prix_unitaire: 1000,
        entry_kind,
        statut_paiement: PAYMENT_STATUS.PAYE,
      }, { stocks: [] });
      assert.equal(preview.records.finance, null, entry_kind);
    }
  });

  it('isStockableFinanceTransaction et lien stock', () => {
    const tx = { id: 'TRX-1', type: 'sortie', libelle: 'Achat aliment', categorie: 'Stock' };
    assert.equal(isStockableFinanceTransaction(tx), true);
    assert.equal(financeTransactionHasStockLink({ ...tx, stock_id: 'STK-1' }, [{ id: 'STK-1' }]), true);
    const amounts = computePurchaseAmounts({ quantite: 2, prix_unitaire: 100, statut_paiement: PAYMENT_STATUS.PAYE });
    assert.equal(amounts.total, 200);
    assert.equal(amounts.paidAmount, 200);
  });
});
