import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveActiveModuleId } from '../../src/config/moduleEntryPoints.js';
import {
  CANONICAL_MODULE_FILES,
  FORBIDDEN_ENTRY_FILES,
  MODULE_ENTRY_POINTS,
  entryPointSource,
} from '../../src/config/moduleEntryPoints.js';
import { NAV_MODULE_ORDER, ROUTE_TO_MODULE } from '../../src/config/modules.config.js';

test('impact_business retiré de la navigation principale', () => {
  assert.ok(!NAV_MODULE_ORDER.includes('impact_business'));
  assert.ok(NAV_MODULE_ORDER.includes('financements'));
});

test('impact_business redirigé vers financements', () => {
  assert.equal(ROUTE_TO_MODULE.impact_business, 'financements');
  assert.equal(resolveActiveModuleId('impact_business'), 'financements');
});

test('chaque entry point référence un fichier canonique à jour', () => {
  for (const [moduleId, expectedFile] of Object.entries(CANONICAL_MODULE_FILES)) {
    assert.ok(MODULE_ENTRY_POINTS[moduleId], `entry manquant pour ${moduleId}`);
    const source = entryPointSource(moduleId);
    assert.ok(source.endsWith(expectedFile), `${moduleId}: attendu */${expectedFile}, reçu ${source}`);
  }
});

test('aucun entry point ne charge un fichier legacy interdit', () => {
  for (const [moduleId] of Object.entries(MODULE_ENTRY_POINTS)) {
    const source = entryPointSource(moduleId);
    const fileName = source.split('/').pop();
    assert.ok(
      !FORBIDDEN_ENTRY_FILES.includes(fileName),
      `${moduleId} charge un fichier legacy interdit: ${fileName}`,
    );
  }
});

test('modules critiques — versions les plus récentes', () => {
  assert.match(entryPointSource('alertes'), /AlertesCenterV3\.jsx$/);
  assert.match(entryPointSource('ventes'), /VentesV5\.jsx$/);
  assert.match(entryPointSource('equipements'), /EquipementsV3\.jsx$/);
  assert.match(entryPointSource('sync'), /SyncActivityCenter\.jsx$/);
  assert.match(entryPointSource('cultures'), /CulturesRecoveredModule\.jsx$/);
  assert.match(entryPointSource('dashboard'), /AccueilRefinedEntry\.jsx$/);
  assert.match(entryPointSource('finances'), /FinancesV12\.jsx$/);
  assert.match(entryPointSource('financements'), /FinancementsModule\.jsx$/);
});
