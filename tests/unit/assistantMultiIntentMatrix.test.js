import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_MULTI_INTENT_MATRIX,
  classifyCompositeQuery,
  splitCompositeQuery,
} from '../../src/services/assistantMultiIntentMatrix.js';

test('splits composite queries on et + question', () => {
  const parts = splitCompositeQuery('combien ai-je de poulets et quel est mon stock d\'aliment ?');
  assert.ok(parts.length >= 2);
});

test('classifies multi-intent commercial + decision', () => {
  const result = classifyCompositeQuery('quels clients me doivent de l\'argent et que puis-je leur vendre ?');
  assert.ok(result.isComposite);
  const intents = result.intents.map((item) => item.intent);
  assert.ok(intents.includes('receivables') || intents.includes('relances'));
  assert.ok(intents.includes('sell_today') || intents.includes('today_priorities'));
});

test('classifies treasury + objectif composite', () => {
  const result = classifyCompositeQuery('quelle est ma trésorerie et mon objectif du mois ?');
  const intents = result.intents.map((item) => item.intent);
  assert.ok(intents.includes('treasury'));
  assert.ok(intents.some((intent) => intent.includes('goal') || intent === 'progress_status'));
});

test('documents composite examples matrix', () => {
  assert.equal(ASSISTANT_MULTI_INTENT_MATRIX.length, 4);
});
