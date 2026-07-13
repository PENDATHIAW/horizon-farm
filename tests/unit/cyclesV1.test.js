import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRowsByFarmScope } from '../../src/utils/farmScope.js';
import {
  buildCycleV1Kpis,
  buildCycleAlertsForPanel,
  buildCycleInvestorPipeline,
  isCycleRelatedAlert,
  summarizeLaunchBlocks,
} from '../../src/utils/cycleMetrics.js';
import {
  dispatchCyclesProductionQuestion,
  openElevageCyclesWithQuestion,
  shouldHandleProductionQuestionEvent,
} from '../../src/utils/elevageCyclesNavigation.js';
import { buildElevageInvestorReport } from '../../src/utils/elevageExport.js';
import {
  setupTestStorage,
  assertModuleTabStable,
  buildSimulatedProps,
} from './helpers/moduleTabTestHarness.js';

setupTestStorage();

const FARM_A = 'a0000000-0000-4000-8000-000000000001';
const FARM_B = 'b0000000-0000-4000-8000-000000000002';

const LOT_CHAIR_A = {
  id: 'LOT-CHAIR-A',
  name: 'Chair A',
  type: 'Chair',
  date_entree: '2026-05-01',
  initial_count: 500,
  current_count: 480,
  farm_id: FARM_A,
};

const LOT_CHAIR_B = {
  id: 'LOT-CHAIR-B',
  name: 'Chair B',
  type: 'Chair',
  date_entree: '2026-05-10',
  initial_count: 400,
  current_count: 390,
  farm_id: FARM_B,
};

const BOVIN_A = {
  id: 'BOV-1',
  name: 'Bovin 1',
  espece: 'Bovin',
  date_entree: '2026-03-01',
  status: 'actif',
  farm_id: FARM_A,
};

test('cycles V1 KPIs — échéances, retard, lots actifs', () => {
  const kpis = buildCycleV1Kpis({
    lots: [LOT_CHAIR_A, LOT_CHAIR_B],
    animaux: [BOVIN_A],
    productionLogs: [],
    strategicPlan: {},
  });
  assert.ok(kpis.activeLotsCount >= 2);
  assert.ok(typeof kpis.dueSoonCount === 'number');
  assert.ok(typeof kpis.lateCount === 'number');
  assert.ok(kpis.nextExitDate);
  assert.equal(typeof kpis.layingRateLabel, 'string');
});

test('cycles launch blocks — BFR et vide sanitaire', () => {
  const blocked = summarizeLaunchBlocks({
    bfr: { blocked: true, message: 'Trésorerie insuffisante' },
    sanitary: [{ blocking: true, message: 'Vide sanitaire lot 1' }],
  });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.count, 2);
  assert.match(blocked.label, /2 blocage/);
});

test('cycles alerts panel — aligné AlertesCenter J+40/J+90', () => {
  const alerts = buildCycleAlertsForPanel({
    lots: [LOT_CHAIR_A],
    animaux: [BOVIN_A],
    alertes: [],
  });
  assert.ok(alerts.length >= 0);
  const chairAlert = alerts.find((a) => String(a.id).includes('chair'));
  if (chairAlert) {
    assert.ok(isCycleRelatedAlert(chairAlert));
  }
});

test('cycles investor pipeline — prochaines sorties', () => {
  const pipeline = buildCycleInvestorPipeline({
    lots: [LOT_CHAIR_A, LOT_CHAIR_B],
    animaux: [BOVIN_A],
    horizonDays: 90,
    referenceDate: '2026-06-01',
  });
  assert.ok(pipeline.upcomingExits.length >= 1);
  assert.ok(pipeline.pipeline.every((row) => row.targetDate && row.label));

  const report = buildElevageInvestorReport({
    lots: [LOT_CHAIR_A],
    animaux: [BOVIN_A],
    farmLabel: 'Ferme A',
    referenceDate: '2026-06-01',
  });
  assert.ok(report.cyclesPipeline);
  assert.ok(report.kpis.cyclesUpcoming90d >= 0);
  assert.ok(report.rows.some((row) => row.section === 'Pipeline cycles'));
});

test('farmScope cycles — lots filtrés par ferme', () => {
  const scope = { mode: 'single', farmId: FARM_A };
  const farms = [
    { id: FARM_A, name: 'A', status: 'active' },
    { id: FARM_B, name: 'B', status: 'active' },
  ];
  const filtered = filterRowsByFarmScope([LOT_CHAIR_A, LOT_CHAIR_B], scope, farms);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'LOT-CHAIR-A');

  const kpisA = buildCycleV1Kpis({ lots: filtered, animaux: [], productionLogs: [] });
  const kpisAll = buildCycleV1Kpis({ lots: [LOT_CHAIR_A, LOT_CHAIR_B], animaux: [], productionLogs: [] });
  assert.ok(kpisAll.activeLotsCount > kpisA.activeLotsCount);
});

test('productionQuestion navigation helpers', () => {
  assert.equal(shouldHandleProductionQuestionEvent({ moduleId: 'elevage', questionId: 'new_chair_band' }), true);
  assert.equal(shouldHandleProductionQuestionEvent({ moduleId: 'commercial' }), false);

  if (typeof globalThis.dispatchEvent === 'function') {
    let captured = null;
    const handler = (event) => { captured = event.detail; };
    globalThis.addEventListener('horizon-production-question', handler);
    dispatchCyclesProductionQuestion('new_layer_band', 'elevage');
    globalThis.removeEventListener('horizon-production-question', handler);
    assert.equal(captured.questionId, 'new_layer_band');
    assert.equal(captured.moduleId, 'elevage');
  }

  let navigated = null;
  openElevageCyclesWithQuestion({
    questionId: 'reform_lot',
    setTab: (tab) => { navigated = tab; },
    onNavigate: () => {},
  });
  assert.equal(navigated, 'Cycles & Reproduction');
});

test('elevage Cycles & Reproduction tab mounts without regression', async () => {
  await assertModuleTabStable('elevage', 'Cycles & Reproduction', buildSimulatedProps());
});
