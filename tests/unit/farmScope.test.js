import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFarmScopeToDataMap,
  applyFarmScopeToProps,
} from '../../src/utils/applyFarmScope.js';
import {
  DEFAULT_FARM,
  DEFAULT_FARM_ID,
  filterRowsByFarmScope,
  formatFarmScopeLabel,
  isFarmScopeFilteringEnabled,
  isRowInFarmScope,
  normalizeFarmScope,
  readFarmScope,
  shouldShowFarmSelector,
  writeFarmScope,
} from '../../src/utils/farmScope.js';
import { getDefaultFarmRecord, farmsService } from '../../src/services/farmsService.js';
import {
  getFarmModuleAdaptation,
  isModuleEnabledForFarm,
  normalizeFarmActivities,
} from '../../src/config/farmActivities.js';
import { buildFarmRecordFromCreationDraft, EMPTY_FARM_CREATION_DRAFT } from '../../src/config/farmCreationModel.js';

const FARM_A = { ...DEFAULT_FARM, id: 'farm-a', name: 'Horizon Farm', is_default: true };
const FARM_B = { id: 'farm-b', name: 'Site avicole Thiès', activity_type: ['aviculture_pondeuses'], is_default: false };

test('default farm record — Horizon Farm mixte', () => {
  const farm = getDefaultFarmRecord([FARM_A]);
  assert.equal(farm.id, FARM_A.id);
  assert.equal(farm.name, 'Horizon Farm');
  assert.deepEqual(normalizeFarmActivities(farm.activity_type), ['mixte']);
});

test('normalizeFarmScope — mono-ferme par défaut', () => {
  const scope = normalizeFarmScope({}, [FARM_A]);
  assert.equal(scope.mode, 'single');
  assert.equal(scope.farmId, FARM_A.id);
});

test('normalizeFarmScope — toutes les fermes', () => {
  const scope = normalizeFarmScope({ mode: 'all' }, [FARM_A, FARM_B]);
  assert.equal(scope.mode, 'all');
  assert.deepEqual(scope.farmIds, [FARM_A.id, FARM_B.id]);
});

test('shouldShowFarmSelector — mono vs multi', () => {
  assert.equal(shouldShowFarmSelector([FARM_A]), false);
  assert.equal(shouldShowFarmSelector([FARM_A, FARM_B]), true);
});

test('formatFarmScopeLabel', () => {
  assert.equal(formatFarmScopeLabel({ mode: 'all' }, [FARM_A, FARM_B]), 'Toutes les fermes');
  assert.equal(formatFarmScopeLabel({ mode: 'single', farmId: FARM_A.id }, [FARM_A]), 'Horizon Farm');
});

test('filterRowsByFarmScope — compatibilité lignes sans farm_id', () => {
  const rows = [{ id: 1, produit: 'Maïs' }, { id: 2, farm_id: FARM_B.id, produit: 'Aliment' }];
  const filtered = filterRowsByFarmScope(rows, { mode: 'single', farmId: FARM_A.id }, [FARM_A, FARM_B]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
  assert.equal(isRowInFarmScope({ id: 1 }, { mode: 'single', farmId: FARM_A.id }), true);
  assert.equal(isRowInFarmScope({ id: 2, farm_id: FARM_B.id }, { mode: 'single', farmId: FARM_A.id }), false);
});

test('applyFarmScopeToDataMap — pas de filtrage sans VITE_ENABLE_FARM_FILTER', () => {
  const dataMap = {
    stock: [{ id: 1, farm_id: FARM_B.id }, { id: 2 }],
    animaux: [{ id: 'A1' }],
  };
  const next = applyFarmScopeToDataMap(dataMap, { mode: 'single', farmId: FARM_A.id }, { accessibleFarms: [FARM_A, FARM_B] });
  assert.equal(next.stock.length, 2);
  assert.equal(next.farmFiltered, false);
});

test('applyFarmScopeToDataMap — filtrage forcé', () => {
  const dataMap = {
    stock: [{ id: 1, farm_id: FARM_A.id }, { id: 2, farm_id: FARM_B.id }],
  };
  const next = applyFarmScopeToDataMap(
    dataMap,
    { mode: 'single', farmId: FARM_A.id },
    { accessibleFarms: [FARM_A, FARM_B], forceFilter: true },
  );
  assert.equal(next.stock.length, 1);
  assert.equal(next.farmFiltered, true);
});

test('applyFarmScopeToProps — métadonnées scope sans filtrage par défaut', () => {
  const props = applyFarmScopeToProps(
    { rows: [{ id: 1, farm_id: FARM_B.id }] },
    { mode: 'single', farmId: FARM_A.id },
    { accessibleFarms: [FARM_A, FARM_B], activeFarm: FARM_A },
  );
  assert.equal(props.rows.length, 1);
  assert.equal(props.farmScope.mode, 'single');
  assert.equal(props.activeFarm.id, FARM_A.id);
  assert.equal(isFarmScopeFilteringEnabled(), false);
});

test('farmsService.getDefaultFarm — fallback cache', () => {
  const farm = farmsService.getDefaultFarm();
  assert.equal(farm.id, DEFAULT_FARM_ID);
  assert.equal(farm.name, 'Horizon Farm');
});

test('activités — cultures masque œufs, mixte tout active', () => {
  const cultureFarm = { activity_type: ['cultures'] };
  const mixteFarm = { activity_type: ['mixte'] };
  assert.equal(isModuleEnabledForFarm('cultures', cultureFarm), true);
  assert.equal(isModuleEnabledForFarm('elevage', cultureFarm), false);
  assert.equal(isModuleEnabledForFarm('elevage', mixteFarm), true);
  const adaptation = getFarmModuleAdaptation(cultureFarm);
  assert.ok(adaptation.adaptiveModules.includes('cultures'));
});

test('modèle création ferme — projection draft', () => {
  const draft = {
    ...EMPTY_FARM_CREATION_DRAFT,
    general: { ...EMPTY_FARM_CREATION_DRAFT.general, name: 'Site bovin', legal_name: 'Site bovin SARL' },
    activities: { activity_type: ['embouche_bovine'] },
    location: { ...EMPTY_FARM_CREATION_DRAFT.location, region: 'Thiès', commune: 'Tivaouane' },
  };
  const record = buildFarmRecordFromCreationDraft(draft, 'company-1', 'user-1');
  assert.equal(record.name, 'Site bovin');
  assert.equal(record.company_id, 'company-1');
  assert.deepEqual(record.activity_type, ['embouche_bovine']);
  assert.equal(record.is_default, false);
});

test('writeFarmScope / readFarmScope — localStorage mock', () => {
  const storage = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    dispatchEvent: () => true,
  };
  writeFarmScope({ mode: 'single', farmId: FARM_B.id }, [FARM_A, FARM_B]);
  const read = readFarmScope([FARM_A, FARM_B]);
  assert.equal(read.mode, 'single');
  assert.equal(read.farmId, FARM_B.id);
  delete global.window;
});
