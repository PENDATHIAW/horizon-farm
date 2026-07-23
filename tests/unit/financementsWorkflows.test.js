import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  FUNDING_ALERT_TYPES,
  assertFunderReadOnlyPermissions,
  buildFundingCockpit,
  buildFundingPublicSpace,
  buildFundingSourceSnapshot,
  canFunderAccess,
  createFundingDemoDataset,
  createFundingReportVersion,
  deriveFundingOpportunitiesFromEvents,
  fundingDaysUntil,
  mapLegacyFundingOpportunityType,
  normalizeFundingContact,
  normalizeFundingReport,
  validateFundingReportPublication,
} from '../../src/services/financements/financementsService.js';
import {
  FUNDING_FORM_KINDS,
  fundingFormDefaults,
  prepareFundingOperation,
} from '../../src/services/financements/fundingOperations.js';
import FundingFormModal from '../../src/modules/financements/FundingFormModal.jsx';
import FinancementsModule from '../../src/modules/FinancementsModule.jsx';

const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const pastDate = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

test('legacy forum/salon are mapped to evenement opportunities', () => {
  assert.equal(mapLegacyFundingOpportunityType('forum'), 'evenement');
  assert.equal(mapLegacyFundingOpportunityType('salon'), 'evenement');
  const events = deriveFundingOpportunitiesFromEvents([
    { id: 'E1', title: 'Forum banque agricole', type: 'forum', date: futureDate(10) },
  ]);
  assert.equal(events[0].type, 'evenement');
  assert.equal(events[0].event_linked, true);
});

test('cockpit uses commercial canonical KPI source for CA', () => {
  const cockpit = buildFundingCockpit({
    salesOrders: [{ id: 'SO1', montant_total: 125000, statut: 'livre' }],
    payments: [{ id: 'P1', sales_order_id: 'SO1', amount: 50000 }],
    clients: [{ id: 'C1' }],
  });
  assert.equal(cockpit.sourceSnapshot.public_kpis.ca, 125000);
  assert.equal(cockpit.sourceSnapshot.sources.commercial, 'buildConsolidatedCommercialKpis');
});

test('all operational funding alert families are declared', () => {
  assert.deepEqual(FUNDING_ALERT_TYPES, [
    'overdue_deadline',
    'deadline_without_owner',
    'missing_required_document',
    'agreement_without_allocation',
    'allocation_above_received',
    'spend_above_80',
    'report_snapshot_outdated',
    'shared_document_not_published',
    'funder_access_anomaly',
    'event_without_next_action',
  ]);
});

test('deadline and missing documents produce cockpit alerts', () => {
  const cockpit = buildFundingCockpit({
    opportunities: [{ id: 'O1', title: 'Subvention urgente', deadline: futureDate(5), status: 'en_preparation' }],
    applications: [{
      id: 'A1',
      title: 'Dossier subvention',
      required_documents: ['BP', 'Budget'],
      ready_documents: ['BP'],
    }],
  });
  assert.ok(cockpit.alerts.some((alert) => alert.type === 'deadline_without_owner'));
  assert.ok(cockpit.alerts.some((alert) => alert.type === 'missing_required_document'));
});

test('agreements detect missing allocation and 80 percent spend', () => {
  const cockpit = buildFundingCockpit({
    agreements: [
      { id: 'G1', title: 'Convention non affectée', amount_received: 1000000, amount_spent: 0 },
      { id: 'G2', title: 'Convention consommée', amount_received: 1000000, amount_spent: 850000 },
    ],
  });
  assert.ok(cockpit.alerts.some((alert) => alert.type === 'agreement_without_allocation'));
  assert.ok(cockpit.alerts.some((alert) => alert.type === 'spend_above_80'));
});

test('contacts normalize without potential amount scoring fields', () => {
  const contact = normalizeFundingContact({
    name: 'Awa',
    organization: 'Fonds',
    contact_type: 'forum',
    potential_amount: 5000000,
    probability: 80,
  });
  assert.equal(contact.organization_type, 'evenement');
  assert.equal(Object.hasOwn(contact, 'potential_amount'), false);
  assert.equal(Object.hasOwn(contact, 'probability'), false);
});

