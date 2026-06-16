import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MODULE_TARGET_TABS, MODULE_AUDIT_ORDER } from '../../src/config/horizonVision.config.js';
import { resolveCulturesTab } from '../../src/utils/culturesNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const recovered = readFileSync(join(root, 'src/modules/CulturesRecoveredModule.jsx'), 'utf8');
const workflowBridge = readFileSync(join(root, 'src/modules/CulturesWorkflowBridge.jsx'), 'utf8');
const tabActionsBridge = readFileSync(join(root, 'src/modules/CulturesTabActionsBridge.jsx'), 'utf8');
const culturesV3 = readFileSync(join(root, 'src/modules/CulturesV3.jsx'), 'utf8');
const parcellesHub = readFileSync(join(root, 'src/modules/cultures/CulturesParcellesHub.jsx'), 'utf8');
const santeHub = readFileSync(join(root, 'src/modules/cultures/CulturesSanteHub.jsx'), 'utf8');
const recoltesHub = readFileSync(join(root, 'src/modules/cultures/CulturesRecoltesHub.jsx'), 'utf8');
const intrantsHub = readFileSync(join(root, 'src/modules/cultures/CulturesIntrantsHub.jsx'), 'utf8');
const harvestPanel = readFileSync(join(root, 'src/modules/cultures/CulturesHarvestPanel.jsx'), 'utf8');
const transformPanel = readFileSync(join(root, 'src/modules/cultures/CulturesTransformationPanel.jsx'), 'utf8');
const transformHub = readFileSync(join(root, 'src/modules/cultures/CulturesTransformationHub.jsx'), 'utf8');
const healthPanel = readFileSync(join(root, 'src/modules/CultureOperationalHealthPanel.jsx'), 'utf8');

test('Cultures V1 — 3 onglets cible dans horizonVision', () => {
  const tabs = MODULE_TARGET_TABS.cultures;
  assert.equal(tabs.length, 3);
  assert.deepEqual(tabs, ['Parcelles & campagnes', 'Récoltes', 'Économie circulaire']);
  assert.ok(MODULE_AUDIT_ORDER.includes('cultures'));
});

test('Cultures V1 — navigation legacy mappée', () => {
  assert.equal(resolveCulturesTab('Résumé'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Parcelles'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes');
  assert.equal(resolveCulturesTab('Graphiques'), 'Économie circulaire');
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

test('Récolte unique — commitCultureHarvest, pas saveHarvest', () => {
  assert.doesNotMatch(tabActionsBridge, /saveHarvest/);
  assert.doesNotMatch(tabActionsBridge, /Ajouter récolte/);
  assert.match(harvestPanel, /commitCultureHarvest/);
  assert.match(recovered, /derniere_recolte_id/);
});

test('Intrants uniquement via Intrants & Météo', () => {
  assert.match(intrantsHub, /actionsMode="input"/);
  assert.doesNotMatch(parcellesHub, /actionsMode/);
  assert.match(culturesV3, /embeddedMode \? null : <CulturesTabActionsBridge/);
  const showMain = tabActionsBridge.match(/\{showMain \?[\s\S]*?\} : null\}\{showInputOnly/)?.[0] || '';
  assert.doesNotMatch(showMain, /Utiliser intrant/);
});

test('Pertes via Santé avec Finance (runCultureLossSideEffects)', () => {
  assert.match(santeHub, /actionsMode="loss"/);
  assert.match(tabActionsBridge, /runCultureLossSideEffects/);
  const showMain = tabActionsBridge.match(/\{showMain \?[\s\S]*?\} : null\}\{showInputOnly/)?.[0] || '';
  assert.doesNotMatch(showMain, /Déclarer perte/);
});

test('Opportunités uniquement via Récoltes', () => {
  assert.doesNotMatch(tabActionsBridge, /Confirmer vendable/);
  assert.doesNotMatch(tabActionsBridge, /createOpportunity/);
  assert.match(recoltesHub, /CulturesSaleOpportunityBridge/);
});

test('Pas de promesse caméra IA', () => {
  assert.doesNotMatch(santeHub, /Diagnostic caméra IA/);
  assert.doesNotMatch(santeHub, /caméra/);
});

test('Mode intégré Parcelles sans sous-onglets V3', () => {
  assert.match(parcellesHub, /embeddedMode/);
  assert.match(culturesV3, /embeddedMode \? null : <div className="flex flex-wrap gap-2"/);
  assert.match(culturesV3, /embeddedMode \? <>\s*<DataTable title="Cultures"/s);
  assert.match(culturesV3, /<DataTable title="Parcelles"/);
});

test('Transformation — workflow réel commitCultureTransformation', () => {
  assert.match(transformPanel, /commitCultureTransformation/);
  assert.match(transformHub, /CulturesTransformationPanel/);
  assert.match(recoltesHub, /CulturesTransformationPanel/);
  assert.match(readFileSync(join(root, 'src/utils/culturesWorkflow.js'), 'utf8'), /export async function commitCultureTransformation/);
});

test('Navigation ERP — IDs modules valides', () => {
  assert.match(healthPanel, /achats_stock/);
  assert.match(healthPanel, /commercial/);
  assert.doesNotMatch(healthPanel, /onNavigate\?\.\('stock'\)/);
  assert.doesNotMatch(healthPanel, /onNavigate\?\.\('ventes'\)/);
});

test('Champs récolte verrouillés en édition fiche', () => {
  assert.match(culturesV3, /quantite_recoltee.*readonly/s);
  assert.match(culturesV3, /quantite_disponible.*readonly/s);
});
