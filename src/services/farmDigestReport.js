/**
 * Rapport de synthèse ferme - digest hebdo / mensuel.
 *
 * Assemble ce que les moteurs produisent déjà (cockpit d'indicateurs, alertes
 * prédictives, relances du jour) en UN brief prêt à envoyer à la direction et au
 * financeur : où va bien / où ça coince, ce qui arrive, quoi faire cette semaine.
 *
 * Deux sorties : une structure exploitable (sections) et un rendu texte/markdown
 * compact (WhatsApp, PDF, e-mail). Un narratif modèle optionnel pourra habiller le
 * texte, sans rien changer aux chiffres.
 */

import { buildCockpitCatalog } from './kpiEngine/cockpitCatalog.js';
import { buildPredictiveAlerts } from './predictiveAlerts.js';
import { buildDailyRelanceBatchSync } from './relanceAutomation.js';

const PERIOD_LABEL = { hebdo: 'Cette semaine', mensuel: 'Ce mois', jour: "Aujourd'hui" };

/**
 * Construit le digest structuré.
 * @returns { period, periodLabel, generatedAt, sections, summary }
 */
export function buildFarmDigest(data = {}, { period = 'hebdo', referenceDate = '' } = {}) {
  const catalog = buildCockpitCatalog(data);
  const predictions = buildPredictiveAlerts(data, { referenceDate });
  const relances = buildDailyRelanceBatchSync({
    clients: data.clients || [],
    orders: data.sales_orders || data.salesOrders || [],
    payments: data.payments || [],
    referenceDate,
  });

  const finance = catalog.sections.find((s) => s.activity === 'finance');
  const commercial = catalog.sections.find((s) => s.activity === 'commercial');

  // Points d'attention = indicateurs non verts, les plus critiques d'abord.
  const attention = catalog.sections.flatMap((s) => s.indicators
    .filter((i) => i.tone === 'bad' || i.tone === 'warn')
    .map((i) => ({ activity: s.label, label: i.label, valueLabel: i.valueLabel, tone: i.tone, decision: i.decision })))
    .sort((a, b) => (a.tone === 'bad' ? 0 : 1) - (b.tone === 'bad' ? 0 : 1));

  const topPredictions = predictions.alerts
    .filter((a) => a.severity === 'critique' || a.severity === 'haute')
    .slice(0, 6);

  // Prochaines actions : fusion des décisions les plus urgentes (prédictions +
  // points critiques + relances), dédupliquées, limitées.
  const actions = [
    ...topPredictions.map((a) => ({ priority: a.severity, text: a.action_recommandee, source: 'prédiction' })),
    ...attention.filter((a) => a.tone === 'bad').map((a) => ({ priority: 'haute', text: `${a.label} : ${a.decision}`, source: 'indicateur' })),
    ...(relances.items.length ? [{ priority: 'haute', text: `Envoyer ${relances.items.length} relance(s) (${relances.summary.totalAmountLabel})`, source: 'relances' }] : []),
  ];
  const seen = new Set();
  const dedupActions = actions.filter((a) => { const k = a.text; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);

  const sections = {
    finance: {
      title: 'Trésorerie & charges',
      indicators: finance ? finance.indicators : [],
    },
    commercial: {
      title: 'Commercial',
      indicators: commercial ? commercial.indicators : [],
      relances: relances.summary,
    },
    pilotage: {
      title: "Points d'attention",
      items: attention,
      counts: catalog.summary,
    },
    predictions: {
      title: 'À anticiper',
      alerts: topPredictions,
      counts: predictions.summary,
    },
    actions: {
      title: 'Prochaines actions',
      items: dedupActions,
    },
  };

  return {
    period,
    periodLabel: PERIOD_LABEL[period] || period,
    referenceDate: referenceDate || new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    sections,
    summary: {
      indicators: catalog.summary.indicators,
      good: catalog.summary.good,
      attention: attention.length,
      predictions: predictions.summary.total,
      relances: relances.summary.count,
      actions: dedupActions.length,
    },
  };
}

const toneMark = (tone) => (tone === 'good' ? '🟢' : tone === 'warn' ? '🟠' : tone === 'bad' ? '🔴' : '⚪');

/**
 * Rend le digest en texte/markdown compact (WhatsApp / e-mail / PDF).
 */
export function renderDigestText(digest = {}) {
  const s = digest.sections || {};
  const lines = [];
  lines.push(`*Horizon Farm - Rapport ${digest.periodLabel || ''}*`);
  lines.push(`_${digest.referenceDate || ''}_`);
  lines.push('');

  if (s.finance?.indicators?.length) {
    lines.push('*Trésorerie & charges*');
    s.finance.indicators.forEach((i) => lines.push(`${toneMark(i.tone)} ${i.label} : ${i.valueLabel}`));
    lines.push('');
  }

  if (s.commercial?.relances) {
    const r = s.commercial.relances;
    lines.push('*Commercial*');
    (s.commercial.indicators || []).slice(0, 3).forEach((i) => lines.push(`${toneMark(i.tone)} ${i.label} : ${i.valueLabel}`));
    if (r.count) lines.push(`• ${r.count} relance(s) à envoyer (${r.totalAmountLabel})`);
    lines.push('');
  }

  if (s.pilotage?.items?.length) {
    lines.push("*Points d'attention*");
    s.pilotage.items.slice(0, 6).forEach((a) => lines.push(`${toneMark(a.tone)} ${a.activity} - ${a.label} : ${a.valueLabel}`));
    lines.push('');
  }

  if (s.predictions?.alerts?.length) {
    lines.push('*À anticiper*');
    s.predictions.alerts.forEach((a) => lines.push(`⏳ ${a.title}`));
    lines.push('');
  }

  if (s.actions?.items?.length) {
    lines.push('*Prochaines actions*');
    s.actions.items.forEach((a, idx) => lines.push(`${idx + 1}. ${a.text}`));
  }

  return lines.join('\n').trim();
}

/**
 * Rend un objet e-mail simple (sujet + corps texte) prêt à envoyer.
 */
export function renderDigestEmail(digest = {}) {
  const attention = digest.summary?.attention || 0;
  return {
    subject: `Horizon Farm - Rapport ${digest.periodLabel || ''} (${attention} point(s) d'attention)`,
    body: renderDigestText(digest),
  };
}

export default buildFarmDigest;
