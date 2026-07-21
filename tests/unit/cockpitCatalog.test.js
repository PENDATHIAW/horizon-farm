import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCockpitCatalog,
  computeBroilerCockpit,
  computeLayerCockpit,
  computeStockCockpit,
  computeCommercialCockpit,
  computeFinanceCockpit,
} from '../../src/services/kpiEngine/cockpitCatalog.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

const VALID_TONES = new Set(['good', 'warn', 'bad', 'neutral']);

test('chair : IEP, IC, GMQ, mortalité calculés et bornés', () => {
  const chair = computeBroilerCockpit(seed.avicole);
  assert.equal(chair.hasData, true);
  const byKey = Object.fromEntries(chair.indicators.map((i) => [i.key, i]));
  assert.ok(byKey.iep.value > 0 && byKey.iep.value < 600, `IEP plausible (${byKey.iep.value})`);
  assert.ok(byKey.ic.value >= 1.5 && byKey.ic.value <= 2.5, `IC plausible (${byKey.ic.value})`);
  assert.ok(byKey.gmq.value > 0, 'GMQ positif');
  assert.ok(byKey.mortalite.value >= 0 && byKey.mortalite.value < 100);
  chair.indicators.forEach((i) => assert.ok(VALID_TONES.has(i.tone), `${i.key} tone valide`));
});

test('chair : le statut couleur suit la cible (IC bas = bon)', () => {
  const chair = computeBroilerCockpit([{ type: 'Chair', initial_count: 100, current_count: 95, mortality: 5, weight_avg: 1.5, age_days: 40, ic: 1.7, purchase_cost: 65000, cout_alimentation: 80000, vendus: 0 }]);
  const ic = chair.indicators.find((i) => i.key === 'ic');
  assert.equal(ic.tone, 'good', 'IC 1,7 ≤ 1,9 → bon');
  const bad = computeBroilerCockpit([{ type: 'Chair', initial_count: 100, current_count: 80, mortality: 20, weight_avg: 1.5, age_days: 40, ic: 2.3, purchase_cost: 65000, cout_alimentation: 80000 }]);
  assert.equal(bad.indicators.find((i) => i.key === 'mortalite').tone, 'bad', 'mortalité 20 % → critique');
  assert.equal(bad.indicators.find((i) => i.key === 'ic').tone, 'bad', 'IC 2,3 → critique');
});

test('pondeuses : taux de ponte et coût/œuf', () => {
  const layer = computeLayerCockpit(seed.avicole, { productionLogs: seed.production_oeufs_logs || [] });
  assert.equal(layer.hasData, true);
  const taux = layer.indicators.find((i) => i.key === 'taux_ponte');
  assert.ok(taux.value > 0 && taux.value <= 100);
  const cout = layer.indicators.find((i) => i.key === 'cout_oeuf');
  assert.ok(cout.value == null || cout.value > 0, 'coût/œuf positif ou non calculable');
});

test('stock : couverture en jours dérivée des logs d\'alimentation', () => {
  const stocks = [
    { id: 'S1', produit: 'Aliment ponte', quantite: 300, seuil: 100 },
    { id: 'S2', produit: 'Maïs', quantite: 50, seuil: 200 },
  ];
  const logs = [
    { stock_id: 'S1', quantite: 300, date: '2026-07-01' }, // 10 kg/j sur 30 j → 30 j de couverture
  ];
  const cockpit = computeStockCockpit(stocks, { alimentationLogs: logs });
  const couverture = cockpit.indicators.find((i) => i.key === 'couverture');
  assert.equal(couverture.value, 30, '300 / (300/30) = 30 jours');
  const ruptures = cockpit.indicators.find((i) => i.key === 'ruptures');
  assert.equal(ruptures.value, 1, 'S2 sous le seuil');
  assert.equal(ruptures.tone, 'warn');
});

test('stock : couverture faible = critique', () => {
  const cockpit = computeStockCockpit(
    [{ id: 'S1', produit: 'Aliment', quantite: 20, seuil: 10 }],
    { alimentationLogs: [{ stock_id: 'S1', quantite: 300, date: '2026-07-01' }] }, // 10 kg/j → 2 j
  );
  const couverture = cockpit.indicators.find((i) => i.key === 'couverture');
  assert.equal(couverture.value, 2);
  assert.equal(couverture.tone, 'bad', '2 jours < 3 → critique');
});

test('commercial : DSO, recouvrement et créances > 30 j', () => {
  const orders = [
    { id: 'C1', montant_total: 100000, total_paye: 100000, date: '2026-07-20' },
    { id: 'C2', montant_total: 200000, total_paye: 0, reste_a_payer: 200000, date: '2026-05-01' }, // > 30 j
  ];
  const cockpit = computeCommercialCockpit(orders, [{ montant: 100000 }], { referenceDate: '2026-07-21' });
  const recouvrement = cockpit.indicators.find((i) => i.key === 'taux_recouvrement');
  assert.ok(recouvrement.value < 100);
  const vieilles = cockpit.indicators.find((i) => i.key === 'creances_30j');
  assert.ok(vieilles.value > 0, 'des créances anciennes détectées');
  assert.ok(cockpit.indicators.find((i) => i.key === 'dso').value > 0);
});

test('finance : résultat cash et taux de charges', () => {
  const tx = [
    { type: 'entree', categorie: 'Vente', montant: 500000 },
    { type: 'sortie', categorie: 'Alimentation', montant: 200000 },
    { type: 'sortie', categorie: 'Salaires', montant: 80000 },
  ];
  const cockpit = computeFinanceCockpit(tx);
  assert.equal(cockpit.indicators.find((i) => i.key === 'resultat_cash').value, 220000);
  const aliment = cockpit.indicators.find((i) => i.key === 'part_aliment');
  assert.equal(aliment.value, 40, '200000/500000 = 40 %');
  assert.equal(aliment.tone, 'good', '40 % ≤ 65 %');
});

test('catalogue complet : sections avec données, synthèse cohérente', () => {
  const catalog = buildCockpitCatalog(seed);
  assert.ok(catalog.sections.length >= 4, `plusieurs activités (${catalog.sections.length})`);
  assert.equal(catalog.summary.indicators, catalog.sections.flatMap((s) => s.indicators).length);
  assert.equal(catalog.summary.good + catalog.summary.warn + catalog.summary.bad + neutralCount(catalog), catalog.summary.indicators);
  // chaque indicateur porte cible + décision + source
  catalog.sections.flatMap((s) => s.indicators).forEach((i) => {
    assert.ok(typeof i.label === 'string' && i.label.length > 0);
    assert.ok(VALID_TONES.has(i.tone));
    assert.ok('decision' in i && 'source' in i);
  });
  // la synthèse « attention » ne liste que les non-verts
  catalog.summary.attention.forEach((a) => assert.ok(a.decision != null));
});

function neutralCount(catalog) {
  return catalog.sections.flatMap((s) => s.indicators).filter((i) => i.tone === 'neutral').length;
}

test('robustesse : données vides = aucune section, pas de crash', () => {
  const catalog = buildCockpitCatalog({});
  assert.equal(catalog.sections.length, 0);
  assert.equal(catalog.summary.indicators, 0);
});
