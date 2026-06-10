import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGlobalProfitability } from '../../src/services/globalProfitabilityService.js';
import {
  findDuplicateFinanceTransaction,
  financeTransactionWouldDuplicate,
  enrichFinanceTransaction,
  ORIGIN_TYPES,
} from '../../src/utils/financeTransactionMeta.js';
import {
  shouldSkipHarvestFinanceForCommercialPath,
  buildCultureHarvestFinanceRow,
} from '../../src/utils/cultureSideEffects.js';
import {
  voidCultureHarvestFinanceOnSale,
  financeIds,
} from '../../src/utils/saleSideEffects.js';

test('P1-3 — caTotal = caConsolide sans max(payments)', () => {
  const profit = computeGlobalProfitability({
    transactions: [],
    salesOrders: [{ id: 'o1', montant_total: 80000 }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 120000 }],
  });
  assert.equal(profit.caTotal, 80000);
  assert.notEqual(profit.caTotal, 120000);
});

test('P1-4 — findDuplicateFinanceTransaction par id et issue_key', () => {
  const existing = enrichFinanceTransaction({
    id: 'TRX-PAY-P1',
    type: 'entree',
    montant: 1000,
    source_module: 'ventes',
    source_record_id: 'VTE-1',
    created_from: 'sale_side_effects',
    side_effects_managed: true,
  }, { origin_type: ORIGIN_TYPES.WORKFLOW });
  const txs = [existing];
  const dupById = findDuplicateFinanceTransaction({ id: 'TRX-PAY-P1', type: 'entree' }, txs);
  assert.equal(dupById?.id, 'TRX-PAY-P1');
  const dupBySource = findDuplicateFinanceTransaction({
    type: 'entree',
    source_module: 'ventes',
    source_record_id: 'VTE-1',
  }, txs);
  assert.equal(dupBySource?.id, 'TRX-PAY-P1');
  assert.equal(financeTransactionWouldDuplicate({
    type: 'entree',
    source_module: 'ventes',
    source_record_id: 'VTE-1',
  }, txs), true);
});

test('P1-5 — récolte commerciale sans écriture finance récolte', () => {
  const after = {
    id: 'CUL-1',
    quantite_recoltee: 100,
    quantite_vendue: 0,
    prix_vente_estime: 500,
    vendable: true,
  };
  const workflow = { opportunity: { statut: 'ouverte' } };
  assert.equal(shouldSkipHarvestFinanceForCommercialPath({ after, workflow }), true);
  const row = buildCultureHarvestFinanceRow({ culture: after, amount: 50000 });
  assert.equal(row.id, financeIds.cultureHarvest('CUL-1'));
});

test('P1-5 — voidCultureHarvestFinanceOnSale annule TRX-RECOLTE', async () => {
  const cultureId = 'CUL-9';
  const harvestId = financeIds.cultureHarvest(cultureId);
  const transactions = [{ id: harvestId, type: 'entree', montant: 30000, statut: 'a_encaisser' }];
  let updated = null;
  const result = await voidCultureHarvestFinanceOnSale({
    cultureId,
    transactions,
    handlers: {
      onUpdateFinanceTransaction: async (id, patch) => {
        updated = { id, patch };
      },
    },
  });
  assert.equal(result?.voided, true);
  assert.equal(updated.id, harvestId);
  assert.equal(updated.patch.statut, 'annule');
  assert.equal(updated.patch.montant, 0);
});
