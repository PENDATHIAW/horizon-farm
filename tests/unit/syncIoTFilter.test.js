import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSyncIssuesByDomain, SYNC_ISSUE_DOMAINS } from '../../src/utils/syncAuditWorkflows.js';

const issues = [
  { module: 'smartfarm_events', flow: 'smartfarm_alerts_tasks', message: 'IoT orphelin' },
  { module: 'payments', flow: 'sales_finance', message: 'Paiement absent finances' },
  { module: 'stock', flow: 'stock_supply_finance', message: 'Stock seuil' },
  { module: 'sensor_devices', flow: 'smartfarm_alerts_tasks', message: 'Capteur offline' },
];

test('filterSyncIssuesByDomain — toutes', () => {
  assert.equal(filterSyncIssuesByDomain(issues, SYNC_ISSUE_DOMAINS.TOUTES).length, 4);
});

test('filterSyncIssuesByDomain — IoT uniquement', () => {
  const iot = filterSyncIssuesByDomain(issues, SYNC_ISSUE_DOMAINS.IOT);
  assert.equal(iot.length, 2);
  assert.ok(iot.every((issue) => issue.flow === 'smartfarm_alerts_tasks' || issue.module === 'smartfarm_events' || issue.module === 'sensor_devices'));
});

test('filterSyncIssuesByDomain — Finance uniquement', () => {
  const finance = filterSyncIssuesByDomain(issues, SYNC_ISSUE_DOMAINS.FINANCE);
  assert.equal(finance.length, 2);
  assert.ok(finance.every((issue) => ['sales_finance', 'stock_supply_finance'].includes(issue.flow)));
});
