import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_UNIVERSAL_INTENTS,
  UNIVERSAL_INTENT_FAMILIES,
  classifyUniversalIntent,
  normalizeAgriculturalText,
} from '../../src/services/assistantUniversalIntents.js';

test('normalizes agricultural text with accents and punctuation', () => {
  assert.equal(normalizeAgriculturalText('Qu\'est-ce qu\'il reste ?'), 'qu est ce qu il reste');
});

test('recognizes stock natural language variants', () => {
  const cases = [
    'mon stock',
    'etat du stock',
    'qu\'est-ce qu\'il me reste',
    'j\'ai quoi en magasin',
    'produits disponibles',
    'inventaire',
  ];
  for (const phrase of cases) {
    const hit = classifyUniversalIntent(phrase);
    assert.ok(hit, `expected stock intent for: ${phrase}`);
    assert.equal(hit.family, UNIVERSAL_INTENT_FAMILIES.STOCK);
  }
});

test('recognizes treasury natural language variants', () => {
  const cases = [
    'ma trésorerie',
    'combien j\'ai',
    'argent disponible',
    'situation financière',
    'combien en caisse',
  ];
  for (const phrase of cases) {
    const hit = classifyUniversalIntent(phrase);
    assert.ok(hit, `expected finance intent for: ${phrase}`);
    assert.equal(hit.family, UNIVERSAL_INTENT_FAMILIES.FINANCE);
  }
});

test('recognizes declarer vs question', () => {
  assert.equal(classifyUniversalIntent('j\'ai vendu des oeufs ce matin').intent, 'sale_record');
  assert.equal(classifyUniversalIntent('combien ai-je de poulets').intent, 'headcount_poulets');
  assert.equal(classifyUniversalIntent('bonjour').intent, 'greeting');
});

test('exports universal intent families', () => {
  assert.ok(ASSISTANT_UNIVERSAL_INTENTS[UNIVERSAL_INTENT_FAMILIES.ELEVAGE]);
  assert.ok(ASSISTANT_UNIVERSAL_INTENTS[UNIVERSAL_INTENT_FAMILIES.STOCK].length >= 4);
});

test('recognizes mes ventes, mes animaux, mes lots, quoi vendre', () => {
  assert.equal(classifyUniversalIntent('mes ventes').intent, 'ventes');
  assert.equal(classifyUniversalIntent('mes animaux').intent, 'my_animals');
  assert.equal(classifyUniversalIntent('mes lots').intent, 'lots_overview');
  assert.equal(classifyUniversalIntent('quoi vendre').intent, 'sell_today');
});

test('recognizes ultra-short domain tokens', () => {
  for (const phrase of ['ventes', 'stock', 'bovins', 'objectifs', 'tresorerie']) {
    const hit = classifyUniversalIntent(phrase);
    assert.ok(hit, `expected intent for: ${phrase}`);
  }
});
