/**
 * Élevage V3 - export / rapport synthèse.
 */

import { exportModuleReportPdf } from './moduleReportExports.js';
import { buildElevageActivityPnl, formatActivityPnlRow } from './elevageActivityPnl.js';
import { buildElevageCostAwareInsights } from './elevageIaInsights.js';
import { fmtCurrency, fmtNumber } from './format.js';
import { buildReproductionKpis } from './reproductionMetrics.js';
import { buildCycleInvestorPipeline } from './cycleMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export function buildElevageInvestorReport({
  lots = [],
  animaux = [],
  feedLogs = [],
  productionLogs = [],
  healthEvents = [],
  stocks = [],
  businessEvents = [],
  salesOrders = [],
  findings = [],
  periodLabel = '',
  farmLabel = '',
  referenceDate,
} = {}) {
  const pnl = buildElevageActivityPnl({
    lots,
    animaux,
    feedLogs,
    productionLogs,
    healthEvents,
    businessEvents,
    salesOrders,
  });
  const insights = buildElevageCostAwareInsights({
    lots,
    animaux,
    feedLogs,
    productionLogs,
    healthEvents,
    stocks,
    findings,
  });

  const referenceTime = referenceDate ? new Date(referenceDate).getTime() : Date.now();
  const weekAgo = new Date(referenceTime - 7 * 86400000).toISOString().slice(0, 10);
  const eggs7d = arr(productionLogs)
    .filter((r) => String(r.date || '').slice(0, 10) >= weekAgo)
    .reduce((s, r) => s + Number(r.oeufs_produits || r.eggs_count || 0), 0);
  const mortality = arr(lots).reduce((s, l) => s + Number(l.mortality || l.morts || 0), 0);
  const feedCost = arr(feedLogs).reduce((s, r) => s + Number(r.montant_total || r.cout_total || 0), 0);
  const reproduction = buildReproductionKpis({
    animaux,
    businessEvents,
    periodStart: weekAgo,
  });
  const cyclesPipeline = buildCycleInvestorPipeline({ lots, animaux, horizonDays: 90, referenceDate });

  return {
    title: 'Synthèse Élevage Horizon Farm',
    period: periodLabel || 'Toutes périodes',
    farm: farmLabel || 'Toutes fermes',
    summary: [
      `Lots : ${lots.length}`,
      `Animaux actifs : ${animaux.filter((a) => !['vendu', 'mort', 'perdu'].includes(String(a.status || a.statut || '').toLowerCase())).length}`,
      `Œufs 7j : ${fmtNumber(eggs7d)}`,
      `Mortalité lots : ${fmtNumber(mortality)}`,
      `Coût alimentation : ${fmtCurrency(feedCost)}`,
      `Activités suivies : ${pnl.activities.length}`,
      `Alertes analyse : ${insights.length}`,
      `Femelles : ${reproduction.females}`,
      `Gestantes : ${reproduction.gestantes}`,
      `Naissances 7j : ${reproduction.birthEvents}`,
      `Sorties cycles 90j : ${cyclesPipeline.totalUpcoming}`,
    ].join(' · '),
    pnl,
    insights: insights.slice(0, 10),
    cyclesPipeline,
    kpis: {
      lots: lots.length,
      animaux: animaux.length,
      eggs7d,
      mortality,
      feedCost,
      healthEvents: healthEvents.length,
      feedLogs: feedLogs.length,
      reproductionFemales: reproduction.females,
      reproductionGestantes: reproduction.gestantes,
      reproductionBirths7d: reproduction.birthEvents,
      cyclesUpcoming90d: cyclesPipeline.totalUpcoming,
      cyclesLate: cyclesPipeline.lateCount,
    },
    rows: [
      ...pnl.activities.map((a) => ({
        section: 'P&L activité',
        label: a.label,
        value: formatActivityPnlRow(a),
        detail: a.reliabilityMessage || a.reliabilityLabel,
      })),
      ...insights.slice(0, 8).map((i) => ({
        section: 'Alertes',
        label: i.title,
        value: i.severity || 'info',
        detail: i.description || '',
      })),
      ...cyclesPipeline.upcomingExits.map((row) => ({
        section: 'Pipeline cycles',
        label: `${row.type} · ${row.label}`,
        value: row.targetDate,
        detail: `J+${row.cycleDays} · ${fmtNumber(row.quantity)} sujet(s)`,
      })),
    ],
  };
}

export function exportElevageInvestorPdf(report = {}, fileName = '') {
  const payload = {
    module: 'Élevage',
    title: report.title || 'Synthèse Élevage',
    period: [report.farm, report.period].filter(Boolean).join(' · '),
    summary: report.summary || '',
    filename: fileName || `elevage-rapport-${new Date().toISOString().slice(0, 10)}.pdf`,
    tables: [
      {
        title: 'Indicateurs clés',
        columns: ['Indicateur', 'Valeur'],
        rows: [
          ['Lots avicoles', String(report.kpis?.lots ?? 0)],
          ['Animaux', String(report.kpis?.animaux ?? 0)],
          ['Œufs 7 jours', fmtNumber(report.kpis?.eggs7d)],
          ['Mortalité', fmtNumber(report.kpis?.mortality)],
          ['Coût alimentation', fmtCurrency(report.kpis?.feedCost)],
          ['Événements santé', String(report.kpis?.healthEvents ?? 0)],
          ['Femelles reproductrices', String(report.kpis?.reproductionFemales ?? 0)],
          ['Gestantes', String(report.kpis?.reproductionGestantes ?? 0)],
          ['Naissances 7 j', fmtNumber(report.kpis?.reproductionBirths7d)],
          ['Sorties cycles 90 j', fmtNumber(report.kpis?.cyclesUpcoming90d)],
          ['Cycles en retard', fmtNumber(report.kpis?.cyclesLate)],
        ],
      },
      {
        title: 'Prochaines sorties (cycles)',
        columns: ['Entité', 'Type', 'Date cible', 'Quantité'],
        rows: (report.cyclesPipeline?.upcomingExits || []).map((row) => [
          row.label,
          row.type,
          row.targetDate,
          fmtNumber(row.quantity),
        ]),
      },
      {
        title: 'P&L par activité',
        columns: ['Activité', 'Marge brute technique / statut', 'Fiabilité'],
        rows: arr(report.pnl?.activities).map((a) => [a.label, formatActivityPnlRow(a), a.reliabilityLabel]),
      },
      {
        title: 'Alertes & recommandations',
        columns: ['Alerte', 'Détail', 'Niveau'],
        rows: arr(report.insights).map((i) => [i.title, i.description || '', i.severity || 'info']),
      },
    ],
  };
  exportModuleReportPdf(payload);
  return payload;
}
