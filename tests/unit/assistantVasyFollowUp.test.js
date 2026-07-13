import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationContext } from '../../src/services/assistantConversationContext.js';
import { routeNaturalLanguageQuery } from '../../src/services/assistantLanguageRouter.js';
import { shouldRouteToAssistant } from '../../src/services/assistantChatRouting.js';

const dm = {
  finances: [{ type: 'recette', montant: 100000 }],
  salesOrders: [{ id: 'HF-CMD-010', total: 500000, client_name: 'Grossiste Dakar Œufs' }],
  payments: [],
  clients: [{ nom: 'Grossiste Dakar Œufs' }],
  meteo: { temp: 26, condition: 'Couvert', humidite: 78, riskLevel: 'stable' },
};

test('vas y routes to assistant not voice parser', () => {
  assert.equal(shouldRouteToAssistant('vas y'), true);
});

test('vas y after bonjour returns client detail not farm repeat', () => {
  let ctx = createConversationContext();
  const greeting = routeNaturalLanguageQuery('bonjour', { dataMap: dm, conversationContext: ctx });
  assert.equal(greeting?.handled, true);
  ctx = greeting.updatedContext || ctx;

  const follow = routeNaturalLanguageQuery('vas y', { dataMap: dm, conversationContext: ctx });
  assert.equal(follow?.handled, true);
  assert.match(follow?.answer?.situation || '', /Grossiste|client|principal|concern/i);
  assert.doesNotMatch(follow?.answer?.situation || '', /Dans l'ensemble, la ferme fonctionne correctement/);
});
