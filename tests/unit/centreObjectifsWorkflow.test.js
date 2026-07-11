import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPilotageIssueKey,
  buildOpportunityFollowUpTask,
  buildPriorityFollowUpTask,
  buildRiskFollowUpAlert,
  buildRiskFollowUpTask,
  inferPilotageNavKey,
  navigateFromPilotageItem,
  resolvePilotageNavigation,
} from '../../src/utils/centreDecisionWorkflow.js';
import {
  navigateObjectifsTarget,
  resolveObjectifsNavigation,
} from '../../src/utils/objectifsCroissanceNavigation.js';

test('décision stock ouvre Achats & Stock', () => {
  const nav = resolvePilotageNavigation({ domain: 'Stock', title: 'Aliment rupture', module: 'achats_stock' });
  assert.equal(nav.module, 'achats_stock');
  assert.equal(nav.tab, 'Stock');
});

test('risque santé ouvre Élevage/Santé', () => {
  const key = inferPilotageNavKey({ domain: 'Élevage', title: 'Animal malade', module: 'elevage' });
  assert.equal(key, 'sante');
  const nav = resolvePilotageNavigation({ domain: 'Élevage', module: 'elevage' });
  assert.equal(nav.module, 'elevage');
  assert.equal(nav.tab, 'Santé');
});

test('opportunité vente ouvre Commercial', () => {
  const nav = resolvePilotageNavigation({ domain: 'Commercial', opportunity_id: 'OPP-001' });
  assert.equal(nav.module, 'commercial');
  assert.equal(nav.tab, 'Opportunités');
  const calls = [];
  navigateFromPilotageItem((module, opts) => calls.push({ module, tab: opts?.tab }), { domain: 'Commercial', id: 'OPP-001' });
  assert.deepEqual(calls[0], { module: 'commercial', tab: 'Opportunités' });
});

test('objectif financeur ouvre Documents ou Financements', () => {
  const docs = resolveObjectifsNavigation('financeur_dossier');
  assert.equal(docs.module, 'documents_rapports');
  assert.equal(docs.tab, 'Rapports & exports');
  const investors = resolveObjectifsNavigation('financeurs');
  assert.equal(investors.module, 'financements');
  assert.equal(investors.tab, 'cockpit-dashboard');
  const calls = [];
  navigateObjectifsTarget((module, opts) => calls.push({ module, tab: opts?.tab }), 'financeur_dossier');
  assert.deepEqual(calls[0], { module: 'documents_rapports', tab: 'Rapports & exports' });
});

test('one-click risque crée tâche/alerte avec source', () => {
  const risk = {
    id: 'stock-STK001',
    title: 'Stock critique',
    domain: 'Stock',
    module: 'achats_stock',
    cause: 'Seuil atteint',
    action: 'Commander',
    impact: 'Rupture',
    tone: 'bad',
  };
  const taskBuilt = buildRiskFollowUpTask(risk);
  assert.ok(taskBuilt.task.source_record_id);
  assert.equal(taskBuilt.task.source_module, 'achats_stock');
  assert.ok(taskBuilt.task.issue_key.includes('stock-STK001'));
  const alertBuilt = buildRiskFollowUpAlert(risk);
  assert.equal(alertBuilt.alert.source_module, 'achats_stock');
  assert.equal(alertBuilt.alert.source_record_id, 'stock-STK001');
});

test('one-click opportunité crée recommandation liée au Commercial', () => {
  const built = buildOpportunityFollowUpTask({ id: 'OPP-42', title: 'Vente poulets', client_nom: 'Client A' });
  assert.equal(built.task.source_module, 'commercial');
  assert.equal(built.task.source_record_id, 'OPP-42');
  assert.equal(built.task.opportunity_id, 'OPP-42');
  assert.match(built.task.notes, /Commercial/);
});

test('priorité Centre crée tâche avec issue_key', () => {
  const built = buildPriorityFollowUpTask({
    id: 'cash',
    title: 'Trésorerie en tension',
    sourceModule: 'finance_pilotage',
    detail: 'Relancer encaissements',
    tone: 'bad',
  });
  assert.equal(built.task.source_module, 'finance_pilotage');
  assert.ok(built.task.issue_key.startsWith('pilotage:'));
});

test('issue_key stable pour écarts pilotage', () => {
  assert.equal(buildPilotageIssueKey('risk', 'abc'), 'pilotage:risk:abc');
});
