import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCentreDecisionAnswer } from '../../src/services/assistantCentreDecisionAnswers.js';
import { buildAssistantClarifyResponse } from '../../src/services/assistantClarifyResponse.js';
import { detectCommercialPilotageQuery } from '../../src/services/heyHorizonCommercialAnswers.js';
import { centreHeyHorizonPresets } from '../../src/utils/centreHeyHorizon.js';

const mockDataMap = {
  finances: [{ type: 'recette', montant: 200000 }],
  sales_orders: [{ total: 80000, statut: 'devis', client_nom: 'Client A' }],
  payments: [],
  stock: [{ nom: 'Aliment', quantite: 12 }],
  animaux: [{ espece: 'bovin', statut: 'actif' }],
  lots: [{ nom: 'Lot chair', statut: 'actif' }],
  cultures: [],
  clients: [{ nom: 'Client A' }],
  taches: [{ title: 'Equipe matin', statut: 'ouvert', module: 'rh' }],
  business_events: [{ title: 'Vente oeufs', event_type: 'vente' }],
  documents: [{ nom: 'Rapport CA' }],
};

test('buildCentreDecisionAnswer — priorités avec lien centre', () => {
  const answer = buildCentreDecisionAnswer('today_priorities', mockDataMap);
  assert.ok(answer);
  assert.equal(answer.centreLinked, true);
  assert.equal(answer.navigation?.moduleId, 'centre_ia');
  assert.match(answer.situation || '', /conseille|priorit|aujourd/i);
});

test('buildCentreDecisionAnswer — risque principal', () => {
  const answer = buildCentreDecisionAnswer('main_risk', mockDataMap);
  assert.ok(answer);
  assert.equal(answer.tab, 'Risques');
});

test('buildCentreDecisionAnswer — recommandations centre', () => {
  const answer = buildCentreDecisionAnswer('centre_recommendations', mockDataMap);
  assert.ok(answer);
  assert.match(answer.situation || '', /recommand|axe|centre/i);
});

test('centreHeyHorizonPresets exposes 6 quick asks', () => {
  const presets = centreHeyHorizonPresets();
  assert.equal(presets.length, 6);
  assert.ok(presets.some((p) => p.id === 'main_risk'));
});

test('clarify guides ambiguous single-word queries', () => {
  const clarify = buildAssistantClarifyResponse('client', mockDataMap);
  assert.ok(clarify?.answer?.action);
  assert.match(clarify.answer.action, /relancer|doit|client/i);
});

test('commercial pilotage detects devis and livraisons', () => {
  assert.equal(detectCommercialPilotageQuery('devis en attente'), 'quotes_pending');
  assert.equal(detectCommercialPilotageQuery('livraisons du jour'), 'deliveries_today');
});
