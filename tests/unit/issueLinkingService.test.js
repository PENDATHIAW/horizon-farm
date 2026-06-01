import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueKey, enrichLinkedFields } from '../../src/services/issueLinkingService.js';

test('buildIssueKey normalise les segments', () => {
  const key = buildIssueKey({
    domain: 'Stock Critique',
    sourceModule: 'Achats / Stock',
    sourceRecordId: 'STK-001',
    kind: 'Rupture Aliment',
  });
  assert.equal(key, 'stock_critique:achats_stock:stk-001:rupture_aliment');
});

test('enrichLinkedFields ajoute issue/source/related/origin par défaut', () => {
  const row = enrichLinkedFields('alertes_center', {
    id: 'ALE-1',
    module_source: 'stock',
    entity_id: 'STK-1',
    title: 'Stock critique',
  });

  assert.equal(row.source_module, 'stock');
  assert.equal(row.source_record_id, 'STK-1');
  assert.equal(row.related_record_id, 'STK-1');
  assert.equal(row.origin_type, 'manual');
  assert.ok(row.issue_key.includes('alertes_center'), 'issue_key doit être construit automatiquement');
});

