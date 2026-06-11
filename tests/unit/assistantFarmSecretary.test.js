import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssistantFarmHeader,
  buildAssistantWelcomeMessage,
} from '../../src/services/assistantFarmSecretary.js';

const baseProps = {
  stocks: [{ id: 1, produit: 'Aliment', quantite: 10, seuil: 2 }],
  cultures: [{ culture: 'Tomate', record_type: 'parcelle', statut: 'actif' }],
  animaux: [{ status: 'actif', type: 'bovin' }],
  lots: [{ effectif: 100, statut: 'actif' }],
  salesOrdersAll: [{ id: 'o1', client_id: 'c1', montant_total: 5000, date: '2026-06-09' }],
  paymentsAll: [],
  clients: [{ id: 'c1', nom: 'Client A' }],
  businessEvents: [{ title: 'Vente HF-001', event_date: '2026-06-09', event_type: 'vente' }],
};

test('buildAssistantFarmHeader returns farm context lines', () => {
  const header = buildAssistantFarmHeader(baseProps);
  assert.equal(header.brandName, 'Horizon');
  assert.equal(header.tagline, 'Parlez à votre ferme');
  assert.match(header.statsLine, /animaux/);
  assert.match(header.statsLine, /parcelles/);
  assert.match(header.statsLine, /produits/);
  assert.match(header.lastActivityLine, /Dernière activité/);
});

test('buildAssistantWelcomeMessage greets with today bullets', () => {
  const welcome = buildAssistantWelcomeMessage('Penda', baseProps);
  assert.match(welcome.text, /Bonjour Penda/);
  assert.match(welcome.text, /aujourd'hui|calme/i);
  assert.match(welcome.text, /parle|faire/i);
  assert.equal(welcome.isWelcome, true);
});
