/**
 * Insights graphiques - narration uniquement, aucune écriture workflow.
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

function trendLabel(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0 && c === 0) return 'stable';
  if (p === 0) return 'hausse';
  const delta = ((c - p) / Math.abs(p)) * 100;
  if (delta > 8) return 'hausse';
  if (delta < -8) return 'baisse';
  return 'stable';
}

/**
 * Génère un brouillon insight à partir de séries graphiques (règles, pas LLM obligatoire).
 */
export function generateChartInsightDraft({
  chartId = 'chart',
  title = 'Graphique',
  series = [],
  labels = [],
  unit = '',
  context = {},
} = {}) {
  const points = arr(series).map((v) => Number(v) || 0);
  const last = points[points.length - 1] ?? 0;
  const prev = points[points.length - 2] ?? points[0] ?? 0;
  const max = points.length ? Math.max(...points) : 0;
  const min = points.length ? Math.min(...points) : 0;
  const trend = trendLabel(last, prev);
  const labelLast = labels[labels.length - 1] || 'dernière période';

  const bullets = [
    `${title} : ${fmt(last)}${unit ? ` ${unit}` : ''} sur ${labelLast}.`,
    `Tendance ${trend} par rapport à la période précédente (${fmt(prev)}${unit ? ` ${unit}` : ''}).`,
  ];

  if (max !== min && points.length > 2) {
    bullets.push(`Fourchette observée : ${fmt(min)} – ${fmt(max)}${unit ? ` ${unit}` : ''}.`);
  }

  if (context.threshold != null && last < context.threshold) {
    bullets.push(`Alerte : valeur sous le seuil (${fmt(context.threshold)}).`);
  }

  return createAiActionDraft({
    intent: 'chart_insight',
    confidence: points.length >= 2 ? 0.88 : 0.55,
    source: AI_DRAFT_SOURCES.CHART,
    draft: {
      chart_id: chartId,
      title,
      summary: bullets.join(' '),
      bullets,
      metrics: { last, previous: prev, max, min, trend },
      series: points,
      labels: arr(labels),
    },
    target_workflow: TARGET_WORKFLOWS.INSIGHT_ONLY,
    required_validation: false,
    warnings: points.length < 2 ? ['Peu de points : interprétation limitée.'] : [],
    missing_fields: [],
    status: 'insight_ready',
  });
}
