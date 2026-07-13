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
  commitOfficialTransformation,
  computeCarcassYield,
  computeTransformationCosting,
  validateOfficialTransformationForm,
} from '../../src/utils/elevageTransformationWorkflow.js';
import { blockSanitaryAction, SANITARY_ACTIONS } from '../../src/utils/sanitaryWithdrawal.js';
import { buildErpDeepLink, parseErpDeepLinkFromSearch } from '../../src/utils/erpDeepLink.js';
import { resolveElevageTab } from '../../src/utils/commercialNavigation.js';
import { getTransformationPermissions } from '../../src/utils/elevageTransformationPermissions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (rel) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

describe('elevageTransformationOfficial — canal officiel', () => {
  it('Élevage monte ElevageTransformationTab avec formulaire officiel, pas bridges directs', () => {
    const elevage = readSrc('src/modules/ElevageRecoveredModule.jsx');
    const tab = readSrc('src/modules/elevage/ElevageTransformationTab.jsx');
    assert.match(elevage, /ElevageTransformationTab/);
    assert.doesNotMatch(elevage, /AnimalSlaughterStockBridge/);
    assert.doesNotMatch(elevage, /AvicoleTransformationBridge/);
    assert.match(tab, /TransformationOfficialForm/);
    assert.equal(TRANSFORMATION_FORM_ID, 'elevage-transformation-official-form');
  });

  it('Animaux et Avicole sans bridge abattage/transformation direct', () => {
    const animaux = readSrc('src/modules/AnimauxV2.jsx');
    const avicole = readSrc('src/modules/AvicoleV10.jsx');
    assert.doesNotMatch(animaux, /AnimalSlaughterStockBridge/);
    assert.doesNotMatch(animaux, /AvicoleTransformationBridge/);
    assert.doesNotMatch(avicole, /AnimalSlaughterStockBridge/);
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

  it('préremplit aussi un animal depuis l’action Transformer', () => {
    let tab = '';
    let draft = null;
    openElevageTransformationForm({
      setTab: (value) => { tab = value; },
      setTransformationDraft: (value) => { draft = value; },
      context: { animalId: 'ANI-1', transformType: 'reforme' },
    });
    assert.equal(tab, 'Transformation');
    assert.equal(draft.animal_id, 'ANI-1');
    assert.equal(draft.transform_type, 'reforme');
  });

  it('le deep-link Élevage Transformation conserve l’onglet demandé', () => {
    const link = buildErpDeepLink({ module: 'elevage', tab: 'transformation', demo: false });
    const parsed = parseErpDeepLinkFromSearch(link.split('?')[1]);
    assert.equal(parsed.module, 'elevage');
    assert.equal(parsed.tab, 'transformation');
    assert.equal(resolveElevageTab(parsed.tab), 'Transformation');
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
        date: '2026-07-13',
        confirmed: true,
        create_stock: true,
        poids_carcasse: 80,
        destination: 'stock',
      }),
      '',
    );
  });
});

describe('elevageTransformationOfficial — effets et rejeu', () => {
  it('crée une seule sortie, un stock, une allocation, un document et aucun vente', async () => {
    const animal = { id: 'ANI-1', name: 'Bovin 1', type: 'bovin', status: 'actif', purchase_cost: 100000 };
    const state = {
      animaux: [animal],
      stocks: [],
      stockMovements: [],
      transactions: [],
      documents: [],
      businessEvents: [],
      animalUpdates: 0,
      sales: 0,
    };
    const context = {
      animaux: state.animaux,
      lots: [],
      stocks: state.stocks,
      stockMovements: state.stockMovements,
      transactions: state.transactions,
      documents: state.documents,
      businessEvents: state.businessEvents,
      health: [],
      activeFarm: { id: 'FARM-1' },
    };
    const handlers = {
      onUpdateAnimal: async (_id, patch) => {
        state.animalUpdates += 1;
        Object.assign(animal, patch);
      },
      onCreateStock: async (row) => state.stocks.push(row),
      onCreateStockMovement: async (row) => state.stockMovements.push(row),
      onCreateFinanceTransaction: async (row) => state.transactions.push(row),
      onCreateDocument: async (row) => state.documents.push(row),
      onCreateBusinessEvent: async (row) => state.businessEvents.push(row),
      onCreateSale: async () => { state.sales += 1; },
    };
    const form = {
      id: 'TRF-1',
      event_key: 'transform:FARM-1:TRF-1',
      animal_id: 'ANI-1',
      transform_type: 'abattage',
      date: '2026-07-13',
      poids_vif: 500,
      poids_carcasse: 275,
      frais_abattage: 15000,
      produit_fini_nom: 'Carcasse bovine',
      destination: 'stock',
      create_stock: true,
      confirmed: true,
      preuve_url: 'https://example.test/certificat.pdf',
    };

    const first = await commitOfficialTransformation({ form, context, handlers });
    const replay = await commitOfficialTransformation({ form, context, handlers });

    assert.equal(first.replayed, false);
    assert.equal(replay.replayed, true);
    assert.equal(state.animalUpdates, 1);
    assert.equal(animal.status, 'abattu');
    assert.equal(state.stocks.length, 1);
    assert.equal(state.stockMovements.length, 1);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.transactions[0].cash_effect, false);
    assert.equal(state.documents.length, 1);
    assert.equal(state.businessEvents.length, 1);
    assert.equal(state.businessEvents[0].event_key, form.event_key);
    assert.equal(state.businessEvents[0].stock_id, state.stocks[0].id);
    assert.equal(state.sales, 0);
  });
});

describe('elevageTransformationOfficial — permissions', () => {
  it('respecte les capacités métier de chaque rôle', () => {
    assert.equal(getTransformationPermissions('promotrice_direction').canValidate, true);
    assert.equal(getTransformationPermissions('responsable_filiere').canValidate, true);
    assert.equal(getTransformationPermissions('terrain').canWrite, true);
    assert.equal(getTransformationPermissions('terrain').canViewCosts, false);
    assert.equal(getTransformationPermissions('veterinaire').canOverrideSanitary, true);
    assert.equal(getTransformationPermissions('finance').canViewCosts, true);
    assert.equal(getTransformationPermissions('finance').canWriteAnimal, false);
    assert.equal(getTransformationPermissions('financeur_externe').canView, false);
    assert.equal(getTransformationPermissions('admin_support').auditedAccess, true);
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
