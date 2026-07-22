import test from 'node:test';
import assert from 'node:assert/strict';
import { isSimulatedRow, stripSimulatedRows } from '../../src/context/AppContext.js';
import { horizonFarmSimulationSeed as seed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { buildDecisionBriefing } from '../../src/utils/decisionBriefing.js';

test('isSimulatedRow : détecte la provenance simulée', () => {
  assert.equal(isSimulatedRow({ source: 'simulation_bp_horizon_farm' }), true);
  assert.equal(isSimulatedRow({ source: 'simulation_pondeuses' }), true);
  assert.equal(isSimulatedRow({ source: 'saisie_terrain' }), false);
  assert.equal(isSimulatedRow({}), false);
});

test('mode données réelles : tout le jeu simulé est retiré (par provenance)', () => {
  const stripped = stripSimulatedRows(seed);
  const remaining = Object.entries(stripped)
    .filter(([, rows]) => Array.isArray(rows))
    .flatMap(([, rows]) => rows)
    .filter((row) => isSimulatedRow(row));
  assert.equal(remaining.length, 0, 'aucune ligne simulée ne subsiste');
});

test('même si un identifiant de seed dérive, la ligne simulée est retirée', () => {
  const dataMap = {
    finances: [
      { id: 'DERIVE-999', type: 'sortie', montant: 887000, source: 'simulation_bp_horizon_farm' },
      { id: 'REEL-1', type: 'sortie', montant: 5000, source: 'saisie_terrain' },
    ],
  };
  const stripped = stripSimulatedRows(dataMap);
  assert.equal(stripped.finances.length, 1);
  assert.equal(stripped.finances[0].id, 'REEL-1');
});

test('BUG résolu : données réelles sans saisie = briefing vide (pas de -887000)', () => {
  const briefing = buildDecisionBriefing(stripSimulatedRows(seed));
  assert.equal(briefing.cashNet, 0);
  assert.equal(briefing.margeReelle, 0);
  assert.equal(briefing.decisions.length, 0);
});

test('les vraies saisies restent visibles en mode réel', () => {
  const dataMap = { finances: [{ id: 'R1', type: 'entree', montant: 10000, source: 'saisie_terrain' }] };
  assert.equal(stripSimulatedRows(dataMap).finances.length, 1);
});
