/**
 * Élevage V3 — export / rapport synthèse.
 */

import { exportModuleReportPdf } from './moduleReportExports.js';
import { buildElevageActivityPnl, formatActivityPnlRow } from './elevageActivityPnl.js';
import { buildElevageCostAwareInsights } from './elevageIaInsights.js';
import { fmtCurrency, fmtNumber } from './format.js';

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

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const eggs7d = arr(productionLogs)
    .filter((r) => String(r.date || '').slice(0, 10) >= weekAgo)
    .reduce((s, r) => s + Number(r.oeufs_produits || r.eggs_count || 0), 0);
  const mortality = arr(lots).reduce((s, l) => s + Number(l.mortality || l.morts || 0), 0);
  const feedCost = arr(feedLogs).reduce((s, r) => s + Number(r.montant_total || r.cout_total || 0), 0);

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
      `Alertes IA : ${insights.length}`,
    ].join(' · '),
    pnl,
    insights: insights.slice(0, 10),
    kpis: {
      lots: lots.length,
      animaux: animaux.length,
      eggs7d,
      mortality,
      feedCost,
      healthEvents: healthEvents.length,
      feedLogs: feedLogs.length,
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
        ],
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
