import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBySemanticPhrases, scoreSemanticSimilarity } from '../../src/services/assistantSemanticMatcher.js';
import { SEMANTIC_INTENT_CATALOG } from '../../src/services/assistantBusinessQuestions.js';

test('scores similar stock phrases', () => {
  const score = scoreSemanticSimilarity('que contient mon magasin', 'qu ai-je en magasin');
  assert.ok(score > 0.2);
});

test('classifies stock variants semantically', () => {
  const variants = [
    'mon stock',
    'qu est-ce qu il me reste',
    'que contient mon magasin',
    'ai-je encore de l aliment',
    'que puis-je vendre',
  ];
  for (const phrase of variants) {
    const hit = classifyBySemanticPhrases(phrase, SEMANTIC_INTENT_CATALOG, { minScore: 0.22 });
    assert.ok(hit, `expected intent for: ${phrase}`);
    const stockOrSell = ['stock_overview', 'stock_remain', 'stock_aliment', 'stock_sellable', 'stock_ruptures', 'sell_today'];
    assert.ok(stockOrSell.includes(hit.intent), `unexpected intent ${hit.intent} for ${phrase}`);
  }
});

test('classifies farm overview', () => {
  const hit = classifyBySemanticPhrases('comment va la ferme', SEMANTIC_INTENT_CATALOG, { minScore: 0.22 });
  assert.equal(hit?.intent, 'farm_overview');
});
