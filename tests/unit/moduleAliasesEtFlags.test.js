/**
 * Chantier 2 : identifiants, alias et flags.
 * - Les anciens identifiants (centre_ia, rh, sync, sync_activity, audit_logs)
 *   redirigent vers les nouveaux modules.
 * - Les flags par ferme retirent réellement navigation, entry point (import
 *   jamais résolu) et chargement de données.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPRECATED_MODULE_ALIASES,
  MODULE_ENTRY_POINTS,
  resolveActiveModuleId,
} from '../../src/config/moduleEntryPoints.js';
import {
  FLAGGED_MODULES,
  enabledModuleEntryPoints,
  isDataKeyEnabled,
  isModuleEnabled,
  resolveModuleFlags,
} from '../../src/config/moduleFlags.js';

test('anciennes routes redirigées vers les nouveaux identifiants', () => {
  assert.equal(resolveActiveModuleId('centre_ia'), 'centre_decisionnel');
  assert.equal(resolveActiveModuleId('rh'), 'equipe');
  assert.equal(resolveActiveModuleId('investisseurs_forums'), 'financements');
  assert.equal(resolveActiveModuleId('impact_business'), 'financements');
  assert.equal(resolveActiveModuleId('sync'), 'gestion_systeme');
  assert.equal(resolveActiveModuleId('sync_activity'), 'gestion_systeme');
  assert.equal(resolveActiveModuleId('audit_logs'), 'gestion_systeme');
  for (const [ancien, cible] of Object.entries(DEPRECATED_MODULE_ALIASES)) {
    assert.ok(MODULE_ENTRY_POINTS[cible], `cible ${cible} sans entry point (alias ${ancien})`);
  }
});

test('les nouveaux identifiants ont un entry point chargeable', () => {
  for (const id of ['centre_decisionnel', 'equipe', 'financements', 'gestion_systeme']) {
    assert.equal(typeof MODULE_ENTRY_POINTS[id], 'function', `entry point manquant : ${id}`);
  }
});

test('défauts des flags : AGRI FEEDS et Smart Farm désactivés, le reste actif', () => {
  const flags = resolveModuleFlags(null, {});
  assert.equal(flags.agri_feeds, false);
  assert.equal(flags.smartfarm, false);
  assert.equal(flags.financements, true);
  assert.equal(flags.assistant_erp, true);
});

test('le réglage de la ferme prime sur les défauts', () => {
  const ferme = { settings: { modules: { agri_feeds: true, financements: false } } };
  const flags = resolveModuleFlags(ferme, {});
  assert.equal(flags.agri_feeds, true);
  assert.equal(flags.financements, false);
  assert.equal(flags.smartfarm, false);
});

test('flag désactivé = entry point retiré, import jamais résolu', () => {
  const flags = resolveModuleFlags(null, {});
  let importResolu = false;
  const points = {
    ...MODULE_ENTRY_POINTS,
    agri_feeds: () => { importResolu = true; return Promise.resolve({}); },
    smartfarm: () => { importResolu = true; return Promise.resolve({}); },
  };
  const actifs = enabledModuleEntryPoints(points, flags);
  assert.equal('agri_feeds' in actifs, false);
  assert.equal('smartfarm' in actifs, false);
  assert.equal('elevage' in actifs, true);
  assert.equal('dashboard' in actifs, true);
  for (const loader of Object.values(actifs)) assert.equal(typeof loader, 'function');
  assert.equal(importResolu, false, 'un import de module sous flag a été résolu');
});

test('flag désactivé = aucune requête pour les tables du module', () => {
  const flags = resolveModuleFlags({ settings: { modules: { smartfarm: false, financements: false } } }, {});
  assert.equal(isDataKeyEnabled('sensor_devices', flags), false);
  assert.equal(isDataKeyEnabled('camera_devices', flags), false);
  assert.equal(isDataKeyEnabled('smartfarm_events', flags), false);
  assert.equal(isDataKeyEnabled('funding_opportunities', flags), false);
  assert.equal(isDataKeyEnabled('funder_accounts', flags), false);
  assert.equal(isDataKeyEnabled('stock', flags), true);
  assert.equal(isDataKeyEnabled('taches', flags), true);
});

test('un module hors flag reste toujours actif', () => {
  const flags = resolveModuleFlags(null, {});
  for (const id of ['dashboard', 'elevage', 'commercial', 'finance_pilotage', 'gestion_systeme']) {
    assert.equal(isModuleEnabled(id, flags), true, `${id} devrait rester actif`);
  }
  for (const id of Object.keys(FLAGGED_MODULES)) {
    assert.equal(isModuleEnabled(id, { ...flags, [id]: false }), false);
  }
});
