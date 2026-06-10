import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildElevageCockpitKpis } from '../../src/utils/elevageCockpitKpis.js';
import { buildElevageExecutiveBrief } from '../../src/utils/elevageExecutiveBrief.js';
import { diagnoseElevageEntity } from '../../src/utils/elevageLotDiagnostic.js';
import { buildFeedStockRuptureAlerts, suggestRationForTarget } from '../../src/utils/elevageFeedingIntel.js';
import { evaluateElevageHealthBlocks } from '../../src/utils/elevageHealthBlocks.js';
import { classifyElevageDocument } from '../../src/utils/elevageDocumentVault.js';
import { setupTestStorage, assertModuleTabStable, buildSimulatedProps, withSimulatedMode } from './helpers/moduleTabTestHarness.js';

setupTestStorage();

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const recoveredSrc = readFileSync(join(root, 'src/modules/ElevageRecoveredModule.jsx'), 'utf8');
const cyclesSrc = readFileSync(join(root, 'src/modules/elevage/ElevageCyclesPanel.jsx'), 'utf8');

test('Résumé — cockpit 6 KPI via ElevageSummaryCockpit', () => {
  assert.match(recoveredSrc, /ElevageSummaryCockpit/);
  const summarySrc = readFileSync(join(root, 'src/modules/elevage/ElevageSummaryCockpit.jsx'), 'utf8');
  assert.match(summarySrc, /Brief Assistant/);
  const kpis = buildElevageCockpitKpis({ layingRateLabel: '82 %', layingRateCalculable: true, feedCost: 1000 });
  assert.equal(kpis.length, 6);
  assert.equal(kpis[0].id, 'laying');
});

test('Brief Assistant — règles métier', () => {
  const brief = buildElevageExecutiveBrief({ healthScore: 80, healthLate: 0, recentMortality: 0 });
  assert.match(brief.headline, /stable/i);
  assert.ok(brief.attention);
});

test('Cycles — planifier lot pas création directe', () => {
  assert.match(cyclesSrc, /Planifier lot chair/);
  assert.doesNotMatch(cyclesSrc, /title="\+ Lot chair"/);
});

test('Production diagnostic — surconsommation détectable', () => {
  const diag = diagnoseElevageEntity(
    { id: 'L1', type: 'Chair', name: 'A', initial_count: 100, current_count: 90, weight_avg: 1.5, mortality: 5 },
    { lots: [{ id: 'L2', type: 'Chair', name: 'B', initial_count: 100, current_count: 95, weight_avg: 1.8 }], marginContext: { feedLogs: [], productionLogs: [], healthEvents: [] } },
  );
  assert.ok(diag.causeText);
});

test('Alimentation — suggestion ration et rupture', () => {
  const ration = suggestRationForTarget({ type: 'Chair', current_count: 100 }, 'lot');
  assert.ok(ration.quantity7d > 0);
  const alerts = buildFeedStockRuptureAlerts({
    stocks: [{ produit: 'Aliment chair', categorie: 'aliment', quantite: 0 }],
    feedLogs: [],
  });
  assert.ok(alerts.length >= 1);
});

test('Santé — blocage si retard', () => {
  const blocks = evaluateElevageHealthBlocks({
    healthRows: [{ id: 'S1', statut: 'a_faire', prevue: '2020-01-01' }],
  });
  assert.equal(blocks.blocked, true);
  assert.equal(blocks.blockSale, true);
});

test('Annexe — classement document reproduction', () => {
  assert.equal(classifyElevageDocument({ module_source: 'reproduction', title: 'Portée' }), 'naissance');
});

test('Élevage onglets — mode simulé stable', async () => {
  await withSimulatedMode(true, async () => {
    const props = buildSimulatedProps();
    await assertModuleTabStable('elevage', 'Résumé', props);
    await assertModuleTabStable('elevage', 'Alimentation', props);
    await assertModuleTabStable('elevage', 'Annexe', props);
  });
});
