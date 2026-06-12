import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TERRAIN_PHRASE_BUNDLES,
  mergeTerrainPhrasesIntoCatalog,
} from '../../src/services/assistantTerrainPhrases.js';
import { MODULE_BUSINESS_QUESTIONS } from '../../src/services/assistantBusinessQuestions.js';
import { classifyUniversalIntent } from '../../src/services/assistantUniversalIntents.js';
import { enrichTerrainAnswer } from '../../src/services/assistantTerrainAnswers.js';
import { routeFarmTool } from '../../src/services/assistantFarmTools.js';

test('terrain phrase bundles are merged into module catalog', () => {
  assert.ok(TERRAIN_PHRASE_BUNDLES.length >= 30);
  const sample = TERRAIN_PHRASE_BUNDLES.find((b) => b.intent === 'lot_mortality');
  const elevage = MODULE_BUSINESS_QUESTIONS.elevage.find((e) => e.intent === 'lot_mortality');
  assert.ok(elevage?.phrases.includes(sample.phrases[0]));
});

test('whatsapp-style phrases classify to expected intents', () => {
  const cases = [
    { phrase: '5 poulets sont morts aujourd hui dans le lot chair', intent: 'lot_mortality' },
    { phrase: 'qui me doit encore', intent: 'receivables' },
    { phrase: 'il me reste combien en caisse', intent: 'treasury' },
    { phrase: 'il reste des sacs d aliment', intent: 'stock_aliment' },
    { phrase: 'livraisons superette du jour', intent: 'deliveries_overview' },
  ];
  for (const { phrase, intent } of cases) {
    const hit = classifyUniversalIntent(phrase);
    assert.ok(hit, `no intent for: ${phrase}`);
    assert.equal(hit.intent, intent, `phrase: ${phrase}`);
  }
});

test('enrichTerrainAnswer adds follow-up offer for commercial intents', () => {
  const base = {
    title: 'Ventes',
    situation: 'Vous avez réalisé 100 000 FCFA de chiffre d\'affaires.',
    cause: '',
    action: '',
    confidence: 90,
  };
  const enriched = enrichTerrainAnswer(base, 'ventes', {}, { query: 'whatsapp ventes' });
  assert.equal(enriched.terrainEnriched, true);
  assert.match(enriched.action || '', /relancer|détail|vas-y/i);
  assert.equal(enriched.sourceChannel, 'terrain');
});

test('enrichTerrainAnswer marks terrain channel from query', () => {
  const enriched = enrichTerrainAnswer({
    title: 'Stock',
    situation: '5 sacs en stock.',
    action: '',
    confidence: 90,
  }, 'stock_aliment', {}, { query: 'whatsapp stock aliment' });
  assert.equal(enriched.sourceChannel, 'terrain');
  assert.equal(enriched.terrainEnriched, true);
});

test('routeFarmTool recognizes oral terrain formulations', () => {
  const route = routeFarmTool('orange money ventes ce matin', {});
  assert.ok(route);
  assert.ok(route.confidence >= 0.48);
  assert.equal(route.toolId, 'get_commercial_status');
});

test('mergeTerrainPhrasesIntoCatalog preserves base entries', () => {
  const merged = mergeTerrainPhrasesIntoCatalog({ dashboard: MODULE_BUSINESS_QUESTIONS.dashboard });
  assert.equal(merged.dashboard.length, MODULE_BUSINESS_QUESTIONS.dashboard.length);
});
