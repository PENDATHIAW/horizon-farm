import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOfflineMutation,
  CONFLICT_STRATEGY,
  markConflict,
  MUTATION_STATUS,
  resolveQueuedConflict,
  rowVersion,
} from '../../src/services/offlineMutationModel.js';

const conflicted = () => markConflict(
  buildOfflineMutation({
    moduleKey: 'stock', action: 'update', id: 'S1',
    payload: { qte: 5, note: 'local' },
    baseRow: { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' },
  }),
  'ligne_modifiee_cote_serveur',
);

const serverRow = { id: 'S1', qte: 9, note: 'serveur', zone: 'A', updated_at: '2026-02-02T00:00:00Z' };

test('stratégie serveur : la mutation locale est abandonnée', () => {
  assert.deepEqual(resolveQueuedConflict(conflicted(), CONFLICT_STRATEGY.SERVER, serverRow), { drop: true });
});

test('stratégie client : la valeur locale est conservée, réalignée sur le serveur pour ne pas reconflicter', () => {
  const { mutation } = resolveQueuedConflict(conflicted(), CONFLICT_STRATEGY.CLIENT, serverRow);
  assert.deepEqual(mutation.payload, { qte: 5, note: 'local' });
  assert.equal(mutation.status, MUTATION_STATUS.REPAIRED);
  assert.equal(mutation.base_version, rowVersion(serverRow));
  assert.equal(mutation.attempts, 0);
  assert.equal(mutation.conflict_reason, undefined);
});

test('stratégie fusion : les champs locaux s’appliquent sur la ligne serveur', () => {
  const { mutation } = resolveQueuedConflict(conflicted(), CONFLICT_STRATEGY.MERGE, serverRow);
  // note/qte viennent du local ; zone (non touchée) reste du serveur
  assert.equal(mutation.payload.qte, 5);
  assert.equal(mutation.payload.note, 'local');
  assert.equal(mutation.payload.zone, 'A');
  assert.equal(mutation.status, MUTATION_STATUS.REPAIRED);
});

test('après résolution client, la mutation réparée n’est plus en conflit face au même serveur', () => {
  const { mutation } = resolveQueuedConflict(conflicted(), CONFLICT_STRATEGY.CLIENT, serverRow);
  // base_version = version serveur courante => un rejeu ne détecte plus de conflit.
  assert.equal(mutation.base_version, rowVersion(serverRow));
});
