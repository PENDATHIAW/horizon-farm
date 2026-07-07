import test from 'node:test';
import assert from 'node:assert/strict';
import {
  becameBovinCoproductExit,
  emitBovinCoproductSideEffects,
  estimateBovinCoproductKg,
  isBovinAnimal,
} from '../../src/services/greenpreneurs/bovinCoproductWorkflow.js';
import { getStockCategoryOptions } from '../../src/utils/stockCategoryOptions.js';

test('isBovinAnimal — détecte bovins', () => {
  assert.equal(isBovinAnimal({ espece: 'bovin' }), true);
  assert.equal(isBovinAnimal({ type: 'Ovin' }), false);
});

test('becameBovinCoproductExit — transition vendu', () => {
  assert.equal(becameBovinCoproductExit(
    { espece: 'bovin', statut: 'actif' },
    { espece: 'bovin', statut: 'vendu' },
  ), true);
  assert.equal(becameBovinCoproductExit(
    { espece: 'bovin', statut: 'vendu' },
    { espece: 'bovin', statut: 'vendu' },
  ), false);
});

test('estimateBovinCoproductKg — scale avec poids carcasse', () => {
  const est = estimateBovinCoproductKg({ poids_carcasse: 360 });
  assert.ok(est.suifKg > 0);
  assert.ok(est.osKg > 0);
  assert.equal(est.sourceType, 'erp_real');
});

test('emitBovinCoproductSideEffects — crée events sans stock par défaut', async () => {
  const events = [];
  const stocks = [];
  const opportunities = [];
  const result = await emitBovinCoproductSideEffects({
    animal: { id: 'B1', espece: 'bovin', nom: 'Taureau 1', poids_carcasse: 200 },
    animalId: 'B1',
    handlers: {
      onCreateBusinessEvent: async (payload) => { events.push(payload); },
      onCreateStock: async (payload) => { stocks.push(payload); },
      onCreateOpportunity: async (payload) => { opportunities.push(payload); },
    },
    context: { businessEvents: [], opportunities: [] },
  });
  assert.equal(result.emitted, true);
  assert.equal(result.traceOnly, true);
  assert.equal(result.stockCreated, false);
  assert.equal(events.length, 3);
  assert.equal(stocks.length, 0);
  assert.equal(opportunities.length, 2);
});

test('emitBovinCoproductSideEffects — stock si createCoproductStock', async () => {
  const stocks = [];
  const result = await emitBovinCoproductSideEffects({
    animal: { id: 'B3', espece: 'bovin', nom: 'Bœuf 3' },
    createCoproductStock: true,
    handlers: {
      onCreateBusinessEvent: async () => {},
      onCreateStock: async (payload) => { stocks.push(payload); },
    },
    context: { businessEvents: [], opportunities: [] },
    skipOpportunities: true,
  });
  assert.equal(result.stockCreated, true);
  assert.equal(stocks.length, 2);
});

test('emitBovinCoproductSideEffects — idempotent par animal', async () => {
  let count = 0;
  const existing = [{ entity_id: 'B2', event_type: 'coproduit_bovin_collecte' }];
  const result = await emitBovinCoproductSideEffects({
    animal: { id: 'B2', espece: 'bovin' },
    handlers: {
      onCreateBusinessEvent: async () => { count += 1; },
    },
    context: { businessEvents: existing },
  });
  assert.equal(result.emitted, false);
  assert.equal(count, 0);
});

test('getStockCategoryOptions — inclut suif et effluent', () => {
  const values = getStockCategoryOptions().map((row) => row.value);
  assert.ok(values.includes('suif'));
  assert.ok(values.includes('os'));
  assert.ok(values.includes('effluent'));
  assert.ok(values.includes('aliment_betail'));
});
