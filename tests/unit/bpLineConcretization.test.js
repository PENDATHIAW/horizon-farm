import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BP_LINE_STATUS,
  bpLineAmount,
  bpCostModuleRoute,
  buildBpCostCompletionWorkflow,
  buildBpLineConcretizationRoute,
  buildBpLineCompletionWorkflow,
  canConcretizeBpCost,
  canConcretizeBpLine,
  computeBpCostTotals,
  computeBpInvestmentTotals,
  launchBpCostConcretization,
  launchBpLineConcretization,
  normalizeBpLineStatus,
} from '../../src/utils/bpLineConcretization.js';

describe('bpLineConcretization', () => {
  it('normalise les statuts legacy vers le registre étendu', () => {
    assert.equal(normalizeBpLineStatus({ statut: 'prevu' }), BP_LINE_STATUS.PREVU);
    assert.equal(normalizeBpLineStatus({ statut: 'effectif' }), BP_LINE_STATUS.CONCRETISE);
    assert.equal(normalizeBpLineStatus({ statut: 'annulé' }), BP_LINE_STATUS.ANNULE);
    assert.equal(normalizeBpLineStatus({ asset_id: 'LOTP-1' }), BP_LINE_STATUS.CONCRETISE);
  });

  it('calcule prévu, concrétisé, annulé et reste', () => {
    const totals = computeBpInvestmentTotals([
      { id: '1', quantite: 3000, prix_unitaire: 900, statut: 'a_concretiser' },
      { id: '2', quantite: 1, prix_unitaire: 500000, statut: 'concretise' },
      { id: '3', quantite: 1, prix_unitaire: 100000, statut: 'annulee' },
    ]);
    assert.equal(totals.prevu, 2700000 + 500000 + 100000);
    assert.equal(totals.concretise, 500000);
    assert.equal(totals.annule, 100000);
    assert.equal(totals.reste, 2700000);
  });

  it('route 3000 pondeuses vers Élevage / Avicole lot_create', () => {
    const line = {
      id: 'BPLI-1',
      business_plan_id: 'BP-HORIZON-FARM',
      designation: '3000 poussins pondeuses',
      quantite: 3000,
      prix_unitaire: 900,
      total: 2700000,
      statut: 'a_concretiser',
    };
    const route = buildBpLineConcretizationRoute(line);
    assert.ok(route);
    assert.equal(route.navigate.module, 'elevage');
    assert.equal(route.navigate.tab, 'Avicole');
    assert.equal(route.form.module, 'avicole');
    assert.equal(route.form.form_type, 'lot_create');
    assert.equal(route.form.draft_fields.initial_count, 3000);
    assert.equal(route.form.draft_fields.bp_line_id, 'BPLI-1');
    assert.ok(canConcretizeBpLine(line));
    assert.equal(bpLineAmount(line), 2700000);
  });

  it('launchBpLineConcretization appelle onNavigate', () => {
    const calls = [];
    const previousWindow = globalThis.window;
    globalThis.window = {
      setTimeout: (fn) => { fn(); return 0; },
      sessionStorage: { setItem() {}, removeItem() {} },
      dispatchEvent() {},
    };
    try {
      const result = launchBpLineConcretization(
        { id: 'BPLI-2', designation: '500 poussins chair', quantite: 500, prix_unitaire: 700, statut: 'a_concretiser' },
        { onNavigate: (module, options) => calls.push({ module, options }) },
      );
      assert.equal(result.ok, true);
      assert.equal(calls[0]?.module, 'elevage');
      assert.equal(calls[0]?.options?.tab, 'Avicole');
    } finally {
      globalThis.window = previousWindow;
    }
  });

  it('buildBpLineCompletionWorkflow marque la ligne concrétisée avec finance', () => {
    const line = { id: 'BPLI-3', designation: 'Pompe irrigation', quantite: 1, prix_unitaire: 250000, business_plan_id: 'BP-HORIZON-FARM' };
    const workflow = buildBpLineCompletionWorkflow(line, { assetModule: 'equipements', assetId: 'EQP-1', amount: 250000, date: '2026-06-01' });
    assert.equal(workflow.linePatch.statut, BP_LINE_STATUS.CONCRETISE);
    assert.ok(workflow.financeTransaction);
  });

  it('route charge aliment pondeuses vers achats stock', () => {
    const cost = {
      id: 'BPCOST-1',
      business_plan_id: 'BP-HORIZON-FARM',
      designation: 'Aliments pondeuses',
      categorie: 'alimentation_pondeuses',
      montant_mensuel: 3240000,
      statut: 'a_concretiser',
    };
    const route = bpCostModuleRoute(cost);
    assert.equal(route.navigate.module, 'achats_stock');
    assert.equal(route.form.form_type, 'stock_purchase');
    assert.ok(canConcretizeBpCost(cost));
    assert.equal(computeBpCostTotals([cost, { ...cost, id: '2', statut: 'concretise' }]).concretise, 3240000);
  });

  it('launchBpCostConcretization ouvre finance pour loyer', () => {
    const calls = [];
    globalThis.window = {
      setTimeout: (fn) => { fn(); return 0; },
      sessionStorage: { setItem() {}, removeItem() {} },
      dispatchEvent() {},
    };
    try {
      const result = launchBpCostConcretization(
        { id: 'BPCOST-2', designation: 'Loyer pondeuses', categorie: 'loyer_pondeuses', montant_mensuel: 150000, statut: 'a_concretiser' },
        { onNavigate: (module, options) => calls.push({ module, options }) },
      );
      assert.equal(result.ok, true);
      assert.equal(calls[0]?.module, 'finance_pilotage');
    } finally {
      delete globalThis.window;
    }
  });

  it('buildBpCostCompletionWorkflow marque charge concrétisée', () => {
    const cost = { id: 'BPCOST-3', designation: 'Gaz', montant_mensuel: 18000, business_plan_id: 'BP-HORIZON-FARM' };
    const workflow = buildBpCostCompletionWorkflow(cost, { amount: 18000, date: '2026-06-01', targetModule: 'finance_pilotage' });
    assert.equal(workflow.linePatch.statut, BP_LINE_STATUS.CONCRETISE);
  });

  it('buildBpCostCompletionWorkflow gère la concrétisation partielle', () => {
    const cost = { id: 'BPCOST-4', designation: 'Loyer', montant_mensuel: 100000, business_plan_id: 'BP-HORIZON-FARM' };
    const workflow = buildBpCostCompletionWorkflow(cost, { amount: 40000, date: '2026-06-01', targetModule: 'finance_pilotage' });
    assert.equal(workflow.linePatch.statut, BP_LINE_STATUS.CONCRETISE_PARTIEL);
    assert.equal(workflow.linePatch.montant_paye, 40000);
    assert.equal(workflow.linePatch.reste_a_realiser, 60000);
  });
});
