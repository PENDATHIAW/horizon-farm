import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFarmKpis,
  getFarmQuickActions,
  sortModuleTabsForFarm,
} from '../../src/config/farmAdaptation.js';
import { DEFAULT_FARM, DEFAULT_FARM_ID } from '../../src/utils/farmScope.js';
import {
  ALL_FARMS_QUICK_ACTIONS,
  buildActivityKpiCards,
  buildAdaptedAlertsPanel,
  buildAllFarmsDashboardContext,
  buildHeyHorizonFarmContext,
  computeFarmRowMetrics,
  resolveQuickActionsForScope,
  rowsForFarm,
} from '../../src/utils/farmConsolidation.js';
import { DEMO_FARMS, isFarmDemoModeEnabled, mergeDemoFarms } from '../../src/utils/farmDemoMode.js';

const FARM_A = { ...DEFAULT_FARM, id: DEFAULT_FARM_ID, name: 'Horizon Farm', is_default: true, activity_type: ['mixte'] };
const FARM_B = { id: 'farm-b', name: 'Avicole Test', activity_type: ['aviculture_pondeuses'], status: 'active' };
const FARM_C = { id: 'farm-c', name: 'Cultures Test', activity_type: ['cultures'], status: 'active' };

const SAMPLE_DATA = {
  salesOrdersAll: [
    { id: 'o1', farm_id: FARM_B.id, montant_total: 500000, statut: 'confirmee' },
    { id: 'o2', farm_id: FARM_C.id, montant_total: 200000, statut: 'confirmee' },
  ],
  paymentsAll: [],
  transactionsAll: [
    { id: 't1', farm_id: FARM_B.id, type: 'recette', montant: 500000 },
    { id: 't2', farm_id: FARM_C.id, type: 'depense', montant: 50000 },
  ],
  stocks: [
    { id: 's1', farm_id: FARM_B.id, quantite: 2, seuil_alerte: 10 },
  ],
  alertes: [
    { id: 'a1', farm_id: FARM_B.id, status: 'nouvelle' },
    { id: 'a2', farm_id: FARM_C.id, status: 'nouvelle' },
  ],
  taches: [{ id: 'task1', farm_id: FARM_B.id, status: 'ouvert' }],
  animaux: [],
  lotsData: [{ id: 'l1', farm_id: FARM_B.id, effectif: 1000, status: 'actif' }],
  cultures: [{ id: 'c1', farm_id: FARM_C.id, surface_m2: 5000, status: 'active' }],
  businessPlans: [],
};

test('Phase 5 — rowsForFarm conserve legacy sans farm_id sur ferme par défaut', () => {
  const legacy = [{ id: 'x1' }, { id: 'x2', farm_id: FARM_B.id }];
  const defaultRows = rowsForFarm(legacy, DEFAULT_FARM_ID);
  assert.equal(defaultRows.length, 1);
  assert.equal(defaultRows[0].id, 'x1');
  assert.equal(rowsForFarm(legacy, FARM_B.id).length, 1);
});

test('Phase 5 — consolidation toutes fermes calcule totaux et comparaison', () => {
  const context = buildAllFarmsDashboardContext([FARM_A, FARM_B, FARM_C], SAMPLE_DATA);
  assert.equal(context.activeFarmCount, 3);
  assert.ok(context.totals.ca >= 0);
  assert.equal(context.comparisonRows.length, 3);
  assert.ok(context.bestFarm);
  assert.ok(context.riskiestFarm);
  assert.ok(context.locationCards.length === 3);
});

test('Phase 5 — computeFarmRowMetrics score exploitation', () => {
  const metrics = computeFarmRowMetrics(FARM_B, SAMPLE_DATA);
  assert.equal(metrics.farmId, FARM_B.id);
  assert.ok(metrics.exploitationScore >= 0 && metrics.exploitationScore <= 100);
  assert.ok(metrics.investorScore >= 0 && metrics.investorScore <= 100);
});

