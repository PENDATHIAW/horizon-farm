import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  BP_LINE_STATUS,
  buildBpLineConcretizationRoute,
  buildBpLineStatusPatch,
  normalizeBpLineStatus,
} from '../../src/utils/bpLineConcretization.js';
import { resolveBpLineActions } from '../../src/utils/bpLineLinkage.js';
import BpLineActionsMenu from '../../src/components/investments/BpLineActionsMenu.jsx';

const editableLine = {
  id: 'BPLI-TEST-001',
  business_plan_id: 'BP-HORIZON-FARM',
  designation: 'Abreuvoir 5L',
  quantite: 10,
  prix_unitaire: 25000,
  statut: 'a_concretiser',
  module_cible: 'achats_stock',
  nature: 'materiel',
};

const previewLine = {
  id: 'off-0',
  designation: 'Abreuvoir 5L',
  quantite: 10,
  prix_unitaire: 25000,
  statut: 'a_concretiser',
  module_cible: 'achats_stock',
  nature: 'materiel',
};

describe('Finance Investissements — anti-régression actions BP', () => {
  it('ligne éditable expose Concrétiser + menu Modifier/Reporter/Annuler', () => {
    const { primary, repair, editable } = resolveBpLineActions(editableLine, { kind: 'investment' });
    assert.equal(editable, true);
    assert.ok(primary.some((a) => a.id === 'concretize'), 'Concrétiser attendu');
    assert.ok(repair.some((a) => a.id === 'edit'), 'Modifier attendu');
    assert.ok(repair.some((a) => a.id === 'postpone'), 'Reporter attendu');
    assert.ok(repair.some((a) => a.id === 'cancel'), 'Annuler attendu');
  });

  it('ligne aperçu off-* : menu preview avec 4 actions visibles au rendu', () => {
    const html = renderToString(
      React.createElement(BpLineActionsMenu, {
        line: previewLine,
        kind: 'investment',
        allowPreviewActions: true,
        onAction: () => {},
      }),
    );
    assert.match(html, /Concrétiser/);
    assert.match(html, /Modifier/);
    assert.match(html, /Reporter/);
    assert.match(html, /Annuler/);
  });

  it('ligne aperçu sans allowPreviewActions ne rend pas de menu', () => {
    const html = renderToString(
      React.createElement(BpLineActionsMenu, {
        line: previewLine,
        kind: 'investment',
        onAction: () => {},
      }),
    );
    assert.equal(html, '');
  });

  it('buildBpLineStatusPatch produit statuts reporté et annulé', () => {
    assert.equal(buildBpLineStatusPatch(BP_LINE_STATUS.REPORTE).statut, BP_LINE_STATUS.REPORTE);
    assert.equal(buildBpLineStatusPatch(BP_LINE_STATUS.ANNULE).statut, BP_LINE_STATUS.ANNULE);
    assert.equal(normalizeBpLineStatus({ statut: 'reporte' }), BP_LINE_STATUS.REPORTE);
    assert.equal(normalizeBpLineStatus({ statut: 'annulee' }), BP_LINE_STATUS.ANNULE);
  });

  it('route concrétisation matériel achats vers achats_stock', () => {
    const route = buildBpLineConcretizationRoute(editableLine);
    assert.ok(route);
    assert.equal(route.navigate.module, 'achats_stock');
  });
});
