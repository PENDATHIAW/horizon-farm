import test from 'node:test';
import assert from 'node:assert/strict';
import { toConversationalAnswer } from '../../src/services/assistantConversationalTone.js';

test('softens imperative actions with colon not de + verb', () => {
  const { prose } = toConversationalAnswer({
    situation: 'Test.',
    action: 'Commencez par relancer Grossiste Dakar Œufs sur la commande HF-CMD-010.',
  });
  assert.match(prose, /Je vous suggère : commencez/i);
  assert.doesNotMatch(prose, /Je vous suggère de commencez/i);
});

test('softens maintenance actions naturally', () => {
  const { prose } = toConversationalAnswer({
    situation: 'Test.',
    action: 'Maintenez le rythme actuel et surveillez les encaissements.',
  });
  assert.match(prose, /Je vous suggère : maintenez/i);
  assert.doesNotMatch(prose, /Je vous suggère de maintenez/i);
});
