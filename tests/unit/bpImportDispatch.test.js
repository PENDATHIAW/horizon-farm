import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchOfficialBpImport,
  BP_LINE_NATURE,
  BP_SHEET_KEYS,
  isInvestissementsActionableLine,
} from '../../src/services/bpImport/index.js';
import { buildBpLineConcretizationRoute } from '../../src/utils/bpLineConcretization.js';

test('dispatchOfficialBpImport répartit les onglets sans tout mettre dans Investissements', () => {
  const payload = dispatchOfficialBpImport('BP-TEST');
  assert.ok(payload.investmentLines.length >= 15);
  assert.ok(payload.recurringCosts.length > payload.investmentLines.length);
  assert.equal(payload.revenueProjections.length, 12);
  assert.ok(payload.fundingSources.length >= 1);
  assert.ok(payload.recurringCosts.every((c) => c.display_in_investissements === false));
  assert.ok(payload.revenueProjections.every((p) => p.display_in_investissements === false));
});

test('Investissements n’affiche que les lignes actionnables', () => {
  const payload = dispatchOfficialBpImport('BP-TEST');
  const actionable = payload.investmentLines.filter(isInvestissementsActionableLine);
  assert.ok(actionable.length >= 15);
  assert.ok(actionable.some((l) => l.nature === BP_LINE_NATURE.TRESORERIE_DEPART));
  assert.ok(actionable.some((l) => l.nature === BP_LINE_NATURE.STOCK_INITIAL));
  assert.ok(!payload.recurringCosts.some(isInvestissementsActionableLine));
});

test('lignes investissement portent métadonnées source BP', () => {
  const line = dispatchOfficialBpImport('BP-TEST').investmentLines[0];
  assert.ok(line.source_bp_sheet);
  assert.ok(line.issue_key);
  assert.ok(line.module_cible);
  assert.ok(typeof line.montant_prevu === 'number');
});

test('Concrétiser route trésorerie de départ vers Finance', () => {
  const payload = dispatchOfficialBpImport('BP-TEST');
  const treso = payload.investmentLines.find((l) => l.nature === BP_LINE_NATURE.TRESORERIE_DEPART);
  const route = buildBpLineConcretizationRoute({ ...treso, id: 'BPLI-1' });
  assert.equal(route.navigate.module, 'finance_pilotage');
  assert.equal(route.form.form_type, 'finance_entry');
});

test('Plan imprimable est marqué lecture seule', () => {
  const payload = dispatchOfficialBpImport('BP-TEST');
  assert.equal(payload.reportSnapshot.source_bp_sheet, BP_SHEET_KEYS.PLAN_IMPRIMABLE);
  assert.equal(payload.reportSnapshot.read_only, true);
});
