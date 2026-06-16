import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSkipAppContextBusinessEvent, filterAppContextBusinessEvents } from '../../src/utils/appContextEventGuard.js';

test('shouldSkipAppContextBusinessEvent ignore side_effects_managed', () => {
  assert.equal(shouldSkipAppContextBusinessEvent({ id: 'CMD-1', side_effects_managed: true }, 'sales_orders'), true);
});

test('shouldSkipAppContextBusinessEvent ignore workflow created_from', () => {
  assert.equal(shouldSkipAppContextBusinessEvent({ id: 'PAY-1', created_from: 'record_sale_payment' }, 'payments'), true);
  assert.equal(shouldSkipAppContextBusinessEvent({ id: 'CMD-2', created_from: 'commercial_sale_workflow' }, 'sales_orders'), true);
});

test('filterAppContextBusinessEvents vide si skip', () => {
  const events = filterAppContextBusinessEvents(
    [{ event_type: 'vente', title: 'Vente' }],
    'sales_orders',
    { id: 'CMD-3', side_effects_managed: true },
  );
  assert.equal(events.length, 0);
});

test('filterAppContextBusinessEvents conserve saisie manuelle', () => {
  const events = filterAppContextBusinessEvents(
    [{ event_type: 'vente', title: 'Vente manuelle' }],
    'sales_orders',
    { id: 'CMD-4' },
  );
  assert.equal(events.length, 1);
});
