import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORBIDDEN_ENTRY_FILES,
  MODULE_ENTRY_POINTS,
  entryPointSource,
  resolveActiveModuleId,
} from '../../src/config/moduleEntryPoints.js';
import { MODULE_AUDIT_ORDER, MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { MODULE_REGISTRY, NAV_MODULE_ORDER, ROUTE_TO_MODULE } from '../../src/config/modules.config.js';
import { FARM_NAV_SECTIONS } from '../../src/services/assistantFarmNavigation.js';
import { refreshModuleCluster } from '../../src/services/workflowRefresh.js';

const LEGACY_ALIASES = {
  centre_ia: 'centre_decisionnel',
  rh: 'equipe',
  sync_activity: 'gestion_systeme',
};

const flattenFarmSectionModules = () =>
  Object.values(FARM_NAV_SECTIONS).flatMap((section) => section.modules || []);

test('architecture modules — navigation active sans anciens modules structurels', () => {
  for (const legacyId of Object.keys(LEGACY_ALIASES)) {
    assert.ok(!NAV_MODULE_ORDER.includes(legacyId), `${legacyId} ne doit plus être dans la sidebar`);
    assert.ok(!MODULE_AUDIT_ORDER.includes(legacyId), `${legacyId} ne doit plus être audité comme module actif`);
    assert.ok(!flattenFarmSectionModules().includes(legacyId), `${legacyId} ne doit plus être exposé en navigation ferme`);
    assert.equal(Object.hasOwn(MODULE_TARGET_TABS, legacyId), false, `${legacyId} ne doit plus avoir d'onglets actifs`);
  }
});

test('architecture modules — aliases legacy conservés mais canoniques', () => {
  for (const [legacyId, canonicalId] of Object.entries(LEGACY_ALIASES)) {
    assert.equal(ROUTE_TO_MODULE[legacyId], canonicalId);
    assert.equal(resolveActiveModuleId(legacyId), canonicalId);
    assert.equal(MODULE_REGISTRY[legacyId]?.deprecated, true);
    assert.equal(MODULE_REGISTRY[legacyId]?.aliasOf, canonicalId);
    assert.ok(MODULE_ENTRY_POINTS[legacyId], `${legacyId} reste ouvrable par URL directe`);
    assert.equal(entryPointSource(legacyId), entryPointSource(canonicalId));
  }
});

test('architecture modules — sync_activity fusionné dans Gestion système', () => {
  assert.ok(FORBIDDEN_ENTRY_FILES.includes('SyncActivityCenter.jsx'));
  for (const moduleId of ['sync', 'sync_activity', 'audit_logs', 'gestion_systeme']) {
    assert.match(entryPointSource(moduleId), /GestionSystemeV2\.jsx$/);
    assert.doesNotMatch(entryPointSource(moduleId), /SyncActivityCenter/);
  }
});

test('architecture modules — chaque module actif a un entry point et des onglets', () => {
  for (const moduleId of NAV_MODULE_ORDER) {
    assert.ok(MODULE_ENTRY_POINTS[moduleId], `entry point manquant pour ${moduleId}`);
    assert.ok(MODULE_TARGET_TABS[moduleId]?.length, `onglets cibles manquants pour ${moduleId}`);
  }
});

test('architecture modules — refresh legacy redirigé vers les clusters canoniques', async () => {
  const calls = [];
  const crud = Object.fromEntries(
    ['audit_logs', 'business_events', 'alertes_center', 'taches', 'equipements', 'documents', 'finances'].map((key) => [
      key,
      { refresh: async () => calls.push(key) },
    ]),
  );

  await refreshModuleCluster('sync_activity', crud);
  assert.deepEqual(calls, ['audit_logs', 'business_events', 'alertes_center', 'taches']);

  calls.length = 0;
  await refreshModuleCluster('rh', crud);
  assert.deepEqual(calls, ['taches', 'business_events', 'equipements', 'documents', 'alertes_center']);
});
