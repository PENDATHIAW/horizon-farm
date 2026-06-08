import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveActiveModuleId } from '../../src/config/moduleEntryPoints.js';
import { NAV_MODULE_ORDER, ROUTE_TO_MODULE } from '../../src/config/modules.config.js';

test('impact_business retiré de la navigation principale', () => {
  assert.ok(!NAV_MODULE_ORDER.includes('impact_business'));
  assert.ok(NAV_MODULE_ORDER.includes('investisseurs_forums'));
});

test('impact_business redirigé vers investisseurs_forums', () => {
  assert.equal(ROUTE_TO_MODULE.impact_business, 'investisseurs_forums');
  assert.equal(resolveActiveModuleId('impact_business'), 'investisseurs_forums');
});
