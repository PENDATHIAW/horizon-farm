import test from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestStorage,
  renderModuleTab,
  buildSimulatedProps,
} from './helpers/moduleTabTestHarness.js';
import { AGRI_FEEDS_TABS } from '../../src/utils/agriFeedsNavigation.js';

setupTestStorage();

for (const tab of AGRI_FEEDS_TABS) {
  test(`agri_feeds render — ${tab}`, async () => {
    const html = await renderModuleTab('agri_feeds', tab, buildSimulatedProps({
      alimentationLogs: [
        { id: '1', quantite: 20, montant_total: 10000, cible_id: 'LOT1', type_cible: 'lot_avicole', date: '2026-01-05' },
      ],
      lots: [{ id: 'LOT1', nom: 'Bande test', type: 'Chair', initial_count: 100, current_count: 95, mortality: 5 }],
      stocks: [{ id: 'S1', produit: 'Aliment', categorie: 'aliment_avicole', quantite: 50, prixUnit: 400 }],
    }));
    assert.ok(html.length > 100);
    assert.match(html, /AGRI FEEDS/);
  });
}
