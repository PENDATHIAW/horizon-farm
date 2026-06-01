import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueKey, issueKeyFromFinding, dedupeByIssueKey } from '../../src/services/issueKey.js';

test('buildIssueKey normalise domaine et source', () => {
  const key = buildIssueKey('Stock faible', 'Achats Stock', 'STK-1', 'Alerte');
  assert.equal(key, 'stock_faible:achats_stock:stk-1:alerte');
});

test('issueKeyFromFinding réutilise issue_key existante', () => {
  const finding = { id: 'f1', issue_key: 'custom:key', module: 'commercial' };
  assert.equal(issueKeyFromFinding(finding), 'custom:key');
});

test('dedupeByIssueKey conserve une entrée par clé', () => {
  const items = [
    { id: 'a', issue_key: 'x:y:z:1' },
    { id: 'b', issue_key: 'x:y:z:1' },
  ];
  assert.equal(dedupeByIssueKey(items, (i) => i.issue_key).length, 1);
});
