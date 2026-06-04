import test from 'node:test';
import assert from 'node:assert/strict';

import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import { parseForecastScenario, FORECAST_SCENARIO_TYPES } from '../../src/services/horizonForecast/forecastScenarioParser.js';
import { runForecastEngine, extractHistoricalPricing } from '../../src/services/horizonForecast/forecastEngine.js';
import { analyzeForecastRisks } from '../../src/services/horizonForecast/forecastRiskAnalyzer.js';
import {
  buildForecastReport,
  FORECAST_RECOMMENDATIONS,
  forecastReportToText,
} from '../../src/services/horizonForecast/forecastReportBuilder.js';

const emptyMap = composeDecisionDataMap({ crud: {}, dataMap: {} });

test('parseForecastScenario reconnaît les questions types', () => {
  assert.equal(parseForecastScenario('Puis-je lancer 1 000 poussins le mois prochain ?').scenarioType, FORECAST_SCENARIO_TYPES.BROILER_CHICKS);
  assert.equal(parseForecastScenario('Puis-je acheter 10 bovins ?').scenarioType, FORECAST_SCENARIO_TYPES.CATTLE_PURCHASE);
  assert.equal(parseForecastScenario('Puis-je agrandir mon bâtiment ?').scenarioType, FORECAST_SCENARIO_TYPES.BUILDING_EXPANSION);
  assert.equal(parseForecastScenario('Est-ce rentable de lancer une nouvelle bande chair ?').rentabilityQuestion, true);
});

test('runForecastEngine produit coûts et trésorerie sans prix inventés silencieux', () => {
  const parsed = parseForecastScenario('Puis-je lancer 1 000 poussins le mois prochain ?');
  const result = runForecastEngine(emptyMap, parsed);
  assert.ok(result.simulation.initialCost > 0);
  assert.ok(result.simulation.treasuryNeed > 0);
  assert.ok(result.assumptions.length > 0);
  assert.equal(result.readOnly, true);
});

test('extractHistoricalPricing utilise les ventes ERP quand disponibles', () => {
  const pricing = extractHistoricalPricing({
    ...emptyMap,
    sales_orders: [{ id: 'V1', product_name: 'Poulet chair', quantite: 10, montant_total: 450000 }],
    stock: [{ id: 'S1', produit: 'Aliment chair', quantite: 100, prix_unitaire: 18000 }],
  });
  assert.ok(pricing.chairSaleUnit > 0);
  assert.ok(pricing.feedPriceKg > 0);
});

test('analyzeForecastRisks signale trésorerie insuffisante', () => {
  const parsed = parseForecastScenario('Puis-je lancer 1 000 poussins le mois prochain ?');
  const engine = runForecastEngine(emptyMap, parsed);
  engine.finance.availableTreasury = 0;
  const risks = analyzeForecastRisks(engine, emptyMap);
  assert.ok(risks.some((r) => r.id === 'forecast-treasury-gap'));
});

test('buildForecastReport inclut recommandation et actions', () => {
  const report = buildForecastReport('Puis-je acheter 10 bovins ?', emptyMap);
  assert.ok(report.metrics.initialCost > 0);
  assert.ok([FORECAST_RECOMMENDATIONS.FAVORABLE, FORECAST_RECOMMENDATIONS.PRUDENCE, FORECAST_RECOMMENDATIONS.DEFAVORABLE].includes(report.recommendation));
  assert.ok(report.preLaunchActions.length > 0);
  assert.ok(forecastReportToText(report).includes('Horizon Forecast'));
  assert.equal(report.readOnly, true);
});
