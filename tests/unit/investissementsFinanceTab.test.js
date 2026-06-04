import assert from 'node:assert/strict';
import test from 'node:test';
import { getInvestorReadySummary } from '../../src/services/heyHorizonCore/index.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../../src/services/horizonFarmOfficialBusinessPlan.js';

test('getInvestorReadySummary accepte un dataMap minimal pour Finance Investissements', () => {
  const summary = getInvestorReadySummary({
    business_plans: [{ id: 'BP1', nom: 'Horizon Farm' }],
    finances: [{ id: 'T1', type: 'entree', montant: 1000, document_id: 'D1' }],
    investissements: [{ id: 'I1', montant: 500000 }],
  });
  assert.ok(summary.readiness_score >= 0 && summary.readiness_score <= 100);
  assert.ok(summary.readiness_label);
});

test('écart besoins/ressources BP officiel est à zéro', () => {
  const besoins = HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal;
  const ressources = HORIZON_FARM_OFFICIAL_BP.funding.officialTotal;
  assert.equal(besoins, ressources);
  assert.equal(besoins - ressources, 0);
});
