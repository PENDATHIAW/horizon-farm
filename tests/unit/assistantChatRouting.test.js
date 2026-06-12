import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_BUSINESS_QUESTIONS } from '../../src/services/assistantBusinessQuestions.js';
import { shouldRouteToAssistant, isDeclarativeVoiceCommand } from '../../src/services/assistantChatRouting.js';

test('declarations terrain restent sur le parseur vocal', () => {
  assert.equal(isDeclarativeVoiceCommand('j ai vendu 10 poulets'), true);
  assert.equal(shouldRouteToAssistant('j ai vendu 10 poulets'), false);
});

test('questions j ai combien passent par l assistant', () => {
  assert.equal(shouldRouteToAssistant('j ai combien de poulets'), true);
  assert.equal(shouldRouteToAssistant('j ai combien de bovins'), true);
});

test('toutes les phrases du catalogue module passent par l assistant', () => {
  const misses = [];
  for (const [moduleId, questions] of Object.entries(MODULE_BUSINESS_QUESTIONS)) {
    for (const entry of questions) {
      for (const phrase of entry.phrases) {
        if (!shouldRouteToAssistant(phrase)) {
          misses.push({ moduleId, phrase, intent: entry.intent });
        }
      }
    }
  }
  assert.equal(misses.length, 0, `phrases non routées: ${JSON.stringify(misses)}`);
});
