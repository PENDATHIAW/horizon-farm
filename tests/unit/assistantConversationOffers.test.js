import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferOfferFromAnswer,
  buildPendingFollowUp,
  resolveAffirmativeOffer,
} from '../../src/services/assistantConversationOffers.js';
import { createConversationContext, updateConversationContext } from '../../src/services/assistantConversationContext.js';
import { routeNaturalLanguageQuery } from '../../src/services/assistantLanguageRouter.js';

const dm = {
  finances: [{ type: 'recette', montant: 100000 }, { type: 'depense', montant: 80000 }],
  salesOrders: [{ id: 'HF-CMD-010', total: 500000, client_name: 'Grossiste Dakar Œufs' }],
  payments: [],
  clients: [{ nom: 'Grossiste Dakar Œufs' }],
  meteo: { temp: 26, condition: 'Couvert', humidite: 78, riskLevel: 'stable' },
  objectifs: [{ label: 'CA mensuel', target: 1000000, current: 600000 }],
};

test('inferOfferFromAnswer detects client detail offer', () => {
  const offer = inferOfferFromAnswer({
    action: 'Je peux détailler le client le plus urgent si vous voulez.',
  });
  assert.equal(offer?.intent, 'receivable_follow_up');
});

test('inferOfferFromAnswer detects progressive detail offer', () => {
  const offer = inferOfferFromAnswer({
    situation: 'Résumé court.',
    action: 'Souhaitez-vous le détail ?',
  });
  assert.equal(offer?.kind, 'progressive');
});

test('buildPendingFollowUp stores progressive full text', () => {
  const pending = buildPendingFollowUp(
    { action: 'Souhaitez-vous le détail ?' },
    'Texte complet très long pour le détail progressif.',
  );
  assert.equal(pending?.kind, 'progressive');
  assert.match(pending?.fullText || '', /complet/);
});

test('resolveAffirmativeOffer maps vas-y to pending intent', () => {
  const ctx = {
    ...createConversationContext(),
    pendingFollowUp: { kind: 'intent', intent: 'farm_risks', label: 'Risques' },
  };
  const resolved = resolveAffirmativeOffer('vas y', ctx);
  assert.equal(resolved?.type, 'intent');
  assert.equal(resolved?.intent, 'farm_risks');
});

test('resolveAffirmativeOffer maps oui to progressive text', () => {
  const ctx = {
    ...createConversationContext(),
    pendingFollowUp: { kind: 'progressive', fullText: 'Détail complet des priorités.' },
  };
  const resolved = resolveAffirmativeOffer('oui', ctx);
  assert.equal(resolved?.type, 'text');
  assert.match(resolved?.text || '', /priorités/i);
});

test('updateConversationContext clears pending after fulfillment', () => {
  const ctx = {
    ...createConversationContext(),
    pendingFollowUp: { kind: 'intent', intent: 'farm_risks' },
  };
  const next = updateConversationContext(ctx, { query: 'vas y', intent: 'farm_risks' });
  assert.equal(next.pendingFollowUp, null);
});

test('vas-y after farm overview offer returns risks not repeat overview', () => {
  let ctx = createConversationContext();
  const overview = routeNaturalLanguageQuery('comment va la ferme', { dataMap: dm, conversationContext: ctx });
  assert.equal(overview?.handled, true);
  ctx = overview.updatedContext || ctx;
  assert.ok(ctx.pendingFollowUp || ctx.memory?.topReceivable, 'should store an offer or receivable memory');

  const follow = routeNaturalLanguageQuery('vas y', { dataMap: dm, conversationContext: ctx });
  assert.equal(follow?.handled, true);
  const situation = follow?.answer?.situation || '';
  assert.ok(situation.length > 0);
  assert.doesNotMatch(situation, /Dans l'ensemble, la ferme fonctionne correctement/);
});

test('variant formulations route same as canonical question', () => {
  const canonical = routeNaturalLanguageQuery('quelle est la météo', { dataMap: dm });
  const variant = routeNaturalLanguageQuery('meteo', { dataMap: dm });
  assert.equal(canonical?.handled, true);
  assert.equal(variant?.handled, true);
  assert.match(variant?.answer?.situation || variant?.assistantText || '', /26|couvert|météo|meteo/i);
});
