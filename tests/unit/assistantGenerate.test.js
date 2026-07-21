import test from 'node:test';
import assert from 'node:assert/strict';
import { runGenerate } from '../../lib/server/assistant/generate.js';
import { callClaudeModel } from '../../src/services/aiGateway/modelClient.js';

const okGenerate = async ({ prompt, schema }) => (
  schema
    ? { ok: true, source: 'model', text: 'resume', data: { text: 'resume', score: 3 }, model: 'test' }
    : { ok: true, source: 'model', text: `Bonjour ${prompt}`, data: null, model: 'test' }
);

test('prompt manquant : 400 sans appel au modèle', async () => {
  let called = false;
  const out = await runGenerate({ prompt: '  ' }, { configured: true, generate: async () => { called = true; return {}; } });
  assert.equal(out.status, 400);
  assert.equal(out.payload.ok, false);
  assert.equal(called, false, 'le modèle n\'est pas sollicité');
});

test('clé absente : 503 unconfigured (le client retombera sur le repli)', async () => {
  const out = await runGenerate({ prompt: 'salut' }, { configured: false, generate: async () => ({ ok: true, text: 'x' }) });
  assert.equal(out.status, 503);
  assert.equal(out.payload.source, 'unconfigured');
});

test('génération texte : 200 avec text renvoyé tel quel', async () => {
  const out = await runGenerate({ prompt: 'client X', system: 'Tu es assistant' }, { configured: true, generate: okGenerate });
  assert.equal(out.status, 200);
  assert.equal(out.payload.ok, true);
  assert.equal(out.payload.source, 'model');
  assert.match(out.payload.text, /client X/);
  assert.equal(out.payload.data, null);
});

test('génération structurée : data JSON transmis', async () => {
  const out = await runGenerate({ prompt: 'resume moi', schema: { type: 'object' } }, { configured: true, generate: okGenerate });
  assert.equal(out.status, 200);
  assert.equal(out.payload.data.score, 3);
  assert.equal(out.payload.text, 'resume');
});

test('modèle en échec : 502 error', async () => {
  const out = await runGenerate({ prompt: 'salut' }, { configured: true, generate: async () => ({ ok: false, error: 'LLM HTTP 500' }) });
  assert.equal(out.status, 502);
  assert.equal(out.payload.source, 'error');
  assert.match(out.payload.error, /500/);
});

test('exception réseau : 502 error, jamais de throw qui remonte', async () => {
  const out = await runGenerate({ prompt: 'salut' }, { configured: true, generate: async () => { throw new Error('boom'); } });
  assert.equal(out.status, 502);
  assert.equal(out.payload.source, 'error');
});

test('réponse vide : 502 empty', async () => {
  const out = await runGenerate({ prompt: 'salut' }, { configured: true, generate: async () => ({ ok: true, text: '', data: null }) });
  assert.equal(out.status, 502);
  assert.equal(out.payload.source, 'empty');
});

// --- Contrat de bout en bout : le client parle vraiment à cet endpoint ---

const fetchThroughHandler = (deps) => async (_url, opts) => {
  const body = JSON.parse(opts.body);
  const { status, payload } = await runGenerate(body, deps);
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
};

test('callClaudeModel + runGenerate : contrat respecté (source model, text)', async () => {
  const out = await callClaudeModel({
    prompt: 'Grossiste Dakar',
    fetchImpl: fetchThroughHandler({ configured: true, generate: okGenerate }),
  });
  assert.equal(out.ok, true);
  assert.equal(out.source, 'model');
  assert.match(out.text, /Grossiste Dakar/);
});

test('callClaudeModel : endpoint non configuré => repli propre côté client', async () => {
  const out = await callClaudeModel({
    prompt: 'test',
    fetchImpl: fetchThroughHandler({ configured: false, generate: okGenerate }),
  });
  assert.equal(out.ok, false);
  assert.equal(out.source, 'error');
  assert.equal(out.text, '');
});
