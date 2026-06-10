import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidateFinance, deriveBusinessCharges } from '../../src/utils/financeConsolidationEngine.js';
import { buildOfficialTreasuryView } from '../../src/utils/financePilotageCore.js';
import { computeGlobalProfitability } from '../../src/services/globalProfitabilityService.js';
import { buildStockLossFinanceRow } from '../../src/utils/purchaseSideEffects.js';

test('P0-5 — dettes fournisseurs exclues des charges dérivées', () => {
  const derived = deriveBusinessCharges({
    fournisseurs: [{ id: 'f1', dettes: 50000 }],
    animaux: [],
    lots: [],
    cultures: [],
    stocks: [],
  });
  assert.equal(derived.dettesFournisseurs, 50000);
  assert.equal(derived.total, 0);
});

test('P0-3 — stockValue via CMUP (summarizeStockValuation)', () => {
  const stocks = [{ id: 's1', quantite: 10, prix_unitaire: 100 }];
  const movements = [{
    stock_id: 's1',
    movement_type: 'entree',
    quantity: 10,
    movement_date: '2026-01-01',
    metadata: { unit_cost: 200, montant: 2000 },
  }];
  const finance = consolidateFinance({ stocks, stockMovements: movements, transactions: [] });
  assert.equal(finance.stockValue, 2000);
});

test('P0-4 — payablesTotal inclut dettes fournisseur et charges impayées', () => {
  const finance = consolidateFinance({
    transactions: [
      { id: 't1', type: 'sortie', montant: 15000, statut: 'a_payer', libelle: 'Charge fournisseur' },
    ],
    fournisseurs: [{ id: 'f1', dettes: 25000 }],
  });
  assert.equal(finance.payablesTotal, 40000);
  const treasury = buildOfficialTreasuryView({
    transactions: [
      { id: 't1', type: 'sortie', montant: 15000, statut: 'a_payer', libelle: 'Charge fournisseur' },
    ],
    fournisseurs: [{ id: 'f1', dettes: 25000 }],
  });
  assert.equal(treasury.payables, 40000);
});

test('P0-2 — CA rentabilité = caConsolide uniquement', () => {
  const profit = computeGlobalProfitability({
    transactions: [],
    salesOrders: [{ id: 'o1', montant_total: 100000 }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 200000 }],
  });
  assert.equal(profit.caTotal, 100000);
});

test('P0-3 — perte stock valorisée au CMUP', () => {
  const stock = { id: 's1', quantite: 20, prix_unitaire: 50 };
  const movements = [{
    stock_id: 's1',
    movement_type: 'entree',
    quantity: 20,
    movement_date: '2026-01-01',
    metadata: { unit_cost: 300, montant: 6000 },
  }];
  const row = buildStockLossFinanceRow({ stock, qty: 2, movements });
  assert.equal(row.montant, 600);
});
