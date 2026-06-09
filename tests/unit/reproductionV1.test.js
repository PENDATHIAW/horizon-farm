import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretHorizonCommand } from '../../src/services/aiIntentEngine.js';
import { shouldAutoOpenHeyHorizonForm, AUTO_OPEN_FORM_TYPES } from '../../src/services/heyHorizonAssistantService.js';
import { resolveAnimalScan } from '../../src/services/animalQrScanService.js';
import {
  buildReproductionKpis,
  isFemaleAnimal,
  predictDueDate,
  shouldRouteDraftToReproduction,
  isBirthAcquisitionDraft,
} from '../../src/utils/reproductionMetrics.js';
import { buildReproductionWorkflowDraft } from '../../src/utils/elevageReproductionNavigation.js';
import { useAnimalWorkflowHandlers } from '../../src/modules/elevage/useAnimalWorkflowHandlers.js';
import {
  setupTestStorage,
  assertModuleTabStable,
  buildSimulatedProps,
} from './helpers/moduleTabTestHarness.js';

setupTestStorage();

const FEMALE = {
  id: 'BOV-F1',
  name: 'Vache 1',
  sexe: 'F',
  type: 'Bovin',
  status: 'actif',
  en_gestation: true,
  date_debut_gestation: '2026-01-01',
  date_prevue_mise_bas: '2026-10-08',
  farm_id: 'f1',
};

const MALE = {
  id: 'BOV-M1',
  name: 'Taureau',
  sexe: 'M',
  type: 'Bovin',
  status: 'actif',
  farm_id: 'f1',
};

test('reproduction metrics — femelles strictes et KPI', () => {
  const animaux = [
    FEMALE,
    MALE,
    { id: 'BOV-X', sexe: 'femelle', type: 'Bovin', status: 'vendu' },
    { id: 'LOT-1', type: 'Pondeuse' },
  ];
  const kpis = buildReproductionKpis({
    animaux,
    businessEvents: [
      { id: 'E1', event_type: 'naissance', event_date: '2026-06-01', title: 'Naissance' },
      { id: 'E2', event_type: 'vente', event_date: '2026-06-02', title: 'Vente' },
    ],
    periodStart: '2026-05-01',
  });
  assert.equal(isFemaleAnimal(FEMALE), true);
  assert.equal(isFemaleAnimal(MALE), false);
  assert.equal(kpis.females, 1);
  assert.equal(kpis.gestantes, 1);
  assert.equal(kpis.birthEvents, 1);
  assert.ok(kpis.alerts.length >= 0);
  assert.equal(kpis.gestantesList[0].id, 'BOV-F1');
});

test('reproduction metrics — prédiction mise bas bovin', () => {
  const due = predictDueDate({ type: 'Bovin' }, '2026-01-01');
  assert.equal(due, '2026-10-08');
});

test('routing drafts reproduction', () => {
  assert.equal(
    shouldRouteDraftToReproduction({
      module: 'animaux',
      draft: { form_type: 'animal_creation', draft_fields: { mode_acquisition: 'naissance_ferme' } },
    }),
    true,
  );
  assert.equal(
    shouldRouteDraftToReproduction({
      module: 'elevage',
      draft: { form_type: 'reproduction_gestation' },
    }),
    true,
  );
  assert.equal(isBirthAcquisitionDraft({ draft_fields: { mode_acquisition: 'reproduction_interne' } }), true);
});

test('voix → draft reproduction (pas auto-commit)', () => {
  const gestation = interpretHorizonCommand('BOV001 en gestation');
  assert.equal(gestation.intent, 'reproduction_gestation');
  assert.equal(gestation.primary_module, 'elevage');
  assert.equal(gestation.form_type, 'reproduction_gestation');
  assert.equal(gestation.status, 'awaiting_validation');
  assert.equal(gestation.draft_fields.animal_id, 'BOV001');
  assert.equal(shouldAutoOpenHeyHorizonForm(gestation), true);
  assert.equal(AUTO_OPEN_FORM_TYPES.has('reproduction_mise_bas'), true);

  const miseBas = interpretHorizonCommand('mise bas vache BOV-F1');
  assert.equal(miseBas.intent, 'reproduction_mise_bas');
  assert.equal(miseBas.form_type, 'reproduction_mise_bas');
});

test('scan mère — resolveAnimalScan', () => {
  const result = resolveAnimalScan('BOV-F1', [FEMALE, MALE]);
  assert.equal(result.found, true);
  assert.equal(result.animalId, 'BOV-F1');
});

test('wrapCreate — pas d’opportunité vente sur naissance', async () => {
  let oppCreated = false;
  const props = {
    rows: [],
    onCreate: async (payload) => payload,
    onCreateOpportunity: async () => { oppCreated = true; },
    onRefreshOpportunities: async () => {},
    onCreateBusinessEvent: async () => {},
    onRefreshBusinessEvents: async () => {},
  };
  const { wrapCreate } = useAnimalWorkflowHandlers({ props, species: 'Bovin', opportunities: [] });
  await wrapCreate({ id: 'BOV-N1', mode_acquisition: 'naissance_ferme', name: 'Veau', type: 'Bovin', status: 'actif' });
  assert.equal(oppCreated, false);

  await wrapCreate({ id: 'BOV-A1', mode_acquisition: 'achat', name: 'Achat', type: 'Bovin', status: 'actif', pret_vente: true, prix_vente_estime: 100000 });
  assert.equal(oppCreated, true);
});

test('workflow draft builder', () => {
  const draft = buildReproductionWorkflowDraft({ workflow: 'gestation', animalId: 'BOV-F1' });
  assert.equal(draft.form_type, 'reproduction_gestation');
  assert.equal(draft.primary_module, 'elevage');
  assert.equal(draft.draft_fields.animal_id, 'BOV-F1');
});

test('mount Élevage — onglet Reproduction stable', async () => {
  const props = buildSimulatedProps({
    animaux: [FEMALE, MALE],
    businessEvents: [{ id: 'E1', event_type: 'gestation', event_date: '2026-06-01', title: 'Gestation' }],
  });
  await assertModuleTabStable('elevage', 'Reproduction', props);
});
