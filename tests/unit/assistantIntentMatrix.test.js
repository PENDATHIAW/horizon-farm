import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_INTENT_MATRIX,
  INTENT_FAMILIES,
  classifyAssistantIntent,
} from '../../src/services/assistantIntentMatrix.js';

test('classifies declarer intents', () => {
  assert.equal(classifyAssistantIntent("J'ai vendu 10 poulets").family, INTENT_FAMILIES.DECLARER);
  assert.equal(classifyAssistantIntent("J'ai vendu 10 poulets").intent, 'sale_record');
  assert.equal(classifyAssistantIntent('J\'ai récolté 50 kg de tomates').intent, 'culture_harvest');
  assert.equal(classifyAssistantIntent('Mortalité de 3 sujets lot B').intent, 'mortality_event');
});

test('classifies demander intents', () => {
  assert.equal(classifyAssistantIntent('Quelle est ma trésorerie ?').family, INTENT_FAMILIES.DEMANDER);
  assert.equal(classifyAssistantIntent('Quelle est ma trésorerie ?').intent, 'treasury');
  assert.equal(classifyAssistantIntent('Mes créances clients').intent, 'receivables');
  assert.equal(classifyAssistantIntent('Meilleur produit ce mois').intent, 'top_product');
});

test('classifies decider intents', () => {
  assert.equal(classifyAssistantIntent('Que faire aujourd\'hui ?').family, INTENT_FAMILIES.DECIDER);
  assert.equal(classifyAssistantIntent('Que faire aujourd\'hui ?').intent, 'today_actions');
  assert.equal(classifyAssistantIntent('Qui relancer cette semaine').intent, 'follow_up');
  assert.equal(classifyAssistantIntent('État de l\'exploitation').intent, 'investor_overview');
});

test('exports matrix with three families', () => {
  assert.deepEqual(Object.keys(ASSISTANT_INTENT_MATRIX), [
    INTENT_FAMILIES.DECLARER,
    INTENT_FAMILIES.DEMANDER,
    INTENT_FAMILIES.DECIDER,
  ]);
});
