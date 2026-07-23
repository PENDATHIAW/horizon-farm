import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRequiredPersistenceColumn,
  requiredPersistenceError,
} from '../../src/services/baseSupabaseService.js';

test('les informations qui empêchent les doublons ne peuvent pas être ignorées', () => {
  for (const column of ['farm_id', 'event_key', 'idempotency_key', 'issue_key', 'dedupe_key']) {
    assert.equal(isRequiredPersistenceColumn('tasks', column), true, column);
  }
});

test('les montants et rattachements financiers sont obligatoires', () => {
  assert.equal(isRequiredPersistenceColumn('payments', 'order_id'), true);
  assert.equal(isRequiredPersistenceColumn('payments', 'montant'), true);
  assert.equal(isRequiredPersistenceColumn('transactions', 'treasury_account_id'), true);
  assert.equal(isRequiredPersistenceColumn('stock_movements', 'quantity'), true);
  assert.equal(isRequiredPersistenceColumn('documents', 'description'), false);
});

test('le message présenté reste simple et ne révèle pas les détails internes', () => {
  const original = new Error("Could not find the 'farm_id' column");
  const error = requiredPersistenceError(original, 'payments', 'farm_id');
  assert.equal(error.code, 'REQUIRED_FIELD_NOT_STORED');
  assert.match(error.message, /information obligatoire/i);
  assert.doesNotMatch(error.message, /supabase|schema|colonne/i);
});
