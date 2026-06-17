import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommercialModuleProjections,
  buildFinanceModuleProjections,
  buildStockModuleProjections,
  buildElevageModuleProjections,
  buildCulturesModuleProjections,
} from '../../src/utils/moduleProjections.js';

test('buildCommercialModuleProjections retourne CA projeté avec commandes', () => {
  const orders = [
    { id: 'SO-1', date: new Date().toISOString().slice(0, 10), montant_total: 500000, status: 'confirmed' },
    { id: 'SO-2', date: new Date().toISOString().slice(0, 10), montant_total: 300000, status: 'confirmed' },
  ];
  const result = buildCommercialModuleProjections({ salesOrdersAll: orders });
  assert.equal(result.hasData, true);
  assert.ok(result.items.some((item) => item.id === 'ca-projection' || item.id === 'ca-realized'));
});

test('buildStockModuleProjections signale les ruptures', () => {
  const result = buildStockModuleProjections({
    stocks: [{ id: 'STK-1', quantite: 2, seuil: 10 }],
    lowStock: [{ id: 'STK-1' }],
  });
  assert.equal(result.hasData, true);
  assert.equal(result.items[0].id, 'ruptures');
});

test('buildElevageModuleProjections projette les œufs sur 30 jours', () => {
  const weekAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const result = buildElevageModuleProjections({
    productionLogs: [{ date: weekAgo, oeufs_produits: 700 }],
    lots: [],
  });
  assert.equal(result.hasData, true);
  assert.ok(result.items.some((item) => item.id === 'eggs-30'));
});

test('buildCulturesModuleProjections détecte parcelles à surveiller', () => {
  const result = buildCulturesModuleProjections({
    cultures: [{ id: 'C-1', statut: 'stress hydrique' }],
  });
  assert.equal(result.hasData, true);
  assert.equal(result.items[0].id, 'parcels-watch');
});

test('buildFinanceModuleProjections accepte créances sans forecast', () => {
  const result = buildFinanceModuleProjections({ receivable: 150000 });
  assert.equal(result.hasData, true);
  assert.equal(result.items[0].id, 'receivables');
});