test('immutable reports validate only against the frozen snapshot', () => {
  const cockpit = buildFundingCockpit({
    salesOrders: [{ id: 'SO1', montant_total: 80000 }],
  });
  const report = createFundingReportVersion({
    title: 'Rapport financeur',
    status: 'ready',
    visibility: 'shared',
    sections: ['Indicateurs'],
  }, cockpit.sourceSnapshot);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(validateFundingReportPublication(report, cockpit.sourceSnapshot).ok, true);
  assert.deepEqual(
    validateFundingReportPublication(report, { ...cockpit.sourceSnapshot, hash: 'changed' }).errors,
    ['snapshot_changed_since_freeze'],
  );
});

test('public funder space exposes only published shared resources', () => {
  const cockpit = buildFundingCockpit({
    documents: [
      { id: 'D1', title: 'Budget publié', visibility: 'shared', status: 'published', notes: 'interne' },
      { id: 'D2', title: 'Budget interne', visibility: 'internal', status: 'published' },
    ],
    reports: [
      { id: 'R1', title: 'Rapport publié', status: 'published', visibility: 'shared', immutable: true, source_snapshot_hash: 'h1', sections: ['A'], notes: 'interne' },
      { id: 'R2', title: 'Rapport brouillon', status: 'draft', visibility: 'shared', immutable: true, source_snapshot_hash: 'h1' },
    ],
    journalEntries: [
      { id: 'J1', title: 'Jalon publié', status: 'published', summary: 'OK', notes: 'interne' },
      { id: 'J2', title: 'Jalon interne', status: 'draft' },
    ],
  });
  const publicSpace = buildFundingPublicSpace({
    cockpit,
    account: {
      status: 'active',
      permissions: ['overview', 'reports', 'project_journal', 'shared_documents'],
    },
    reports: cockpit.reports,
    documents: cockpit.documents,
    journalEntries: [{ id: 'J1', title: 'Jalon publié', status: 'published', summary: 'OK', notes: 'interne' }],
  });
  assert.deepEqual(publicSpace.shared_documents.map((doc) => doc.id), ['D1']);
  assert.deepEqual(publicSpace.reports.map((report) => report.id), ['R1']);
  assert.equal(Object.hasOwn(publicSpace.reports[0], 'notes'), false);
  assert.equal(Object.hasOwn(publicSpace.project_journal[0], 'notes'), false);
});

test('funder permissions are strictly read-only', () => {
  assert.equal(assertFunderReadOnlyPermissions('read'), true);
  assert.equal(assertFunderReadOnlyPermissions('download'), true);
  assert.equal(assertFunderReadOnlyPermissions('update'), false);
  const account = { status: 'active', permissions: ['reports'] };
  assert.equal(canFunderAccess({ account, resource: { visibility: 'shared', section: 'reports' }, action: 'read' }), true);
  assert.equal(canFunderAccess({ account, resource: { visibility: 'shared', section: 'reports' }, action: 'write' }), false);
  assert.equal(canFunderAccess({ account, resource: { visibility: 'internal', section: 'reports' }, action: 'read' }), false);
  assert.equal(canFunderAccess({ account: { status: 'active', permissions: [] }, resource: { visibility: 'shared', section: 'reports' }, action: 'read' }), false);
});

test('past deadlines stay alerts but never become the next deadline', () => {
  assert.equal(fundingDaysUntil('2026-07-20', new Date('2026-07-23T12:00:00Z')), -3);
  const cockpit = buildFundingCockpit({
    opportunities: [
      { id: 'PAST', title: 'Dossier passé', deadline: pastDate(3), status: 'en_preparation' },
      { id: 'FUTURE', title: 'Dossier futur', deadline: futureDate(4), status: 'en_preparation', owner_label: 'Penda' },
    ],
  });
  assert.equal(cockpit.nextDeadline?.id, 'FUTURE');
  assert.ok(cockpit.alerts.some((alert) => alert.type === 'overdue_deadline' && alert.id.includes('PAST')));
  assert.equal(cockpit.alerts.some((alert) => alert.type === 'deadline_without_owner' && alert.id.includes('PAST')), false);
});

