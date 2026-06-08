import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFarmCreationSummary,
  getFarmAlerts,
  getFarmHeyHorizonTopics,
  getFarmKpis,
  getFarmQuickActions,
  formatFarmActivitiesLabel,
} from '../../src/config/farmAdaptation.js';
import {
  buildFarmRecordFromCreationDraft,
  cloneFarmCreationDraft,
  EMPTY_FARM_CREATION_DRAFT,
  getCapacityFieldsForActivities,
  validateFarmCreationStep,
} from '../../src/config/farmCreationModel.js';
import {
  getFarmActivityNotice,
  getFarmActivityNoticeDetail,
  normalizeFarmActivities,
} from '../../src/config/farmActivities.js';
import { canManageFarms, getDefaultFarmRecord } from '../../src/services/farmsService.js';
import { DEFAULT_FARM, DEFAULT_FARM_ID, shouldShowFarmSelector } from '../../src/utils/farmScope.js';
import { applyFarmScopeToProps } from '../../src/utils/applyFarmScope.js';

const FARM_A = { ...DEFAULT_FARM, id: DEFAULT_FARM_ID, name: 'Horizon Farm', is_default: true, activity_type: ['mixte'] };
const FARM_B = { id: 'farm-b', name: 'Avicole Test', activity_type: ['aviculture_pondeuses'] };
const FARM_C = { id: 'farm-c', name: 'Cultures Test', activity_type: ['cultures'] };

test('Phase 4 — buildFarmRecordFromCreationDraft stocke settings jsonb', () => {
  const draft = cloneFarmCreationDraft({
    general: { name: 'Ferme Test', status: 'active', manager_name: 'Awa' },
    location: { country: 'SN', region: 'Thiès', commune: 'Mbour' },
    activities: { activity_type: ['aviculture_pondeuses'] },
    capacities: { capacity_layers: 5000 },
    finance: { currency: 'XOF', startup_budget: 1000000 },
    commercial: { target_markets: ['Dakar'] },
  });
  const record = buildFarmRecordFromCreationDraft(draft, 'company-1', 'user-1');
  assert.equal(record.name, 'Ferme Test');
  assert.deepEqual(record.activity_type, ['aviculture_pondeuses']);
  assert.equal(record.settings.capacities.capacity_layers, 5000);
  assert.equal(record.settings.finance_settings.startup_budget, 1000000);
  assert.equal(record.settings.commercial_settings.target_markets[0], 'Dakar');
});

test('Phase 4 — validation étapes assistant', () => {
  const draft = cloneFarmCreationDraft();
  assert.match(validateFarmCreationStep('general', draft), /nom/i);
  assert.match(validateFarmCreationStep('activities', draft), /activité/i);
  draft.general.name = 'OK';
  draft.activities.activity_type = ['cultures'];
  assert.equal(validateFarmCreationStep('general', draft), null);
  assert.equal(validateFarmCreationStep('activities', draft), null);
});

test('Phase 4 — capacités conditionnelles par activité', () => {
  const avicole = getCapacityFieldsForActivities(['aviculture_pondeuses']).map((field) => field.key);
  const cultures = getCapacityFieldsForActivities(['cultures']).map((field) => field.key);
  assert.ok(avicole.includes('capacity_layers'));
  assert.ok(cultures.includes('cultivable_surface'));
  assert.ok(!avicole.includes('cultivable_surface'));
});

test('Phase 4 — résumé création ferme', () => {
  const draft = cloneFarmCreationDraft({
    general: { name: 'Avicole Nord' },
    activities: { activity_type: ['aviculture_pondeuses'] },
  });
  const summary = buildFarmCreationSummary(draft);
  assert.equal(summary.name, 'Avicole Nord');
  assert.ok(summary.enabledModules.includes('Élevage'));
  assert.ok(summary.kpis.some((entry) => /ponte/i.test(entry)));
});

test('Phase 4 — KPI selon activité', () => {
  const avicoleKpis = getFarmKpis(FARM_B).map((entry) => entry.key);
  assert.ok(avicoleKpis.includes('lay_rate'));
  assert.ok(getFarmKpis(FARM_C).some((entry) => entry.key === 'cultivated_area'));
  assert.ok(getFarmKpis(FARM_A, { mode: 'all' }).some((entry) => entry.key === 'consolidated'));
});

test('Phase 4 — alertes et actions rapides selon activité', () => {
  const avicoleAlerts = getFarmAlerts(FARM_B);
  const avicoleActions = getFarmQuickActions(FARM_B).map((entry) => entry.key);
  assert.ok(avicoleAlerts.some((entry) => /mortalité/i.test(entry)));
  assert.ok(avicoleActions.includes('create_lot'));
  assert.ok(getFarmQuickActions({ activity_type: ['cultures'] }).some((entry) => entry.key === 'create_parcel'));
});

test('Phase 4 — notice activité avec action', () => {
  const detail = getFarmActivityNoticeDetail('cultures', FARM_B, true);
  assert.match(detail.message, /activité cultures/i);
  assert.match(detail.actionLabel, /Activer/i);
  assert.equal(getFarmActivityNotice('cultures', FARM_B, true), detail.message);
});

test('Phase 4 — Hey Horizon topics selon activité', () => {
  const avicoleTopics = getFarmHeyHorizonTopics(FARM_B);
  const cultureTopics = getFarmHeyHorizonTopics(FARM_C);
  const allTopics = getFarmHeyHorizonTopics(FARM_A, { mode: 'all' });
  assert.ok(avicoleTopics.some((entry) => /ponte|lots/i.test(entry)));
  assert.ok(cultureTopics.some((entry) => /parcelles|récoltes/i.test(entry)));
  assert.ok(allTopics.some((entry) => /comparaison/i.test(entry)));
});

test('Phase 4 — canManageFarms réservé admin/direction', () => {
  assert.equal(canManageFarms({ role: 'admin' }), true);
  assert.equal(canManageFarms({ user_metadata: { role: 'employe' } }), false);
});

test('Phase 4 — mode mono-ferme conserve simplicité', () => {
  assert.equal(shouldShowFarmSelector([FARM_A]), false);
  assert.equal(getDefaultFarmRecord([FARM_A]).name, 'Horizon Farm');
  assert.deepEqual(normalizeFarmActivities(getDefaultFarmRecord([FARM_A]).activity_type), ['mixte']);
});

test('Phase 4 — applyFarmScopeToProps expose notice detail', () => {
  const props = applyFarmScopeToProps(
    {},
    { mode: 'single', farmId: FARM_B.id },
    { accessibleFarms: [FARM_A, FARM_B], activeFarm: FARM_B, moduleId: 'cultures', forceFilter: true },
  );
  assert.ok(props.farmActivityNoticeDetail?.actionLabel);
});

test('Phase 4 — formatFarmActivitiesLabel', () => {
  assert.match(formatFarmActivitiesLabel(['aviculture_pondeuses']), /Aviculture/i);
  assert.equal(formatFarmActivitiesLabel(['mixte']), 'Mixte');
});
