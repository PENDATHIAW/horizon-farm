import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIdempotencyKey,
  buildOfflineMutation,
  classifyReplayOutcome,
  CONFLICT_STRATEGY,
  isActionable,
  markConflict,
  markRepaired,
  markSent,
  MAX_ATTEMPTS,
  MUTATION_STATUS,
  registerFailure,
  resolveConflict,
  rowVersion,
} from '../../src/services/offlineMutationModel.js';

test('la clé d’idempotence est déterministe et ignore l’ordre des champs', () => {
  const a = buildIdempotencyKey({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5, nom: 'Maïs' } });
  const b = buildIdempotencyKey({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { nom: 'Maïs', qte: 5 } });
  assert.equal(a, b);
  const c = buildIdempotencyKey({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 6, nom: 'Maïs' } });
  assert.notEqual(a, c);
});

test('rowVersion privilégie updated_at, sinon une empreinte de contenu', () => {
  assert.equal(rowVersion({ id: 'A', updated_at: '2026-01-01T00:00:00Z' }), 't:2026-01-01T00:00:00Z');
  assert.equal(rowVersion(null), '');
  const v1 = rowVersion({ id: 'A', qte: 5 });
  const v2 = rowVersion({ id: 'A', qte: 5, updated_at: undefined });
  assert.equal(v1, v2); // champ volatil absent = même empreinte
  assert.notEqual(v1, rowVersion({ id: 'A', qte: 6 }));
});

test('une mutation versionnée capture clé, version de base et statut', () => {
  const m = buildOfflineMutation({
    moduleKey: 'stock', action: 'update', id: 'S1',
    payload: { qte: 5 }, baseRow: { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' }, now: 0,
  });
  assert.equal(m.status, MUTATION_STATUS.PENDING);
  assert.equal(m.base_version, 't:2026-01-01T00:00:00Z');
  assert.equal(m.attempts, 0);
  assert.ok(m.idempotency_key.startsWith('stock:update:S1:'));
  assert.equal(m.client_updated_at, '1970-01-01T00:00:00.000Z');
});

test('création : toujours appliquée (idempotence gérée par l’issue_key au niveau événement)', () => {
  const m = buildOfflineMutation({ moduleKey: 'stock', action: 'create', id: 'S9', payload: { qte: 1 } });
  assert.equal(classifyReplayOutcome({ mutation: m, currentServerRow: undefined }).outcome, 'apply');
});

test('mise à jour inchangée côté serveur : appliquée', () => {
  const base = { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' };
  const m = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 }, baseRow: base });
  const res = classifyReplayOutcome({ mutation: m, currentServerRow: base });
  assert.equal(res.outcome, 'apply');
});

test('deux appareils modifient la même ligne : le second rejeu détecte un conflit', () => {
  // Appareil A a vu la ligne à v1 hors ligne, puis appareil B a écrit v2 sur le serveur.
  const vuParA = { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' };
  const mutationA = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 }, baseRow: vuParA });
  const serveurApresB = { id: 'S1', qte: 9, updated_at: '2026-01-02T00:00:00Z' };
  const res = classifyReplayOutcome({ mutation: mutationA, currentServerRow: serveurApresB });
  assert.equal(res.outcome, 'conflict');
  assert.equal(res.reason, 'ligne_modifiee_cote_serveur');
});

test('règle conservatrice : sans version de base ou état serveur inconnu, on applique (comportement actuel)', () => {
  const sansBase = { moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 } };
  assert.equal(classifyReplayOutcome({ mutation: sansBase, currentServerRow: { id: 'S1', qte: 9 } }).outcome, 'apply');
  const m = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 }, baseRow: { id: 'S1', qte: 4, updated_at: 'x' } });
  assert.equal(classifyReplayOutcome({ mutation: m, currentServerRow: undefined }).outcome, 'apply');
});

test('suppression : sans effet si déjà supprimée, conflit si la ligne a changé', () => {
  const base = { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' };
  const del = buildOfflineMutation({ moduleKey: 'stock', action: 'delete', id: 'S1', baseRow: base });
  assert.equal(classifyReplayOutcome({ mutation: del, currentServerRow: null }).outcome, 'noop');
  assert.equal(classifyReplayOutcome({ mutation: del, currentServerRow: base }).outcome, 'apply');
  const modifiee = { id: 'S1', qte: 12, updated_at: '2026-02-02T00:00:00Z' };
  assert.equal(classifyReplayOutcome({ mutation: del, currentServerRow: modifiee }).outcome, 'conflict');
});

test('mise à jour d’une ligne supprimée entre-temps : recréation appliquée', () => {
  const base = { id: 'S1', qte: 4, updated_at: '2026-01-01T00:00:00Z' };
  const m = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 }, baseRow: base });
  assert.equal(classifyReplayOutcome({ mutation: m, currentServerRow: null }).outcome, 'apply');
});

test('résolution de conflit : serveur abandonne, client force, fusion combine', () => {
  const mutation = { payload: { qte: 5, note: 'local' } };
  const serverRow = { id: 'S1', qte: 9, note: 'serveur', zone: 'A' };
  assert.deepEqual(resolveConflict(CONFLICT_STRATEGY.SERVER, { mutation, serverRow }), { drop: true });
  assert.deepEqual(resolveConflict(CONFLICT_STRATEGY.CLIENT, { mutation, serverRow }), { payload: { qte: 5, note: 'local' } });
  assert.deepEqual(
    resolveConflict(CONFLICT_STRATEGY.MERGE, { mutation, serverRow }),
    { payload: { id: 'S1', qte: 5, note: 'local', zone: 'A' } },
  );
});

test('cycle de statut : envoyée, conflit puis réparée', () => {
  const m = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 } });
  assert.equal(markSent(m).status, MUTATION_STATUS.SENT);
  const enConflit = markConflict(m, 'ligne_modifiee_cote_serveur');
  assert.equal(enConflit.status, MUTATION_STATUS.CONFLICT);
  assert.equal(enConflit.conflict_reason, 'ligne_modifiee_cote_serveur');
  assert.equal(markRepaired(enConflit).status, MUTATION_STATUS.REPAIRED);
});

test('échecs techniques répétés : rejetée au plafond, reprise possible avant', () => {
  let m = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 } });
  for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
    m = registerFailure(m, 'réseau');
    assert.equal(m.status, MUTATION_STATUS.PENDING, `tentative ${i} reste rejouable`);
    assert.ok(isActionable(m));
  }
  m = registerFailure(m, 'réseau');
  assert.equal(m.attempts, MAX_ATTEMPTS);
  assert.equal(m.status, MUTATION_STATUS.REJECTED);
  assert.equal(isActionable(m), false);
});

test('reprise après crash : les mutations en attente et réparées restent à rejouer, pas les autres', () => {
  const base = buildOfflineMutation({ moduleKey: 'stock', action: 'update', id: 'S1', payload: { qte: 5 } });
  assert.equal(isActionable(base), true);
  assert.equal(isActionable(markRepaired(base)), true);
  assert.equal(isActionable(markSent(base)), false);
  assert.equal(isActionable(markConflict(base)), false);
});
