import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_BUSINESS_QUESTIONS } from '../../src/services/assistantBusinessQuestions.js';
import { classifyUniversalIntent } from '../../src/services/assistantUniversalIntents.js';
import { buildWeatherAnswer } from '../../src/services/assistantWeatherAnswer.js';

/** Intents acceptés quand la formulation est ambiguë mais la réponse reste pertinente. */
const INTENT_ALIASES = Object.freeze({
  farm_overview: ['farm_status', 'farm_overview'],
  farm_opportunities: ['farm_opportunities', 'sell_today'],
  main_risk: ['main_risk', 'farm_risks', 'investor_summary'],
  annual_outlook: ['annual_outlook', 'annual_goal', 'progress_status'],
  growth: ['growth', 'farm_trends'],
  ca_progress: ['ca_progress', 'ventes', 'farm_trends'],
  top_client: ['top_client', 'commercial_summary'],
  relances: ['relances', 'follow_up'],
  stock_sellable: ['stock_sellable', 'sell_today'],
  today_priorities: ['today_priorities', 'activity_journal'],
});

function acceptsIntent(expected, actual) {
  if (expected === actual) return true;
  const aliases = INTENT_ALIASES[expected];
  return aliases ? aliases.includes(actual) : false;
}

const mockDataMap = {
  finances: [{ type: 'recette', montant: 100000 }],
  salesOrders: [{ total: 50000, date: new Date().toISOString().slice(0, 10) }],
  payments: [],
  stock: [{ nom: 'Aliment', quantite: 10 }],
  animaux: [{ espece: 'bovin', statut: 'actif' }],
  lots: [{ nom: 'Lot A', statut: 'actif' }],
  cultures: [{ nom: 'Tomates', statut: 'actif' }],
  clients: [{ nom: 'Client test' }],
  meteo: {
    temp: 32,
    humidite: 65,
    condition: 'Partiellement nuageux',
    windLabel: '12 km/h Est',
    riskLevel: 'stable',
    impact: 'Jour - Partiellement nuageux, chaud, vent 12 km/h Est.',
    recommendations: ['Conditions thermiques acceptables pour les routines terrain.'],
    source: 'senegal-default',
  },
};

test('every module question phrase classifies to a business intent', () => {
  const failures = [];
  for (const [moduleId, questions] of Object.entries(MODULE_BUSINESS_QUESTIONS)) {
    for (const entry of questions) {
      for (const phrase of entry.phrases) {
        const hit = classifyUniversalIntent(phrase);
        if (!hit) {
          failures.push({ moduleId, phrase, reason: 'no_intent' });
          continue;
        }
        if (!acceptsIntent(entry.intent, hit.intent)) {
          failures.push({
            moduleId,
            phrase,
            expected: entry.intent,
            got: hit.intent,
            reason: 'intent_mismatch',
          });
        }
      }
    }
  }
  assert.equal(
    failures.length,
    0,
    `Classification failures (${failures.length}):\n${failures.slice(0, 12).map((f) => JSON.stringify(f)).join('\n')}`,
  );
});

test('module question matrix covers all ERP sidebar modules without a 5-question cap', () => {
  const summary = Object.entries(MODULE_BUSINESS_QUESTIONS).map(([moduleId, questions]) => ({
    moduleId,
    entries: questions.length,
    phrases: questions.reduce((sum, q) => sum + q.phrases.length, 0),
  }));

  const totalPhrases = summary.reduce((sum, row) => sum + row.phrases, 0);
  assert.ok(totalPhrases >= 270, `expected full phrase matrix, got ${totalPhrases}`);
  assert.ok(summary.every((row) => row.entries === row.phrases || row.phrases >= row.entries));
  assert.ok(summary.find((row) => row.moduleId === 'elevage')?.phrases >= 50);
  assert.ok(summary.find((row) => row.moduleId === 'commercial')?.phrases >= 30);
});

test('weather questions return live meteo context when available', () => {
  const now = buildWeatherAnswer('weather_now', mockDataMap);
  assert.match(now.situation, /32°C/);
  assert.ok(now.action);

  const risk = buildWeatherAnswer('weather_risk', mockDataMap);
  assert.match(risk.situation, /stable/i);

  const forecast = buildWeatherAnswer('weather_forecast', mockDataMap);
  assert.ok(forecast.situation);
});

test('weather intents classify from natural phrases', () => {
  assert.equal(classifyUniversalIntent('quelle est la météo ?')?.intent, 'weather_now');
  assert.equal(classifyUniversalIntent('risque météo élevage')?.intent, 'weather_risk');
  assert.equal(classifyUniversalIntent('va t il pleuvoir')?.intent, 'weather_forecast');
});
