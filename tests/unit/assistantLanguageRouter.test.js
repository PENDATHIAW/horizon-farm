import test from 'node:test';
import assert from 'node:assert/strict';
import { routeNaturalLanguageQuery } from '../../src/services/assistantLanguageRouter.js';
import { createConversationContext } from '../../src/services/assistantConversationContext.js';

const emptyDataMap = {
  animaux: [],
  lots: [],
  avicole: [],
  cultures: [],
  stock: [],
  stocks: [],
  clients: [],
  sales_orders: [],
  payments: [],
  finances: [],
};

test('handles greeting in natural language', () => {
  const result = routeNaturalLanguageQuery('bonjour', { dataMap: emptyDataMap });
  assert.equal(result.handled, true);
  assert.match(result.assistantText || '', /bonjour|exploitation|ferme/i);
});

test('handles stock question without commands', () => {
  const result = routeNaturalLanguageQuery('qu\'est-ce qu\'il me reste en magasin ?', { dataMap: emptyDataMap });
  assert.equal(result.handled, true);
  assert.ok(result.answer?.situation);
});

test('passes through declarer to draft flow', () => {
  const result = routeNaturalLanguageQuery('j\'ai vendu 120 oeufs ce matin', { dataMap: emptyDataMap });
  assert.notEqual(result.handled, true);
});

test('updates conversation context on answer', () => {
  const ctx = createConversationContext();
  const first = routeNaturalLanguageQuery('combien ai-je de poulets ?', { dataMap: emptyDataMap, conversationContext: ctx });
  assert.equal(first.handled, true);
  const second = routeNaturalLanguageQuery('et des bovins ?', {
    dataMap: emptyDataMap,
    conversationContext: first.updatedContext,
  });
  assert.equal(second.handled, true);
  assert.match(second.answer?.situation || '', /bovin/i);
});
