import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEDGER_ANOMALY,
  auditStockLedgers,
  stockQuantityOf,
  verifyStockLedger,
} from '../../src/services/stockLedgerIntegrity.js';

// Fabrique un mouvement cohérent (solde après = solde avant + delta signé).
function mvt({ id, before, delta, type, at, dedupe, quantity }) {
  const after = before + delta;
  return {
    id,
    stock_id: 'S1',
    movement_type: type || (delta >= 0 ? 'entree' : 'sortie'),
    quantity: quantity ?? Math.abs(delta),
    stock_before: before,
    stock_after: after,
    stock_delta: delta,
    dedupe_key: dedupe || `dk-${id}`,
    created_at: at,
  };
}

test('une chaîne intègre ne signale aucune anomalie', () => {
  const movements = [
    mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' }),
    mvt({ id: 'm2', before: 100, delta: -30, type: 'sortie', at: '2026-01-02T08:00:00.000Z' }),
    mvt({ id: 'm3', before: 70, delta: -5, type: 'perte', at: '2026-01-03T08:00:00.000Z' }),
  ];
  const result = verifyStockLedger({ id: 'S1', quantite: 65 }, movements);
  assert.equal(result.ok, true);
  assert.equal(result.anomalies.length, 0);
  assert.equal(result.openingBalance, 0);
  assert.equal(result.closingBalance, 65);
});

test('l’ordre d’application est reconstitué depuis created_at (entrée désordonnée)', () => {
  const movements = [
    mvt({ id: 'm2', before: 100, delta: -30, type: 'sortie', at: '2026-01-02T08:00:00.000Z' }),
    mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' }),
  ];
  const result = verifyStockLedger({ id: 'S1', quantite: 70 }, movements);
  assert.equal(result.ok, true, JSON.stringify(result.anomalies));
});

test('rupture de chaîne : un maillon supprimé casse la continuité', () => {
  // Chaîne d’origine : m1 (0->100), m2 (100->70), m3 (70->65). m2 est supprimé :
  // m3 garde son solde avant de 70 alors que le maillon précédent survivant (m1)
  // laisse un solde après de 100.
  const movements = [
    mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' }),
    mvt({ id: 'm3', before: 70, delta: -5, type: 'perte', at: '2026-01-03T08:00:00.000Z' }),
  ];
  const result = verifyStockLedger({ id: 'S1', quantite: 65 }, movements);
  const chainBreaks = result.anomalies.filter((a) => a.type === LEDGER_ANOMALY.CHAIN_BREAK);
  assert.equal(chainBreaks.length, 1);
  assert.equal(chainBreaks[0].expectedBefore, 100);
  assert.equal(chainBreaks[0].foundBefore, 70);
});