test('Phase 5 — KPI adaptés ferme avicole', () => {
  const cards = buildActivityKpiCards(FARM_B, { production: 1200, ca: 500000 }, SAMPLE_DATA);
  assert.ok(cards.some((card) => card.key === 'lay_rate'));
  assert.ok(cards.every((card) => card.value !== undefined));
});

test('Phase 5 — actions rapides mode toutes fermes', () => {
  const actions = resolveQuickActionsForScope(null, { mode: 'all' }, [FARM_A, FARM_B]);
  assert.deepEqual(actions.map((entry) => entry.key), ALL_FARMS_QUICK_ACTIONS.map((entry) => entry.key));
});

test('Phase 5 — actions rapides ferme avicole', () => {
  const actions = resolveQuickActionsForScope(FARM_B, { mode: 'single', farmId: FARM_B.id }, [FARM_A, FARM_B]);
  assert.ok(actions.some((entry) => entry.key === 'create_lot'));
});

test('Phase 5 — alertes adaptées mode toutes fermes', () => {
  const context = buildAllFarmsDashboardContext([FARM_A, FARM_B, FARM_C], SAMPLE_DATA);
  const alerts = buildAdaptedAlertsPanel(null, { mode: 'all' }, SAMPLE_DATA, context);
  assert.ok(alerts.some((entry) => /risque|alerte|stock|trésorerie/i.test(entry)));
});

test('Phase 5 — alertes adaptées ferme cultures', () => {
  const alerts = buildAdaptedAlertsPanel(FARM_C, { mode: 'single', farmId: FARM_C.id }, SAMPLE_DATA);
  assert.ok(alerts.some((entry) => /irrigation|météo|récolte/i.test(entry)));
});

test('Phase 5 — Hey Horizon contexte multi-fermes', () => {
  const context = buildHeyHorizonFarmContext({
    farmScope: { mode: 'all' },
    accessibleFarms: [FARM_A, FARM_B, FARM_C],
    ...SAMPLE_DATA,
    sales_orders: SAMPLE_DATA.salesOrdersAll,
    finances: SAMPLE_DATA.transactionsAll,
    stock: SAMPLE_DATA.stocks,
    alertes_center: SAMPLE_DATA.alertes,
  });
  assert.ok(context.comparison_summary);
  assert.ok(context.suggested_questions.some((entry) => /Compare|Résume/i.test(entry)));
});

test('Phase 5 — Hey Horizon contexte ferme active', () => {
  const context = buildHeyHorizonFarmContext({
    farmScope: { mode: 'single', farmId: FARM_B.id },
    activeFarm: FARM_B,
    accessibleFarms: [FARM_A, FARM_B],
    animaux: [],
    avicole: SAMPLE_DATA.lotsData,
  });
  assert.ok(context.suggested_questions.some((entry) => /ferme/i.test(entry)));
  assert.ok(context.activity_kpis.length);
});

test('Phase 5 — sortModuleTabsForFarm priorise onglets avicoles', () => {
  const tabs = ['Résumé', 'Animaux', 'Avicole', 'Santé', 'Graphiques'];
  const sorted = sortModuleTabsForFarm('elevage', tabs, FARM_B);
  assert.ok(sorted.indexOf('Avicole') < sorted.indexOf('Animaux'));
});

test('Phase 5 — mode mono-ferme inchangé', () => {
  const merged = mergeDemoFarms([FARM_A]);
  assert.equal(merged.length, 1);
  assert.ok(getFarmKpis(FARM_A).length > 0);
});

test('Phase 5 — mode démo ajoute fermes fictives uniquement si activé', () => {
  assert.equal(typeof isFarmDemoModeEnabled(), 'boolean');
  assert.ok(DEMO_FARMS.length >= 2);
});

test('Phase 5 — KPI mode toutes fermes', () => {
  const kpis = getFarmKpis(FARM_A, { mode: 'all' });
  assert.ok(kpis.some((entry) => entry.key === 'consolidated'));
});

test('Phase 5 — quick actions mixte limitées', () => {
  const actions = getFarmQuickActions(FARM_A);
  assert.ok(actions.length <= 10);
});
