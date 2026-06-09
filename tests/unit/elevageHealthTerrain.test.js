import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (rel) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');
import {
  buildHealthInterventionDraft,
  HEALTH_INTERVENTION_FORM_ID,
  HEALTH_TERRAIN_BANNER,
  navigateToHealthStock,
  openElevageHealthForm,
} from '../../src/utils/elevageHealthNavigation.js';
import { filterStocksByContext } from '../../src/utils/productionNavigation.js';
import { validateElevageHealthForm } from '../../src/utils/elevageWorkflow.js';

describe('elevageHealthTerrain — canal officiel', () => {
  it('le modal santé pauvre est retiré de ElevageWorkflowPanels', () => {
    const src = readSrc('src/modules/elevage/ElevageWorkflowPanels.jsx');
    assert.doesNotMatch(src, /activeModal === 'health'/);
    assert.doesNotMatch(src, /Soin \/ vaccin — Élevage/);
    assert.doesNotMatch(src, /commitElevageHealth/);
  });

  it('ElevageRecoveredModule redirige health vers openElevageHealthForm', () => {
    const src = readSrc('src/modules/ElevageRecoveredModule.jsx');
    assert.match(src, /openElevageHealthForm/);
    assert.match(src, /modal === 'health'/);
    assert.match(src, /healthDraft/);
  });

  it('SanteV6 expose le formulaire complet avec id terrain', () => {
    const src = readSrc('src/modules/SanteV6.jsx');
    assert.match(src, /HEALTH_INTERVENTION_FORM_ID/);
    assert.match(src, /healthDraft/);
    assert.match(src, /FileInput/);
    assert.match(src, /interventionTypes/);
    assert.equal(HEALTH_INTERVENTION_FORM_ID, 'elevage-health-intervention-form');
  });
});

describe('elevageHealthTerrain — brouillon contexte', () => {
  it('préremplit animal cible', () => {
    const draft = buildHealthInterventionDraft({ animalId: 'A-42', typeIntervention: 'curatif' });
    assert.equal(draft.target_mode, 'detail:animal');
    assert.equal(draft.target_detail, 'animal:A-42');
    assert.equal(draft.type_intervention, 'curatif');
    assert.equal(draft.source, 'elevage_terrain');
  });

  it('préremplit lot cible', () => {
    const draft = buildHealthInterventionDraft({ lotId: 'L-7' });
    assert.equal(draft.target_mode, 'detail:lot');
    assert.equal(draft.target_detail, 'lot:L-7');
  });

  it('openElevageHealthForm bascule onglet Santé', () => {
    let tab = 'Résumé';
    let draft = null;
    openElevageHealthForm({
      setTab: (t) => { tab = t; },
      setHealthDraft: (d) => { draft = d; },
      context: { lotId: 'LOT-1' },
    });
    assert.equal(tab, 'Santé');
    assert.equal(draft.target_detail, 'lot:LOT-1');
  });
});

describe('elevageHealthTerrain — stock et preuves', () => {
  it('navigation stock santé contextualisée', () => {
    const calls = [];
    navigateToHealthStock((module, opts) => calls.push({ module, opts }));
    assert.equal(calls[0].module, 'achats_stock');
    assert.equal(calls[0].opts.tab, 'Stock');
    assert.equal(calls[0].opts.stockContext, 'sante');
    assert.match(calls[0].opts.contextMessage, /Médicaments/);
  });

  it('filtre stockContext sante sur vaccins/médicaments', () => {
    const rows = [
      { id: '1', produit: 'Vaccin Newcastle', categorie: 'vaccin', quantite: 5 },
      { id: '2', produit: 'Aliment poulet', categorie: 'aliment', quantite: 100 },
    ];
    const filtered = filterStocksByContext(rows, 'sante', 'vaccin');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '1');
  });

  it('bannière terrain mentionne preuve photo/document', () => {
    assert.match(HEALTH_TERRAIN_BANNER, /photo/i);
    assert.match(HEALTH_TERRAIN_BANNER, /ordonnance/i);
  });

  it('sauvegarde sans preuve reste possible via validation commitElevageHealth', () => {
    assert.equal(
      validateElevageHealthForm({ nom: 'Vaccin', lot_id: 'L1', cout: 500 }),
      '',
    );
  });
});
