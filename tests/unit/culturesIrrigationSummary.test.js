import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIrrigationSummary } from '../../src/utils/culturesIrrigationSummary.js';

const cultures = [
  {
    id: 'CULT-A',
    nom: 'Oignon',
    eau_consommee_litres: 300,
    cout_eau: 600,
    irrigation_history: [
      { date: '2026-07-10', volume_litres: 100, cout: 200, source_eau: 'forage' },
      { date: '2026-07-12', volume_litres: 200, cout: 400, source_eau: 'forage' },
    ],
  },
  {
    id: 'CULT-B',
    nom: 'Tomate',
    irrigation_history: [
      { date: '2026-07-11', volume_litres: 50, cout: 100 },
    ],
  },
  { id: 'CULT-C', nom: 'Jachère' }, // aucune irrigation → ignorée
];

test('la synthèse agrège volume, coût et nombre d’irrigations', () => {
  const s = buildIrrigationSummary(cultures);
  assert.equal(s.totalVolume, 350);
  assert.equal(s.totalCost, 700);
  assert.equal(s.irrigationCount, 3);
  assert.equal(s.culturesIrrigated, 2, 'seules les cultures irriguées comptent');
});

test('les cultures sont triées par volume et gardent leur dernière date', () => {
  const s = buildIrrigationSummary(cultures);
  assert.equal(s.perCulture[0].id, 'CULT-A');
  assert.equal(s.perCulture[0].lastDate, '2026-07-12');
  assert.equal(s.perCulture[1].id, 'CULT-B');
});

test('les irrigations récentes sont triées du plus récent au plus ancien', () => {
  const s = buildIrrigationSummary(cultures, 2);
  assert.equal(s.recent.length, 2);
  assert.equal(s.recent[0].date, '2026-07-12');
  assert.equal(s.recent[1].date, '2026-07-11');
});

test('un volume dérivé de l’historique est utilisé si le cumul manque', () => {
  const s = buildIrrigationSummary([cultures[1]]);
  assert.equal(s.totalVolume, 50);
  assert.equal(s.totalCost, 100);
});
