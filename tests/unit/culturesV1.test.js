import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { resolveCulturesTab } from '../../src/utils/culturesNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const recovered = readFileSync(join(root, 'src/modules/CulturesRecoveredModule.jsx'), 'utf8');
const workflowBridge = readFileSync(join(root, 'src/modules/CulturesWorkflowBridge.jsx'), 'utf8');

test('Cultures V1 — 10 onglets cible dans horizonVision', () => {
  const tabs = MODULE_TARGET_TABS.cultures;
  assert.equal(tabs.length, 10);
  assert.ok(tabs.includes('Pilotage'));
  assert.ok(tabs.includes('Récoltes'));
  assert.ok(tabs.includes('Transformation'));
  assert.ok(tabs.includes('Économie circulaire'));
});

test('Cultures V1 — navigation legacy mappée', () => {
  assert.equal(resolveCulturesTab('Résumé'), 'Pilotage');
  assert.equal(resolveCulturesTab('Parcelles'), 'Parcelles & Cultures');
  assert.equal(resolveCulturesTab('Campagnes'), 'Cycles');
});

test('CulturesRecoveredModule — shell ModuleTabsBar + hubs', () => {
  assert.match(recovered, /ModuleTabsBar/);
  assert.match(recovered, /moduleId="cultures"/);
  assert.match(recovered, /CulturesPilotageHub/);
  assert.match(recovered, /CulturesRecoltesHub/);
  assert.doesNotMatch(recovered, /CulturesV4/);
});

test('CulturesWorkflowBridge — pas de récolte prompt (workflow officiel Récoltes)', () => {
  assert.doesNotMatch(workflowBridge, /registerHarvest/);
  assert.doesNotMatch(workflowBridge, /stockCrud/);
});
