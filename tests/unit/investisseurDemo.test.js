import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInvestorDemoDataMap,
  INVESTOR_DEMO_SCENARIOS,
  runFullInvestorDemo,
  runHorizonForecastDemo,
  runInvestorDemoScenario,
  runOcrIntelligentDemo,
  runWhatsAppHorizonDemo,
} from '../../src/services/investorForums/investorDemoOrchestrator.js';

test('buildInvestorDemoDataMap isole les données simulées', () => {
  const map = buildInvestorDemoDataMap();
  assert.equal(map.demoMode, true);
  assert.ok(Array.isArray(map.avicole) && map.avicole.length > 0);
  assert.ok(Array.isArray(map.sales_orders) && map.sales_orders.length > 0);
  assert.equal(map.periodLabel.includes('démo'), true);
});

test('runWhatsAppHorizonDemo produit brouillons sans écriture', async () => {
  const result = await runWhatsAppHorizonDemo();
  assert.equal(result.readOnly, true);
  assert.equal(result.demoMode, true);
  assert.ok(result.message.includes('tablettes'));
  assert.ok(result.impacts.length >= 4);
  assert.ok(result.impacts.some((i) => i.id === 'payment'));
});

test('runOcrIntelligentDemo détecte hausse aliment', async () => {
  const result = await runOcrIntelligentDemo();
  assert.equal(result.readOnly, true);
  assert.ok(result.invoice?.produit);
  assert.ok(result.headline || result.summary);
  assert.ok(result.recommendation);
});

test('runInvestorDemoScenario brief hebdomadaire', async () => {
  const result = await runInvestorDemoScenario('hey_horizon_brief');
  assert.equal(result.id, 'hey_horizon_brief');
  assert.equal(result.readOnly, true);
  assert.ok(Array.isArray(result.sections));
});

test('runHorizonForecastDemo simule 1000 poussins', () => {
  const result = runHorizonForecastDemo();
  assert.equal(result.readOnly, true);
  assert.ok(result.phrase.includes('1 000'));
  assert.ok(result.metrics.initialCost > 0);
  assert.ok(result.recommendation);
});

test('runFullInvestorDemo enchaîne 4 scénarios', async () => {
  const full = await runFullInvestorDemo();
  assert.equal(full.demoMode, true);
  assert.equal(full.steps.length, INVESTOR_DEMO_SCENARIOS.length);
  assert.ok(full.tagline.includes('copilote'));
});
