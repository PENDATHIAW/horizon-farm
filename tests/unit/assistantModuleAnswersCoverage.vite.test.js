import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_BUSINESS_QUESTIONS } from '../../src/services/assistantBusinessQuestions.js';
import { buildAgriculturalAnswer } from '../../src/services/assistantAgriculturalContext.js';

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

test('each unique catalog intent returns an agricultural answer', () => {
  const intents = new Set(
    Object.values(MODULE_BUSINESS_QUESTIONS).flat().map((q) => q.intent),
  );
  const missing = [];
  for (const intent of intents) {
    const answer = buildAgriculturalAnswer(intent, mockDataMap);
    if (!answer?.situation) missing.push(intent);
  }
  assert.equal(missing.length, 0, `missing answers for: ${missing.join(', ')}`);
});
