import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  MARGIN_GROSS_DEFINITION,
  MARGIN_GROSS_DEFINITION_SHORT,
  PRODUCTION_FINANCE_LABELS,
} from '../../src/utils/productionFinancialTruth.js';
import { interpretHorizonCommand } from '../../src/services/aiIntentEngine.js';
import { parseContextualVoicePhrase } from '../../src/services/aiGateway/contextualVoiceParser.js';
import { isFarmScopeFilteringEnabled } from '../../src/utils/farmScope.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const recoveredSrc = readFileSync(join(root, 'src/modules/ElevageRecoveredModule.jsx'), 'utf8');
const workflowPanelsSrc = readFileSync(join(root, 'src/modules/elevage/ElevageWorkflowPanels.jsx'), 'utf8');

test('P1-01 — définition marge brute technique unique', () => {
  assert.equal(PRODUCTION_FINANCE_LABELS.marginGross, 'Marge brute technique');
  assert.match(MARGIN_GROSS_DEFINITION, /Revenus/);
  assert.match(MARGIN_GROSS_DEFINITION_SHORT, /coût de production unifié ERP/i);
});

test('P1-02 — santé rapide redirige vers onglet Santé (pas modale dédiée)', () => {
  assert.match(recoveredSrc, /modal === 'health'[\s\S]*setTab\('Santé'\)/);
  assert.doesNotMatch(workflowPanelsSrc, /commitElevageHealth/);
});

test('P1-03 — reproduction hub : KPI gestantes et fusion femelles', () => {
  assert.match(recoveredSrc, /Femelles gestantes/);
  assert.match(recoveredSrc, /Femelles reproductrices/);
  assert.doesNotMatch(recoveredSrc, /Historique naissances/);
  assert.match(recoveredSrc, /Gestations en cours|Naissances récentes/);
});

test('P1-04 — alimentation KPI reflète healthPredictions', () => {
  assert.match(recoveredSrc, /Alertes santé liées/);
  assert.doesNotMatch(recoveredSrc, /Prévisions IA/);
});

test('P1-05 — mobile : message barre actions rapide', () => {
  assert.match(recoveredSrc, /barre d'actions rapide ci-dessous|barre d&apos;actions rapide ci-dessous/);
});

test('P1-07 — transformation abattage scroll bridge (pas setTab Animaux seul)', () => {
  assert.match(recoveredSrc, /elevage-animal-slaughter-bridge/);
  assert.match(recoveredSrc, /scrollIntoView/);
});

test('P1-09 — filtrage ferme opt-in via VITE_ENABLE_FARM_FILTER', () => {
  assert.equal(isFarmScopeFilteringEnabled(), false);
  assert.equal(isFarmScopeFilteringEnabled({ forceFilter: true }), true);
});

test('P1-10 — voix : naissance draft + validation humaine', () => {
  const voice = parseContextualVoicePhrase('Mise bas brebis — agneau né ce matin', { animaux: [] });
  assert.ok(voice.drafts.some((d) => d.intent === 'animal_birth' || d.draft?.intent === 'animal_birth'));
  const primary = voice.drafts[0];
  assert.equal(primary.required_validation, true);
  assert.notEqual(primary.user_validated, true);

  const intent = interpretHorizonCommand('Naissance agneau sur la ferme');
  assert.equal(intent.intent, 'animal_birth');
  assert.equal(intent.form_type, 'animal_creation');
  assert.equal(intent.draft_fields?.mode_acquisition, 'naissance_ferme');
  assert.equal(intent.requires_validation, true);
});

test('P1-10 — voix : pesée et mortalité animal (draft)', () => {
  const weigh = interpretHorizonCommand('Pesée animal BOV002 420 kg');
  assert.equal(weigh.intent, 'animal_weighing');
  assert.equal(weigh.form_type, 'animal_weighing');

  const loss = interpretHorizonCommand('Animal BOV002 mort');
  assert.equal(loss.intent, 'animal_loss');
  assert.equal(loss.form_type, 'animal_loss');
});
