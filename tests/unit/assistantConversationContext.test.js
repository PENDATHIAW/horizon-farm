import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversationContext,
  resolveFollowUp,
  updateConversationContext,
} from '../../src/services/assistantConversationContext.js';

test('resolves species follow-up after poulets question', () => {
  let ctx = createConversationContext();
  ctx = updateConversationContext(ctx, {
    query: 'combien ai-je de poulets ?',
    intent: 'headcount_poulets',
    family: 'ELEVAGE',
  });
  const follow = resolveFollowUp('et des bovins ?', ctx);
  assert.equal(follow?.forcedIntent, 'headcount_bovins');
});

test('resolves treatment follow-up for bovins context', () => {
  let ctx = createConversationContext();
  ctx = updateConversationContext(ctx, {
    query: 'combien de bovins ?',
    intent: 'headcount_bovins',
    family: 'ELEVAGE',
  });
  const follow = resolveFollowUp('et lesquels sont sous traitement ?', ctx);
  assert.equal(follow?.forcedIntent, 'animals_under_treatment');
});

test('resolves et sous traitement after poulets', () => {
  let ctx = createConversationContext();
  ctx = updateConversationContext(ctx, {
    query: 'combien de poulets ?',
    intent: 'headcount_poulets',
    family: 'ELEVAGE',
  });
  const follow = resolveFollowUp('et sous traitement ?', ctx);
  assert.equal(follow?.forcedIntent, 'animals_under_treatment');
});

test('ignores non follow-up without context', () => {
  const ctx = createConversationContext();
  assert.equal(resolveFollowUp('combien de bovins ?', ctx), null);
});

test('resolves ovins follow-up after bovins question', () => {
  let ctx = createConversationContext();
  ctx = updateConversationContext(ctx, {
    query: 'combien de bovins ?',
    intent: 'headcount_bovins',
    family: 'ELEVAGE',
  });
  const follow = resolveFollowUp('et les ovins ?', ctx);
  assert.equal(follow?.forcedIntent, 'headcount_ovins');
});

test('resolves ultra-short ventes without prior context', () => {
  const ctx = createConversationContext();
  const follow = resolveFollowUp('ventes ?', ctx);
  assert.equal(follow?.forcedIntent, 'ventes');
});