test('linked applications are not counted twice and suggestions do not inflate KPIs', () => {
  const cockpit = buildFundingCockpit({
    opportunities: [{ id: 'O1', title: 'Programme', amount_requested: 100000 }],
    applications: [
      { id: 'A1', opportunity_id: 'O1', title: 'Dossier lié', requested_amount: 120000 },
      { id: 'A2', title: 'Dossier autonome', requested_amount: 30000 },
    ],
    suggestedOpportunities: [{ id: 'S1', title: 'Suggestion BP', amount_requested: 9000000 }],
  });
  assert.equal(cockpit.kpis.requested_amount, 150000);
  assert.equal(cockpit.kpis.active_opportunities, 1);
  assert.equal(cockpit.suggestedOpportunities.length, 1);
});

test('stored report snapshots are preserved and stale ready reports are flagged', () => {
  const cockpit = buildFundingCockpit({
    reports: [{
      id: 'R-OLD',
      title: 'Rapport préparé',
      status: 'ready',
      visibility: 'shared',
      immutable: true,
      source_snapshot_hash: 'funding-old',
      source_snapshot_generated_at: '2026-06-01T00:00:00.000Z',
      sections: ['Indicateurs'],
    }],
  });
  assert.equal(cockpit.reports[0].source_snapshot_hash, 'funding-old');
  assert.equal(cockpit.reports[0].source_snapshot_generated_at, '2026-06-01T00:00:00.000Z');
  assert.ok(cockpit.alerts.some((alert) => alert.type === 'report_snapshot_outdated'));
  assert.equal(normalizeFundingReport({ title: 'Nouveau rapport' }).visibility, 'internal');
});

test('application readiness counts the required documents, not unrelated files', () => {
  const incomplete = buildFundingCockpit({
    applications: [{
      id: 'A1',
      title: 'Dossier',
      required_documents: ['Business plan', 'Budget'],
      ready_documents: ['Business plan', 'Autre pièce'],
    }],
  });
  assert.equal(incomplete.applications[0].completion_rate, 50);
  assert.ok(incomplete.alerts.some((alert) => alert.type === 'missing_required_document'));

  const complete = buildFundingCockpit({
    applications: [{
      id: 'A1',
      title: 'Dossier',
      required_documents: ['Business plan', 'Budget'],
      ready_documents: ['Business plan'],
    }],
    documents: [{
      id: 'D1',
      application_id: 'A1',
      title: 'Budget signé',
      category: 'Budget',
      status: 'ready',
    }],
  });
  assert.equal(complete.applications[0].completion_rate, 100);
  assert.equal(complete.alerts.some((alert) => alert.type === 'missing_required_document'), false);
});

test('past business events are not suggested as future funding opportunities', () => {
  const opportunities = deriveFundingOpportunitiesFromEvents([
    { id: 'E-PAST', title: 'Forum financeurs passé', date: pastDate(10) },
    { id: 'E-FUTURE', title: 'Forum financeurs à venir', date: futureDate(10) },
  ]);
  assert.deepEqual(opportunities.map((opportunity) => opportunity.id), ['event-E-FUTURE']);
});

test('an explicit empty farm dataset never falls back to rows from another scope', () => {
  const snapshot = buildFundingSourceSnapshot({
    crud: {
      sales_orders: { rows: [{ id: 'OTHER', montant_total: 500000, statut: 'livre' }] },
    },
    salesOrders: [],
    payments: [],
    clients: [],
  });
  assert.equal(snapshot.public_kpis.ca, 0);
});

test('financial changes invalidate a prepared report snapshot', () => {
  const first = buildFundingCockpit({
    transactions: [{ id: 'T1', type: 'sortie', montant: 10000 }],
  });
  const second = buildFundingCockpit({
    transactions: [{ id: 'T1', type: 'sortie', montant: 20000 }],
  });
  assert.notEqual(first.sourceSnapshot.hash, second.sourceSnapshot.hash);
});

