import test from 'node:test';
import assert from 'node:assert/strict';
import { getFarmAlerts, getFarmKpis, getFarmQuickActions } from '../../src/config/farmAdaptation.js';

test('getFarmAlerts accepte farm null sans crash', () => {
  const alerts = getFarmAlerts(null);
  assert.ok(Array.isArray(alerts));
  assert.ok(alerts.length > 0);
});

test('getFarmKpis accepte farm null sans crash', () => {
  const kpis = getFarmKpis(null, { mode: 'single' });
  assert.ok(Array.isArray(kpis));
  assert.ok(kpis.length > 0);
});

test('getFarmQuickActions accepte farm null sans crash', () => {
  const actions = getFarmQuickActions(null);
  assert.ok(Array.isArray(actions));
});
