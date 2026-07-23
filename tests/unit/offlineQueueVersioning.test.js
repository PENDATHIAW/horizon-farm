import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueOfflineMutation } from '../../src/services/offlineQueueService.js';
import { dedupeFileHorsLigne } from '../../src/services/offlineReplayEvents.js';
import { MUTATION_STATUS } from '../../src/services/offlineMutationModel.js';

// En Node, localStorage est absent : enqueue renvoie l'item construit sans le
// persister, ce qui suffit pour vérifier sa forme.

test('une mutation en file porte le recordId réel, une clé d’idempotence et une version de base', () => {
  const item = enqueueOfflineMutation({
    moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 },
    baseRow: { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' },
  });
  assert.equal(item.recordId, 'S1');
  assert.ok(item.id.startsWith('OFF-'), 'id = identifiant unique de file (clé React)');
  assert.notEqual(item.id, 'S1');
  assert.equal(item.status, MUTATION_STATUS.PENDING);
  assert.equal(item.attempts, 0);
  assert.equal(item.base_version, 't:2026-01-01T00:00:00Z');
  assert.ok(item.idempotency_key.startsWith('stock:update:S1:'));
});

test('la déduplication cible le recordId, pas l’identifiant unique de file', () => {
  // Deux écritures de la même ligne, mises en file séparément (id de file distincts).
  const a = enqueueOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 } });
  const b = enqueueOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 8 } });
  assert.notEqual(a.id, b.id);
  const deduped = dedupeFileHorsLigne([a, b]);
  assert.equal(deduped.length, 1, 'la même ligne ne doit apparaître qu’une fois');
  assert.equal(deduped[0].recordId, 'S1');
  assert.equal(deduped[0].payload.qte, 8, 'la dernière écriture l’emporte');
});

test('des lignes différentes ne sont pas fusionnées', () => {
  const a = enqueueOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 } });
  const b = enqueueOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S2', payload: { qte: 8 } });
  assert.equal(dedupeFileHorsLigne([a, b]).length, 2);
});
