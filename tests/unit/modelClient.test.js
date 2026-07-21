import test from 'node:test';
import assert from 'node:assert/strict';
import { callClaudeModel, isModelReachable } from '../../src/services/aiGateway/modelClient.js';
import { buildClaudeRelanceDrafter } from '../../src/services/aiGateway/commercialContentGenerator.js';
import { buildDailyRelanceBatch } from '../../src/services/relanceAutomation.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

const okFetch = (text) => async () => ({ ok: true, status: 200, json: async () => ({ text }) });
const failFetch = () => async () => ({ ok: false, status: 503, json: async () => ({}) });
const throwFetch = () => async () => { throw new Error('offline'); };

test('connecteur : réponse modèle exploitée', async () => {
  const r = await callClaudeModel({ prompt: 'salut', fetchImpl: okFetch('Bonjour, message généré.') });
  assert.equal(r.ok, true);
  assert.equal(r.source, 'model');
  assert.equal(r.text, 'Bonjour, message généré.');
  assert.equal(isModelReachable(r), true);
});

test('connecteur : sans prompt ou sans fetch = indisponible (pas d\'appel)', async () => {
  const noPrompt = await callClaudeModel({ prompt: '', fetchImpl: okFetch('x') });
  assert.equal(noPrompt.ok, false);
  assert.equal(noPrompt.source, 'unavailable');
});

test('connecteur : erreur serveur et hors-ligne échouent proprement', async () => {
  const err = await callClaudeModel({ prompt: 'x', fetchImpl: failFetch() });
  assert.equal(err.ok, false);
  assert.equal(err.status, 503);
  const off = await callClaudeModel({ prompt: 'x', fetchImpl: throwFetch() });
  assert.equal(off.ok, false);
  assert.equal(off.source, 'offline');
});

test('relance : le modèle rédige quand joignable', async () => {
  const drafter = buildClaudeRelanceDrafter({ fetchImpl: okFetch('Bonjour Grossiste, merci de régler 1 596 750 FCFA.') });
  const batch = await buildDailyRelanceBatch({ clients: seed.clients, orders: seed.sales_orders, payments: seed.payments, aiDrafter: drafter });
  assert.ok(batch.items.length >= 1);
  assert.ok(batch.items.every((i) => i.messageSource === 'ai'));
  assert.equal(batch.summary.aiDrafted, batch.items.length);
});

test('relance : repli déterministe automatique si le modèle est hors-ligne', async () => {
  const drafter = buildClaudeRelanceDrafter({ fetchImpl: throwFetch() });
  const batch = await buildDailyRelanceBatch({ clients: seed.clients, orders: seed.sales_orders, payments: seed.payments, aiDrafter: drafter });
  assert.ok(batch.items.length >= 1);
  assert.ok(batch.items.every((i) => i.messageSource === 'deterministic'), 'repli hors-ligne');
  assert.ok(batch.items.every((i) => i.message.length > 0), 'un message reste produit');
});
