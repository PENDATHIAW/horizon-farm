import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFarmOverviewAnswer } from '../../src/services/assistantFarmOverview.js';
import { formatConversationalHorizonAnswer } from '../../src/services/assistantResponseFormatter.js';

const baseData = {
  salesOrdersAll: [{ id: 'o1', client_id: 'c1', montant_total: 5000, total_amount: 5000, statut: 'ouverte' }],
  paymentsAll: [],
  clients: [{ id: 'c1', nom: 'Client A' }],
  stocks: [{ id: 1, produit: 'Aliment', quantite: 10, seuil: 2 }],
  animaux: [{ id: 'a1', status: 'actif', type: 'bovin' }],
  lots: [{ effectif: 100, statut: 'actif' }],
  cultures: [{ culture: 'Tomate', record_type: 'parcelle', statut: 'actif' }],
};

test('buildFarmOverviewAnswer sounds like a farm director', () => {
  const answer = buildFarmOverviewAnswer(baseData);
  const text = formatConversationalHorizonAnswer(answer);
  assert.match(text, /Dans l'ensemble la ferme se porte bien/i);
  assert.doesNotMatch(text, /Situation/i);
  assert.doesNotMatch(text, /buildConsolidatedCommercialKpis/i);
  assert.doesNotMatch(text, /—/);
});
