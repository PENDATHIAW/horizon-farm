import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgressiveChatPayload,
  isDetailFollowUp,
} from '../../src/services/assistantProgressiveResponse.js';

test('buildProgressiveChatPayload summarizes long answers', () => {
  const longAnswer = {
    situation: 'Dans l\'ensemble la ferme se porte bien avec une activité soutenue sur le mois et des indicateurs globalement au vert sur l\'ensemble des filières.',
    cause: 'Les ventes progressent nettement, les encaissements suivent le rythme des livraisons et les stocks restent sous contrôle sur les principales références.',
    action: 'Deux créances méritent une relance aujourd\'hui pour sécuriser la trésorerie de fin de mois, et un lot avicole mérite un contrôle sanitaire rapide cette semaine.',
    sources: ['buildConsolidatedCommercialKpis'],
  };
  const payload = buildProgressiveChatPayload(longAnswer);
  assert.match(payload.text, /Souhaitez-vous le détail/i);
  assert.equal(payload.hasDetail, true);
  assert.match(payload.fullText, /créances|relance/i);
  assert.doesNotMatch(payload.text, /buildConsolidatedCommercialKpis/);
});

test('isDetailFollowUp recognizes affirmative detail requests', () => {
  assert.equal(isDetailFollowUp('oui'), true);
  assert.equal(isDetailFollowUp('donne moi le détail'), true);
  assert.equal(isDetailFollowUp('combien de bovins'), false);
});
