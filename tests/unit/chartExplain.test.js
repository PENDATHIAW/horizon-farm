import test from 'node:test';
import assert from 'node:assert/strict';

import {
  explainChartCurve,
  proposeChartExplainDraft,
  CHART_EXPLAIN_MODULES,
} from '../../src/services/aiGateway/chartExplainService.js';
import { TARGET_WORKFLOWS } from '../../src/services/aiGateway/aiActionDrafts.js';

test('baisse ponte + rupture aliment + soins ouverts', () => {
  const insight = explainChartCurve({
    chartId: 'avicole-taux-ponte',
    title: 'Taux de ponte',
    subtitle: 'Courbe — performance pondeuses',
    series: [
      { name: 'Taux ponte', type: 'line', unit: '%', data: [82, 84, 100, 88] },
    ],
    labels: ['2026-01', '2026-02', '2026-03', '2026-04'],
    unit: '%',
    primarySeriesName: 'Taux ponte',
    context: {
      stocks: [
        { id: 'ST-1', produit: 'Aliment pondeuse', quantite: 2, seuil: 10 },
      ],
      sante: [
        { id: 'H-1', nom: 'Vaccin ND', statut: 'en_cours' },
        { id: 'H-2', nom: 'Traitement respiratoire', statut: 'planifie' },
      ],
    },
  });

  assert.match(insight.summary, /baisse/i);
  assert.match(insight.summary, /12\s*%|12%/);
  assert.ok(insight.probable_causes.some((c) => /aliment/i.test(c)));
  assert.ok(insight.probable_causes.some((c) => /soin/i.test(c)));
  assert.equal(insight.interpretation_only, true);
  assert.ok(insight.confidence >= 0.6);
  assert.ok(insight.module_links.some((l) => l.moduleId === 'achats_stock'));
  assert.ok(Array.isArray(insight.operational_signals));
});

test('proposeChartExplainDraft reste insight only', () => {
  const draft = proposeChartExplainDraft({
    title: 'Stock critique',
    series: [{ name: 'Quantité', data: [40, 30, 15], unit: 'kg' }],
    labels: ['2026-01', '2026-02', '2026-03'],
    context: {
      stocks: [{ produit: 'Maïs', quantite: 1, seuil: 5 }],
    },
  });
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.INSIGHT_ONLY);
  assert.equal(draft.intent, 'chart_explain');
  assert.ok(draft.draft.summary);
});

test('modules graphiques ciblés', () => {
  assert.ok(CHART_EXPLAIN_MODULES.has('elevage'));
  assert.ok(CHART_EXPLAIN_MODULES.has('commercial'));
  assert.ok(!CHART_EXPLAIN_MODULES.has('dashboard'));
});
