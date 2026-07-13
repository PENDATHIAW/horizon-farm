import assert from 'node:assert/strict';
import test from 'node:test';
import * as rules from '../../src/utils/justifiedExceptionRules.js';
import * as store from '../../src/utils/justifiedExceptionStore.js';

function setupLocalStorage(initial = {}) {
  let store = { ...initial };
  globalThis.localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
  };
  return store;
}

test('exceptions justifiées — création, filtrage, révocation et migration', () => {
  setupLocalStorage();

  const issueKey = rules.buildInterconnectionIssueKey({
    flow: 'sales_finance',
    module: 'payments',
    row_id: 'PAY-1',
    linked_id: 'ORD-1',
    message: 'Paiement sans finance',
  });

  assert.equal(issueKey, 'sales_finance:payments:PAY-1:ORD-1:Paiement sans finance');

  const created = store.markJustifiedException({
    issue_key: issueKey,
    raison: 'vente_credit_normale',
    commentaire: 'Crédit client validé',
    utilisateur: 'admin@test.fr',
    source_module: 'payments',
    source_record_id: 'PAY-1',
    type_exception: rules.JUSTIFIED_EXCEPTION_TYPES.INTERCONNECTION,
  });

  assert.equal(created.issue_key, issueKey);
  assert.equal(created.active, true);
  assert.equal(store.isIssueJustified(issueKey), true);

  const filtered = store.filterJustifiedIssues([
    { flow: 'sales_finance', module: 'payments', row_id: 'PAY-1', linked_id: 'ORD-1', message: 'Paiement sans finance' },
    { flow: 'documents_traceability', module: 'documents', row_id: 'DOC-1', linked_id: '', message: 'Autre point' },
  ], rules.buildInterconnectionIssueKey);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].row_id, 'DOC-1');

  const revoked = store.revokeJustifiedException(issueKey, 'admin@test.fr');
  assert.equal(revoked.active, false);
  assert.equal(store.isIssueJustified(issueKey), false);

  setupLocalStorage();
  globalThis.localStorage.setItem(rules.LEGACY_IGNORED_INTERCONNECTION_KEY, JSON.stringify(['legacy:key:1']));
  const rows = store.readJustifiedExceptions();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].issue_key, 'legacy:key:1');
  assert.equal(globalThis.localStorage.getItem(rules.LEGACY_IGNORED_INTERCONNECTION_KEY), null);
});
