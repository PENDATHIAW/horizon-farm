import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateClientSettlement,
  consolidateFinance,
  isValidatedSale,
} from '../../src/utils/financeConsolidationEngine.js';

test('le chiffre d’affaires reconnaît uniquement les ventes validées', () => {
  const orders = [
    { id: 'draft', montant_total: 50000, statut: 'brouillon' },
    { id: 'pending', montant_total: 30000, statut: 'en_attente' },
    { id: 'valid', montant_total: 80000, statut: 'validee' },
    { id: 'legacy', montant_total: 20000 },
  ];
  const result = consolidateFinance({ salesOrders: orders });
  assert.equal(result.caConsolide, 100000);
  assert.equal(isValidatedSale(orders[0]), false);
  assert.equal(isValidatedSale(orders[2]), true);
});

test('un paiement client ne crée pas de chiffre d’affaires sans vente validée', () => {
  const result = consolidateFinance({
    salesOrders: [{ id: 'draft', montant_total: 50000, statut: 'brouillon' }],
    payments: [{ id: 'pay', order_id: 'draft', montant: 50000, statut: 'paye' }],
  });
  assert.equal(result.caConsolide, 0);
  assert.equal(result.cashEncaisse, 0);
});

test('les créances client ignorent les brouillons', () => {
  const settlement = calculateClientSettlement(
    { id: 'client-1' },
    [
      { id: 'draft', client_id: 'client-1', montant_total: 40000, statut: 'brouillon' },
      { id: 'valid', client_id: 'client-1', montant_total: 90000, statut: 'validee' },
    ],
    [{ order_id: 'valid', montant: 30000 }],
  );
  assert.equal(settlement.total, 90000);
  assert.equal(settlement.paid, 30000);
  assert.equal(settlement.remaining, 60000);
});

test('encaissement client et paiement fournisseur restent deux flux distincts', () => {
  const result = consolidateFinance({
    salesOrders: [{ id: 'sale', montant_total: 100000, statut: 'validee' }],
    payments: [{ id: 'client-payment', order_id: 'sale', montant: 70000, statut: 'paye' }],
    transactions: [{ id: 'supplier-payment', type: 'sortie', montant: 25000, statut: 'paye', categorie: 'fournisseur' }],
  });
  assert.equal(result.cashEncaisse, 70000);
  assert.equal(result.chargesPayees, 25000);
  assert.equal(result.cashNet, 45000);
});
