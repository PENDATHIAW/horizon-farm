/**
 * Lot B : rejeu hors ligne idempotent.
 *
 * Simule le rejeu de la file hors ligne pour une vente, une réception (stock) et
 * une distribution d'aliment, DEUX FOIS chacune, et vérifie qu'un seul effet
 * inter-modules (business_event) est créé — la seconde passe est dédupliquée par
 * issue_key.
 *
 * Exécution : node --test tests/unit/offlineReplayIdempotency.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReplayEvents,
  selectionnerNouveauxEvenements,
  dedupeFileHorsLigne,
  withStableIssueKey,
} from '../../src/services/offlineReplayEvents.js';
import { getOfflineRecordId } from '../../src/services/offlineQueueService.js';

/** Rejoue une file (avec doublons éventuels) et accumule les effets réellement créés. */
function rejouerFile(file, effetsExistants = []) {
  let effets = [...effetsExistants];
  for (const item of dedupeFileHorsLigne(file)) {
    if (item.action !== 'create' && item.action !== 'update') continue;
    const candidats = buildReplayEvents(item.moduleKey, item.action, item.payload, item.previousRow || null);
    const { nouveaux, connus } = selectionnerNouveauxEvenements(candidats, effets);
    effets = connus;
    item._effetsCrees = nouveaux.length;
  }
  return effets;
}

const vente = { moduleKey: 'sales_orders', action: 'create', id: 'V1', payload: { id: 'V1', type_document: 'vente', client_id: 'C1', montant_total: 50000 } };
const reception = { moduleKey: 'stock', action: 'create', id: 'S1', payload: { id: 'S1', produit: 'Aliment pondeuse', quantite: 40, seuil: 10, unite: 'kg', prixunit: 350 } };
const distribution = { moduleKey: 'alimentation_logs', action: 'create', id: 'A1', payload: { id: 'A1', type_cible: 'lot_avicole', lot_id: 'LOT-A', categorie: 'aliment', quantite: 12, unite: 'kg', montant_total: 4200, date: '2026-07-13' } };

test('chaque opération produit un événement à clé stable et déterministe', () => {
  for (const op of [vente, reception, distribution]) {
    const e1 = buildReplayEvents(op.moduleKey, op.action, op.payload);
    const e2 = buildReplayEvents(op.moduleKey, op.action, op.payload);
    assert.ok(e1.length >= 1, `${op.id} : aucun événement construit`);
    assert.equal(e1[0].issue_key, e2[0].issue_key, `${op.id} : issue_key non déterministe`);
    assert.ok(e1[0].issue_key, `${op.id} : issue_key vide`);
  }
});

test('rejeu de la vente deux fois = un seul effet', () => {
  const effets = rejouerFile([vente, vente]);
  const pourVente = effets.filter((e) => String(e.entity_id) === 'V1');
  assert.equal(pourVente.length, 1, 'la vente rejouée a créé plus d\'un effet');
});

test('rejeu de la réception deux fois = un seul effet', () => {
  const effets = rejouerFile([reception, reception]);
  const pourStock = effets.filter((e) => String(e.entity_id) === 'S1');
  assert.equal(pourStock.length, 1, 'la réception rejouée a créé plus d\'un effet');
});

test('rejeu de la distribution deux fois = un seul effet', () => {
  const effets = rejouerFile([distribution, distribution]);
  const pourAlim = effets.filter((e) => String(e.entity_id).includes('LOT-A') || String(e.entity_id) === 'A1');
  assert.equal(pourAlim.length, 1, 'la distribution rejouée a créé plus d\'un effet');
});

test('rejeu complet de la file entière deux fois = un seul effet par opération', () => {
  const file = [vente, reception, distribution];
  // Première synchro
  const apres1 = rejouerFile(file);
  const n1 = apres1.length;
  // Seconde synchro (file rejouée, réseau instable) : aucun nouvel effet
  const apres2 = rejouerFile(file, apres1);
  assert.equal(apres2.length, n1, 'le rejeu de la file a créé des effets en double');
  assert.equal(n1 >= 3, true, 'chaque opération doit avoir produit au moins un effet la première fois');
});

test('la file hors ligne est dédupliquée par (module, action, id)', () => {
  const file = dedupeFileHorsLigne([vente, vente, reception]);
  assert.equal(file.length, 2);
});

test('la file utilise l’identifiant de la donnée et non celui de l’attente', () => {
  const file = dedupeFileHorsLigne([
    { ...vente, id: 'OFF-1', recordId: 'V1', payload: { ...vente.payload, montant_total: 40000 } },
    { ...vente, id: 'OFF-2', recordId: 'V1', payload: { ...vente.payload, montant_total: 50000 } },
  ]);
  assert.equal(file.length, 1);
  assert.equal(getOfflineRecordId(file[0]), 'V1');
  assert.equal(file[0].payload.montant_total, 50000);
});

test('les anciennes attentes retrouvent l’identifiant dans leur contenu', () => {
  assert.equal(getOfflineRecordId({ id: 'OFF-ANCIEN', payload: { id: 'S42' } }), 'S42');
});

test('withStableIssueKey préserve une clé déjà présente', () => {
  const e = withStableIssueKey({ event_type: 'vente', entity_id: 'V9', title: 'x', issue_key: 'fixe-123' });
  assert.equal(e.issue_key, 'fixe-123');
});
