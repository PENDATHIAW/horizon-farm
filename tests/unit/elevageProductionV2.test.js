import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildProductionDiagnostic,
  listProductionDiagnosticTargets,
  pickMostCriticalTarget,
} from '../../src/utils/elevageProductionDiagnostic.js';
import { PRODUCTION_FINANCE_LABELS } from '../../src/utils/productionFinancialTruth.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const productionHubSrc = readFileSync(join(root, 'src/modules/elevage/ProductionHub.jsx'), 'utf8');
const panelSrc = readFileSync(join(root, 'src/modules/elevage/ProductionDiagnosticPanel.jsx'), 'utf8');

test('Production V2 — pas de bouton "Analyser ce lot"', () => {
  assert.doesNotMatch(productionHubSrc, /Analyser ce lot/);
  assert.doesNotMatch(panelSrc, /Analyser ce lot/);
});

test('Production V2 — sélection manuelle et analyse automatique du plus critique', () => {
  assert.match(panelSrc, /Sélectionner une entité/);
  assert.match(panelSrc, /Analyser le plus critique/);
  assert.match(productionHubSrc, /ProductionDiagnosticPanel/);
});

test('Production V2 — libellés financiers explicites dans le hub', () => {
  assert.match(productionHubSrc, /PRODUCTION_FINANCE_LABELS\.marginGross/);
  assert.match(productionHubSrc, /PRODUCTION_FINANCE_SOURCE/);
  assert.equal(PRODUCTION_FINANCE_LABELS.marginGross, 'Marge brute technique');
  assert.equal(PRODUCTION_FINANCE_LABELS.costTotal, 'Coût de production unifié');
});

test('listProductionDiagnosticTargets — chair, pondeuse, bovin et transformation', () => {
  const targets = listProductionDiagnosticTargets({
    lots: [
      {
        id: 'C1',
        type: 'Chair',
        name: 'Chair critique',
        initial_count: 100,
        current_count: 85,
        mortality: 15,
        weight_avg: 1.2,
        status: 'actif',
        target_weight: 2.0,
        age_days: 35,
      },
      {
        id: 'P1',
        type: 'Pondeuse',
        name: 'Ponte A',
        initial_count: 200,
        current_count: 200,
        taux_ponte: 65,
      },
    ],
    animaux: [
      {
        id: 'B1',
        type: 'Bovin',
        espece: 'bovin',
        name: 'Embouche 4',
        poids: 380,
        poids_entree: 300,
        poids_cible: 450,
        age_days: 120,
        status: 'actif',
      },
      {
        id: 'O1',
        type: 'Ovin',
        espece: 'ovin',
        name: 'Brebis 1',
        poids: 45,
        status: 'actif',
      },
    ],
    transformationRows: [
      { id: 'T1', kind: 'abattage', kindLabel: 'Abattage', date: '2026-06-01' },
      { id: 'T2', kind: 'transformation', kindLabel: 'Transformation', date: '2026-06-02' },
    ],
    meatStockKg: 2,
    marginContext: { feedLogs: [], productionLogs: [], healthEvents: [] },
  });

  const categories = new Set(targets.map((t) => t.category));
  assert.ok(categories.has('Chair'));
  assert.ok(categories.has('Pondeuses'));
  assert.ok(categories.has('Bovins'));
  assert.ok(categories.has('Ovins'));
  assert.ok(targets.some((t) => t.type === 'transformation'));
});

test('pickMostCriticalTarget — priorise retard de croissance chair', () => {
  const picked = pickMostCriticalTarget({
    lots: [
      {
        id: 'C1',
        type: 'Chair',
        name: 'Chair critique',
        initial_count: 100,
        current_count: 90,
        mortality: 5,
        weight_avg: 1.1,
        status: 'actif',
        target_weight: 2.2,
        age_days: 40,
      },
      {
        id: 'P1',
        type: 'Pondeuse',
        name: 'Ponte stable',
        initial_count: 200,
        current_count: 200,
        taux_ponte: 92,
      },
    ],
    animaux: [],
    marginContext: { feedLogs: [], productionLogs: [], healthEvents: [] },
  });

  assert.ok(picked?.target);
  assert.equal(picked.target.type, 'lot_chair');
  assert.match(picked.target.selectionHint || '', /retard de croissance/i);
});

test('buildProductionDiagnostic — format métier Constat / Cause / Impact / Action', () => {
  const target = {
    id: 'lot:C1',
    entityId: 'C1',
    type: 'lot_chair',
    category: 'Chair',
    label: 'Embouche 4',
    selectionHint: 'retard de croissance de 11 %',
    entity: {
      id: 'C1',
      type: 'Chair',
      name: 'Embouche 4',
      initial_count: 100,
      current_count: 90,
      weight_avg: 1.1,
      target_weight: 2.2,
      age_days: 40,
      mortality: 5,
    },
  };

  const diag = buildProductionDiagnostic(target, {
    lots: [target.entity],
    feedLogs: [],
    productionLogs: [],
    healthEvents: [],
  });

  assert.ok(diag);
  assert.match(diag.selectionReason, /Lot analysé : Embouche 4 \(retard de croissance de 11 %\)/);
  assert.ok(diag.constat);
  assert.ok(diag.causeProbable);
  assert.ok(diag.impact);
  assert.ok(diag.actionRecommandee);
  assert.equal(diag.financial.margin.label, PRODUCTION_FINANCE_LABELS.marginGross);
});

test('buildProductionDiagnostic — animal avec préfixe Animal analysé', () => {
  const target = {
    id: 'animal:B1',
    entityId: 'B1',
    type: 'animal_bovin',
    category: 'Bovins',
    label: 'Embouche 4',
    selectionHint: 'retard de croissance de 15 %',
    entity: {
      id: 'B1',
      type: 'Bovin',
      name: 'Embouche 4',
      poids: 350,
      poids_entree: 280,
      age_days: 150,
      status: 'actif',
    },
  };

  const diag = buildProductionDiagnostic(target, {
    feedLogs: [],
    healthEvents: [],
  });

  assert.match(diag.selectionReason, /Animal analysé : Embouche 4/);
});
