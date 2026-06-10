import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildTransformationDraft,
  openElevageTransformationForm,
  TRANSFORMATION_FORM_ID,
} from '../../src/utils/elevageTransformationNavigation.js';
import {
  computeCarcassYield,
  computeTransformationCosting,
  validateOfficialTransformationForm,
} from '../../src/utils/elevageTransformationWorkflow.js';
import { blockSanitaryAction, SANITARY_ACTIONS } from '../../src/utils/sanitaryWithdrawal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (rel) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

describe('elevageTransformationOfficial — canal officiel', () => {
  it('TransformationHub monte TransformationOfficialForm, pas les bridges', () => {
    const src = readSrc('src/modules/ElevageRecoveredModule.jsx');
    assert.match(src, /TransformationOfficialForm/);
    assert.doesNotMatch(src, /AnimalSlaughterStockBridge/);
    assert.doesNotMatch(src, /AvicoleTransformationBridge/);
    assert.equal(TRANSFORMATION_FORM_ID, 'elevage-transformation-official-form');
  });

  it('Animaux et Avicole préparent sans bridge stock direct', () => {
    const animaux = readSrc('src/modules/AnimauxV2.jsx');
    const avicole = readSrc('src/modules/AvicoleV10.jsx');
    assert.match(animaux, /PrepareTransformationPanel/);
    assert.doesNotMatch(animaux, /AnimalSlaughterStockBridge/);
    assert.match(avicole, /PrepareTransformationPanel/);
    assert.doesNotMatch(avicole, /AvicoleTransformationBridge/);
  });

  it('openWorkflow transform redirige vers formulaire officiel', () => {
    const src = readSrc('src/modules/ElevageRecoveredModule.jsx');
    assert.match(src, /onPrepareTransformation/);
    assert.match(src, /modal === 'transform'/);
  });
});

describe('elevageTransformationOfficial — brouillon et calculs', () => {
  it('préremplit animal_id', () => {
    const draft = buildTransformationDraft({ animalId: 'A-99', transformType: 'abattage' });
    assert.equal(draft.animal_id, 'A-99');
    assert.equal(draft.source_type, 'animal');
    assert.equal(draft.transform_type, 'abattage');
  });

  it('openElevageTransformationForm bascule onglet Transformation', () => {
    let tab = 'Résumé';
    let draft = null;
    openElevageTransformationForm({
      setTab: (t) => { tab = t; },
      setTransformationDraft: (d) => { draft = d; },
      context: { lotId: 'LOT-CHAIR-1', activity: 'chair' },
    });
    assert.equal(tab, 'Transformation');
    assert.equal(draft.lot_id, 'LOT-CHAIR-1');
  });

  it('calcule rendement carcasse', () => {
    assert.equal(computeCarcassYield(100, 55), 55);
    assert.equal(computeCarcassYield(0, 50), null);
  });

  it('coût incomplet affiche message prudent', () => {
    const costing = computeTransformationCosting({
      form: { poids_carcasse: 50, frais_abattage: 1000 },
      animal: { id: 'A1', purchase_cost: 0 },
      alimentationLogs: [],
      healthRows: [],
      businessEvents: [],
    });
    assert.equal(costing.incomplete, true);
    assert.match(costing.costMessage, /partiel/i);
  });

  it('validation exige confirmation humaine', () => {
    assert.match(
      validateOfficialTransformationForm({ animal_id: 'A1', transform_type: 'abattage', confirmed: false }),
      /Confirmation/,
    );
    assert.equal(
      validateOfficialTransformationForm({
        animal_id: 'A1',
        transform_type: 'abattage',
        confirmed: true,
        create_stock: true,
        poids_carcasse: 80,
        destination: 'stock',
      }),
      '',
    );
  });
});

describe('elevageTransformationOfficial — délai sanitaire', () => {
  it('bloque transformation si délai actif', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const until = future.toISOString().slice(0, 10);
    const block = blockSanitaryAction({
      healthRows: [{ id: 'H1', animal_id: 'A1', delai_sanitaire_fin: until }],
      action: SANITARY_ACTIONS.TRANSFORM,
      animalId: 'A1',
    });
    assert.equal(block.blocked, true);
  });

  it('override exige justification dans le formulaire', () => {
    assert.match(
      validateOfficialTransformationForm({
        animal_id: 'A1',
        transform_type: 'abattage',
        confirmed: true,
        sanitary_override: true,
        sanitary_override_reason: '',
      }),
      /Justification/,
    );
  });
});