test('public space denies accounts without an explicit permission', () => {
  const publicSpace = buildFundingPublicSpace({
    cockpit: buildFundingCockpit({}),
    account: { status: 'active', permissions: [] },
  });
  assert.equal(publicSpace.accessDenied, true);
  assert.deepEqual(publicSpace.reports, []);
  assert.deepEqual(publicSpace.shared_documents, []);
});

test('expense allocation requires a same-farm expense, proof and available funds', () => {
  const context = {
    farmId: 'F1',
    agreements: [{ id: 'G1', farm_id: 'F1', amount_received: 100000 }],
    transactions: [{ id: 'T1', farm_id: 'F1', type: 'sortie', montant: 80000 }],
    documents: [{ id: 'D1', farm_id: 'F1', file_url: 'https://example.test/proof.pdf' }],
    allocations: [],
  };
  const form = fundingFormDefaults('allocation', {
    agreement_id: 'G1',
    finance_transaction_id: 'T1',
    document_id: 'D1',
    amount: 70000,
    category: 'Équipement',
  }, context);
  const valid = prepareFundingOperation('allocation', form, context);
  assert.equal(valid.ok, true);
  assert.equal(valid.payload.finance_transaction_id, 'T1');
  assert.equal(valid.payload.document_id, 'D1');

  const excessive = prepareFundingOperation('allocation', { ...form, amount: 120000 }, context);
  assert.equal(excessive.ok, false);
  assert.ok(excessive.errors.some((error) => error.includes('fonds réellement reçus')));

  const income = prepareFundingOperation('allocation', form, {
    ...context,
    transactions: [{ id: 'T1', farm_id: 'F1', type: 'entree', montant: 80000 }],
  });
  assert.equal(income.ok, false);
  assert.ok(income.errors.some((error) => error.includes('Seule une dépense')));
});

test('all funding forms render with operational context', () => {
  const context = {
    farmId: 'F1',
    opportunities: [{ id: 'O1', title: 'Programme' }],
    applications: [{ id: 'A1', title: 'Dossier' }],
    agreements: [{ id: 'G1', title: 'Convention', amount_remaining: 50000 }],
    transactions: [{ id: 'T1', type: 'sortie', montant: 25000, libelle: 'Dépense' }],
    erpDocuments: [{ id: 'D1', title: 'Justificatif' }],
    sourceSnapshot: { hash: 'funding-test', generated_at: '2026-07-23T00:00:00.000Z' },
    nextReportVersion: 2,
  };
  FUNDING_FORM_KINDS.forEach((kind) => {
    const html = renderToString(React.createElement(FundingFormModal, {
      open: true,
      kind,
      context,
      onClose: () => {},
      onSubmit: () => {},
    }));
    assert.match(html, /Enregistrer/);
    assert.doesNotMatch(html, /ERREUR MODULE/);
  });
});

test('funding module keeps records isolated to the active farm', () => {
  const html = renderToString(React.createElement(FinancementsModule, {
    initialTab: 'Opportunités',
    activeFarm: { id: 'F1', name: 'Ferme 1', settings: {} },
    role: 'promotrice_direction',
    dataMap: {},
    crud: {
      funding_opportunities: {
        rows: [
          { id: 'O1', farm_id: 'F1', title: 'Programme Ferme 1' },
          { id: 'O2', farm_id: 'F2', title: 'Programme Ferme 2' },
          { id: 'O3', title: 'Programme sans ferme' },
        ],
      },
    },
    documents: [],
    transactions: [],
  }));
  assert.match(html, /Programme Ferme 1/);
  assert.doesNotMatch(html, /Programme Ferme 2|Programme sans ferme/);
});

test('demo dataset is fictive and excludes operational BOVINIA/Tallow relics', () => {
  const demo = createFundingDemoDataset();
  const serialized = JSON.stringify(demo);
  assert.match(serialized, /exemple/i);
  assert.doesNotMatch(serialized, /BOVINIA|Tallow/i);
});
