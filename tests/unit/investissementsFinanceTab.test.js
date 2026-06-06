import assert from 'node:assert/strict';
import test from 'node:test';
import { getInvestorReadySummary } from '../../src/services/heyHorizonCore/index.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../../src/services/horizonFarmOfficialBusinessPlan.js';
import {
  bpCostAmount,
  BP_LINE_STATUS,
  computeBpCostTotals,
  launchBpFinanceLink,
} from '../../src/utils/bpLineConcretization.js';

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

test('bpCostAmount et totaux charges — vue overview Investissements', () => {
  const costs = [
    { id: 'BPC-1', montant_mensuel: 150000, statut: BP_LINE_STATUS.A_CONCRETISER },
    { id: 'BPC-2', montant_mensuel: 80000, statut: BP_LINE_STATUS.A_CONCRETISER },
  ];
  assert.equal(bpCostAmount(costs[0]), 150000);
  const totals = computeBpCostTotals(costs);
  assert.ok(totals.prevu >= 230000);
  assert.equal(totals.count, 2);
});

test('launchBpFinanceLink prépare une route Trésorerie', () => {
  const navigated = [];
  const result = launchBpFinanceLink(
    { id: 'BPLI-1', designation: 'Pompe solaire', quantite: 1, prix_unitaire: 350000, business_plan_id: 'BP-HF' },
    { onNavigate: (mod, opts) => navigated.push({ mod, opts }) },
  );
  assert.equal(result.ok, true);
  assert.equal(navigated[0]?.mod, 'finance_pilotage');
  assert.equal(navigated[0]?.opts?.tab, 'Trésorerie');
});
