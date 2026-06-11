import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTOR_INTENTS,
  buildReceivableFollowUpAnswer,
  resolveDirectorIntent,
} from '../../src/services/assistantDirectorEngines.js';

const topReceivable = {
  clientName: 'Grossiste Dakar Œufs',
  amount: 1490000,
  orderId: 'HF-CMD-010',
  delayDays: 12,
};

test('detects director intents before universal routing', () => {
  assert.equal(resolveDirectorIntent('comment va la ferme ?'), DIRECTOR_INTENTS.COMMENT_VA_LA_FERME);
  assert.equal(resolveDirectorIntent('quelles priorités ?'), DIRECTOR_INTENTS.PRIORITES_DU_JOUR);
  assert.equal(resolveDirectorIntent('objectif atteint ?'), DIRECTOR_INTENTS.OBJECTIF_STATUS);
  assert.equal(resolveDirectorIntent('quels risques ?'), DIRECTOR_INTENTS.RISQUES);
  assert.equal(
    resolveDirectorIntent('quel client ?', { lastIntent: 'receivables' }),
    DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP,
  );
});

test('answers receivable follow-up with named client from memory', () => {
  const answer = buildReceivableFollowUpAnswer({}, {
    memory: { topReceivable },
  });
  assert.match(answer.situation, /Grossiste Dakar/i);
  assert.match(answer.cause, /HF-CMD-010/);
  assert.match(answer.cause, /1[\s\u00a0]?490[\s\u00a0]?000/);
  assert.match(answer.action, /relancer/i);
});

test('receivable follow-up does not repeat generic receivables summary', () => {
  const answer = buildReceivableFollowUpAnswer({}, {
    memory: { topReceivable },
  });
  assert.doesNotMatch(answer.situation, /priorité Client/i);
  assert.doesNotMatch(answer.situation, /bonjour.*je suis là/i);
});