test('delta incohérent : après - avant ne colle pas au delta déclaré', () => {
  const bad = { ...mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' }), stock_after: 90 };
  const result = verifyStockLedger({ id: 'S1', quantite: 90 }, [bad]);
  const mismatch = result.anomalies.filter((a) => a.type === LEDGER_ANOMALY.DELTA_MISMATCH);
  assert.ok(mismatch.some((a) => a.reason === 'delta_vs_solde'));
});

test('quantité incohérente : |delta| ne colle pas à la quantité du mouvement', () => {
  const bad = mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z', quantity: 80 });
  const result = verifyStockLedger({ id: 'S1', quantite: 100 }, [bad]);
  assert.ok(result.anomalies.some((a) => a.type === LEDGER_ANOMALY.DELTA_MISMATCH && a.reason === 'quantite_vs_delta'));
});

test('sens incohérent : une entrée avec un delta négatif est signalée', () => {
  const bad = mvt({ id: 'm1', before: 100, delta: -20, type: 'entree', at: '2026-01-01T08:00:00.000Z' });
  const result = verifyStockLedger({ id: 'S1', quantite: 80 }, [bad]);
  assert.ok(result.anomalies.some((a) => a.type === LEDGER_ANOMALY.DELTA_MISMATCH && a.reason === 'sens'));
});

test('solde final incohérent : le journal et la quantité de l’article divergent', () => {
  const movements = [mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' })];
  const result = verifyStockLedger({ id: 'S1', quantite: 90 }, movements);
  const balance = result.anomalies.filter((a) => a.type === LEDGER_ANOMALY.BALANCE_MISMATCH);
  assert.equal(balance.length, 1);
  assert.equal(balance[0].expectedBalance, 90);
  assert.equal(balance[0].foundBalance, 100);
});

test('doublon : deux mouvements partagent la même clé de dédoublonnage', () => {
  const movements = [
    mvt({ id: 'm1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z', dedupe: 'K1' }),
    mvt({ id: 'm2', before: 100, delta: 100, type: 'entree', at: '2026-01-01T09:00:00.000Z', dedupe: 'K1' }),
  ];
  const result = verifyStockLedger({ id: 'S1', quantite: 200 }, movements);
  const dup = result.anomalies.filter((a) => a.type === LEDGER_ANOMALY.DUPLICATE);
  assert.equal(dup.length, 1);
  assert.equal(dup[0].firstMovementId, 'm1');
  assert.equal(dup[0].movementId, 'm2');
});

test('tolérance flottante : les décimales de kg ne déclenchent pas de faux positif', () => {
  const movements = [
    mvt({ id: 'm1', before: 0, delta: 0.1, type: 'entree', at: '2026-01-01T08:00:00.000Z' }),
    mvt({ id: 'm2', before: 0.1, delta: 0.2, type: 'entree', at: '2026-01-02T08:00:00.000Z' }),
  ];
  // 0.1 + 0.2 = 0.30000000000000004 en flottant : la quantité stockée est 0.3.
  const result = verifyStockLedger({ id: 'S1', quantite: 0.3 }, movements);
  assert.equal(result.ok, true, JSON.stringify(result.anomalies));
});

test('stockQuantityOf lit quantite, quantity ou stock', () => {
  assert.equal(stockQuantityOf({ quantite: 12 }), 12);
  assert.equal(stockQuantityOf({ quantity: 7 }), 7);
  assert.equal(stockQuantityOf({ stock: 3 }), 3);
  assert.equal(stockQuantityOf({}), 0);
});

test('auditStockLedgers ne remonte que les articles porteurs d’anomalies', () => {
  const stocks = [
    { id: 'S1', quantite: 70 },
    { id: 'S2', quantite: 50 },
  ];
  const movements = [
    { ...mvt({ id: 'a1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' }), stock_id: 'S1' },
    { ...mvt({ id: 'a2', before: 100, delta: -30, type: 'sortie', at: '2026-01-02T08:00:00.000Z' }), stock_id: 'S1' },
    // S2 : solde final 40 alors que l’article déclare 50.
    { ...mvt({ id: 'b1', before: 0, delta: 40, type: 'entree', at: '2026-01-01T08:00:00.000Z' }), stock_id: 'S2' },
  ];
  const audit = auditStockLedgers(stocks, movements);
  assert.equal(audit.ok, false);
  assert.equal(audit.stocksAudited, 2);
  assert.equal(audit.stocksWithAnomalies, 1);
  assert.equal(audit.results[0].stockId, 'S2');
  assert.equal(audit.anomalyCounts[LEDGER_ANOMALY.BALANCE_MISMATCH], 1);
});

test('auditStockLedgers compte les mouvements orphelins (article absent)', () => {
  const stocks = [{ id: 'S1', quantite: 100 }];
  const movements = [
    { ...mvt({ id: 'a1', before: 0, delta: 100, type: 'entree', at: '2026-01-01T08:00:00.000Z' }), stock_id: 'S1' },
    { ...mvt({ id: 'z1', before: 0, delta: 10, type: 'entree', at: '2026-01-01T08:00:00.000Z' }), stock_id: 'GHOST' },
  ];
  const audit = auditStockLedgers(stocks, movements);
  assert.equal(audit.orphanMovements, 1);
  assert.equal(audit.ok, false);
});

test('un article sans mouvement est considéré intègre', () => {
  const result = verifyStockLedger({ id: 'S1', quantite: 0 }, []);
  assert.equal(result.ok, true);
  assert.equal(result.movementCount, 0);
});
