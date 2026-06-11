import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFarmOverviewAnswer, buildAnnualOutlookAnswer } from '../../src/services/assistantFarmOverview.js';

const emptyDataMap = {
  animaux: [],
  lots: [],
  cultures: [],
  stock: [],
  sales_orders: [],
  payments: [],
  finances: [],
};

test('buildFarmOverviewAnswer returns multi-domain lines', () => {
  const answer = buildFarmOverviewAnswer(emptyDataMap);
  assert.ok(answer.situation.includes('Élevage'));
  assert.ok(answer.situation.includes('Finance'));
});

test('buildAnnualOutlookAnswer uses canonical engines', () => {
  const answer = buildAnnualOutlookAnswer(emptyDataMap);
  assert.ok(answer.sources.includes('buildObjectifsCroissanceData'));
  assert.ok(answer.situation);
});
