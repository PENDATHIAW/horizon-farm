import test from 'node:test';
import assert from 'node:assert/strict';
import { toConversationalAnswer } from '../../src/services/assistantConversationalTone.js';
import {
  formatConversationalHorizonAnswer,
  formatCompactHorizonAnswer,
  formatStrategicHorizonAnswer,
} from '../../src/services/assistantResponseFormatter.js';

test('toConversationalAnswer weaves SCA into natural prose', () => {
  const result = toConversationalAnswer({
    situation: 'Vous avez 150 bovins sur l\'exploitation.',
    cause: '12 d\'entre eux suivent encore un traitement.',
    action: 'Gardez un œil sur les animaux sous traitement cette semaine.',
    sources: ['computeFarmHeadcount', 'sante'],
  });
  assert.match(result.prose, /150 bovins/);
  assert.match(result.prose, /traitement/);
  assert.doesNotMatch(result.prose, /Situation/i);
  assert.doesNotMatch(result.prose, /^Cause/i);
  assert.match(result.displayText, /Élevage/);
});

test('formatCompactHorizonAnswer avoids visible SCA labels', () => {
  const text = formatCompactHorizonAnswer({
    situation: 'CA 2 400 000 FCFA.',
    cause: '3 commandes avec solde client.',
    action: 'Relancez les créances prioritaires.',
    sources: ['buildConsolidatedCommercialKpis'],
  });
  assert.doesNotMatch(text, /^Situation\s*:/m);
  assert.match(text, /CA|relanc|créances|commandes/i);
});

test('formatStrategicHorizonAnswer stays conversational', () => {
  const text = formatStrategicHorizonAnswer({
    situation: 'Trésorerie positive.',
    cause: 'Encaissements récents.',
    action: 'Sécuriser les achats critiques.',
    sources: ['consolidateFinance'],
  });
  assert.doesNotMatch(text, /^Situation/m);
  assert.match(text, /Trésorerie positive/);
  assert.match(text, /Finance/);
});

test('formatDraftAssistantText sounds human', () => {
  const text = formatConversationalHorizonAnswer({
    situation: 'D\'accord — j\'ai préparé une vente (poulet, 10).',
    cause: 'C\'est ce que j\'ai compris de votre phrase.',
    action: 'Jetez un œil au récapitulatif ci-dessous, puis validez si tout est bon.',
    sources: ['Carnet Horizon'],
  });
  assert.match(text, /préparé|vente/i);
  assert.doesNotMatch(text, /^Action\s*:/m);
});
