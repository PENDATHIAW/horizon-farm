import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyUniversalIntent,
  isQuestionIntent,
  normalizeAgriculturalText,
} from '../../src/services/assistantUniversalIntents.js';

test('normalizes agricultural text with accents and punctuation', () => {
  const q = normalizeAgriculturalText('Qu\'est-ce qu\'il me reste ?');
  assert.match(q, /reste/);
});

test('comment va la ferme maps to farm overview not greeting', () => {
  const hit = classifyUniversalIntent('comment va la ferme ?');
  assert.equal(hit?.intent, 'farm_overview');
});

test('quelles priorités maps to today priorities', () => {
  const hit = classifyUniversalIntent('quelles priorités ?');
  assert.equal(hit?.intent, 'today_priorities');
});

test('objectif atteint maps to progress status', () => {
  const hit = classifyUniversalIntent('objectif atteint ?');
  assert.equal(hit?.intent, 'progress_status');
});

test('bonjour remains greeting', () => {
  const hit = classifyUniversalIntent('bonjour');
  assert.equal(hit?.intent, 'greeting');
});

test('mes ventes maps to ventes', () => {
  const hit = classifyUniversalIntent('mes ventes?');
  assert.equal(hit?.intent, 'ventes');
});

test('recognizes declarer vs question', () => {
  const declarer = classifyUniversalIntent('j ai vendu 5 poulets');
  assert.equal(declarer?.family, 'DECLARER');
  const question = classifyUniversalIntent('combien de bovins ?');
  assert.ok(isQuestionIntent(question));
});
