import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const reproTabSrc = readFileSync(join(root, 'src/modules/elevage/ElevageCyclesReproductionTab.jsx'), 'utf8');
const productionHubSrc = readFileSync(join(root, 'src/modules/elevage/ProductionHub.jsx'), 'utf8');
const lotsTabSrc = readFileSync(join(root, 'src/modules/elevage/ElevageLotsBandesTab.jsx'), 'utf8');
const recoveredSrc = readFileSync(join(root, 'src/modules/ElevageRecoveredModule.jsx'), 'utf8');

test('Reproduction — workflow ouvert à la demande (pas de formulaire gestation par défaut)', () => {
  assert.match(reproTabSrc, /reproductionFormProps\?\.draft \? <ReproductionWorkflowForm/);
  assert.match(reproTabSrc, /\+ Saillie/);
  assert.match(reproTabSrc, /\+ Mise bas \/ naissance/);
  assert.doesNotMatch(recoveredSrc, /reproductionHorizonDraft \|\| buildReproductionWorkflowDraft/);
});

test('Lots & bandes — action mortalité lot accessible', () => {
  assert.match(lotsTabSrc, /mortality/);
  assert.match(lotsTabSrc, /Mortalité/);
});

test('Production — hub orienté performances (pas registre hero)', () => {
  assert.match(productionHubSrc, /Performances & rendements/);
  assert.match(productionHubSrc, /Œufs vendables \(7 j\)/);
  assert.match(productionHubSrc, /PRODUCTION_FINANCE_LABELS\.marginGross/);
  assert.match(productionHubSrc, /Registre bovins/);
  assert.doesNotMatch(productionHubSrc, /Lots chair actifs/);
});

test('Transformation — finance handlers câblés', () => {
  assert.match(recoveredSrc, /onCreateFinanceTransaction/);
  assert.match(recoveredSrc, /transactions: rowsOf\(props\.transactions/);
});
