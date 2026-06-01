import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommercialFilterOptions,
  clientFilterKey,
  clientFilterLabel,
  filterCommercialChartRows,
} from '../../src/modules/commercial/commercialChartFilters.js';

test('clientFilterKey utilise client_id ou walkin', () => {
  assert.equal(clientFilterKey({ client_id: 'CLI-1' }), 'CLI-1');
  assert.equal(clientFilterKey({ client_nom: 'Marché' }), 'walkin:marché');
});

test('buildCommercialFilterOptions agrège clients, activités et produits', () => {
  const options = buildCommercialFilterOptions({
    clients: [{ id: 'CLI-1', nom: 'Alpha' }],
    salesOrders: [
      { id: 'CMD-1', client_id: 'CLI-1', product_name: 'Plateaux', activity_key: 'oeufs' },
      { id: 'CMD-2', client_nom: 'Passage', produit: 'Poulet' },
    ],
  });
  assert.ok(options.clients.some((c) => c.value === 'CLI-1'));
  assert.ok(options.products.some((p) => p.value === 'Plateaux'));
  assert.ok(options.products.some((p) => p.value === 'Poulet'));
  assert.ok(options.activities.length >= 1);
});

test('filterCommercialChartRows filtre par client, activité et produit', () => {
  const rows = [
    { id: 'CMD-1', client_id: 'CLI-1', product_name: 'Plateaux', source_label: 'oeufs' },
    { id: 'CMD-2', client_id: 'CLI-2', product_name: 'Poulet', source_label: 'poulets_chair' },
  ];
  const byClient = filterCommercialChartRows(rows, { clientId: 'CLI-1' });
  assert.equal(byClient.length, 1);
  assert.equal(byClient[0].id, 'CMD-1');

  const byProduct = filterCommercialChartRows(rows, { productName: 'Poulet' });
  assert.equal(byProduct.length, 1);
  assert.equal(byProduct[0].id, 'CMD-2');
});

test('clientFilterLabel résout le nom client', () => {
  const label = clientFilterLabel({ client_id: 'CLI-1' }, [{ id: 'CLI-1', nom: 'Alpha Farm' }]);
  assert.equal(label, 'Alpha Farm');
});
