import test from 'node:test';
import assert from 'node:assert/strict';
import { renderModuleTab, setupTestStorage } from './helpers/moduleTabTestHarness.js';

setupTestStorage();

for (const moduleId of ['assistant_erp', 'commercial', 'achats_stock', 'finance_pilotage']) {
  test(`render crash scan: ${moduleId}`, async () => {
    const html = await renderModuleTab(moduleId, 'Résumé');
    assert.ok(html.length > 20, `${moduleId} rendered empty`);
  });
}
