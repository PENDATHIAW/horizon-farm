import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUNDING_ALERT_TYPES,
  assertFunderReadOnlyPermissions,
  buildFundingCockpit,
  buildFundingPublicSpace,
  canFunderAccess,
  createFundingDemoDataset,
  createFundingReportVersion,
  deriveFundingOpportunitiesFromEvents,
  mapLegacyFundingOpportunityType,
  normalizeFundingContact,
  validateFundingReportPublication,
} from '../../src/services/financements/financementsService.js';

const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

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

test('six funding alert families are declared', () => {
  assert.deepEqual(FUNDING_ALERT_TYPES, [
    'deadline_without_owner',
    'missing_required_document',
    'agreement_without_allocation',
    'spend_above_80',
    'report_snapshot_outdated',
    'funder_access_anomaly',
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
  assert.equal(canFunderAccess({ account: { status: 'active' }, resource: { visibility: 'shared' }, action: 'read' }), true);
  assert.equal(canFunderAccess({ account: { status: 'active' }, resource: { visibility: 'shared' }, action: 'write' }), false);
  assert.equal(canFunderAccess({ account: { status: 'active' }, resource: { visibility: 'internal' }, action: 'read' }), false);
});

test('demo dataset is fictive and excludes operational BOVINIA/Tallow relics', () => {
  const demo = createFundingDemoDataset();
  const serialized = JSON.stringify(demo);
  assert.match(serialized, /exemple/i);
  assert.doesNotMatch(serialized, /BOVINIA|Tallow/i);
});
