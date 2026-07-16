import assert from 'node:assert/strict';
import test from 'node:test';
import { filterLegacyBootstrapRows, isLegacyBootstrapRow } from '../../src/utils/legacyBootstrapData.js';

test('reconnaît uniquement les journaux œufs injectés par l’ancien schéma', () => {
  const seed = {
    id: 'PROD001',
    lot_id: 'LOTPO001',
    date: '2026-05-05',
    oeufs_produits: 398,
    notes: 'Production normale',
  };

  assert.equal(isLegacyBootstrapRow('production_oeufs_logs', seed), true);
  assert.equal(isLegacyBootstrapRow('production_oeufs_logs', { ...seed, oeufs_produits: 399 }), false);
});

test('le mode réel retire les seeds mais conserve les vraies saisies', () => {
  const rows = [
    { id: 'PROD005', lot_id: 'LOTPO002', date: '2026-05-06', oeufs_produits: 326, notes: 'Production stable' },
    { id: 'PROD-REAL-1', lot_id: 'LOT-1', date: '2026-07-16', oeufs_produits: 24, notes: 'Saisie terrain' },
  ];

  assert.deepEqual(filterLegacyBootstrapRows('production_oeufs_logs', rows), [rows[1]]);
});

test('reconnaît aussi la variante historique dont la note était absente', () => {
  const seedWithoutNote = {
    id: 'PROD002',
    lot_id: 'LOTPO001',
    date: '2026-05-06',
    oeufs_produits: 412,
    notes: null,
  };

  assert.equal(isLegacyBootstrapRow('production_oeufs_logs', seedWithoutNote), true);
});

test('une ligne réelle réutilisant un ancien identifiant reste visible si sa signature diffère', () => {
  const realRow = { id: 'PROD001', lot_id: 'MON-LOT', date: '2026-07-16', oeufs_produits: 12, notes: 'Ma saisie' };
  assert.deepEqual(filterLegacyBootstrapRows('production_oeufs_logs', [realRow]), [realRow]);
});
