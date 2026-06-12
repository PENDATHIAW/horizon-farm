import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeatherAnswer } from '../../src/services/assistantWeatherAnswer.js';

test('buildWeatherAnswer handles missing meteo gracefully', () => {
  const answer = buildWeatherAnswer('weather_now', {});
  assert.match(answer.situation, /pas encore de données météo/i);
});

test('buildWeatherAnswer surfaces risk and recommendations', () => {
  const answer = buildWeatherAnswer('weather_risk', {
    meteo: {
      temp: 36,
      humidite: 88,
      riskLevel: 'eleve',
      alerts: ['Chaleur: augmenter abreuvement.'],
      recommendations: ['Mettre l eau a volonte.'],
    },
  });
  assert.match(answer.situation, /élevé/i);
  assert.match(answer.cause, /Chaleur/i);
});
