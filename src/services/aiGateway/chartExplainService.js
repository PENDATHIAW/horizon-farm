/**
 * « Pourquoi ? » — interprétation de courbes graphiques (lecture seule, aucune écriture).
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value) || 0;
const lower = (value) => String(value || '').toLowerCase();
const fmt = (value, unit = '') => {
  const num = n(value);
  const base = Number.isInteger(num) ? num.toLocaleString('fr-FR') : num.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return unit ? `${base} ${unit}`.trim() : base;
};

const CLOSED_HEALTH = new Set(['termine', 'terminé', 'done', 'cloture', 'clôturé', 'clos', 'ferme', 'fermé']);
const CLOSED_TASK = new Set(['termine', 'terminé', 'done', 'annule', 'annulé']);

export const CHART_EXPLAIN_MODULES = new Set([
  'elevage',
  'commercial',
  'achats_stock',
  'finance_pilotage',
  'activite_suivi',
  'objectifs_croissance',
]);

function slugify(text = '') {
  return lower(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';
}

function stockLabel(row = {}) {
  return String(row.produit || row.nom || row.name || row.label || row.id || 'Article').trim();
}

function isLowStock(row = {}) {
  const qty = n(row.quantite ?? row.quantity ?? row.stock);
  const seuil = n(row.seuil ?? row.threshold);
  return seuil > 0 && qty <= seuil;
}

function isOpenHealth(row = {}) {
  const status = lower(row.statut || row.status || row.etat);
  if (!status) return !row.date_cloture && !row.closed_at;
  return !CLOSED_HEALTH.has(status);
}

function isOpenTask(row = {}) {
  const status = lower(row.status || row.statut);
  if (!status) return true;
  return !CLOSED_TASK.has(status);
}

function deltaPercent(current, previous) {
  const c = n(current);
  const p = n(previous);
  if (p === 0 && c === 0) return null;
  if (p === 0) return c > 0 ? 100 : -100;
  return Math.round(((c - p) / Math.abs(p)) * 100);
}

function trendFromDelta(delta) {
  if (delta == null) return 'stable';
  if (delta > 8) return 'hausse';
  if (delta < -8) return 'baisse';
  return 'stable';
}

function confidenceLabel(score) {
  if (score >= 0.82) return 'Élevée';
  if (score >= 0.62) return 'Moyenne';
  return 'Prudente';
}

function pickPrimarySeries(series = [], primarySeriesName = '') {
  const list = arr(series);
  if (!list.length) return { name: 'Série', data: [], unit: '' };
  if (primarySeriesName) {
    const match = list.find((item) => lower(item.name) === lower(primarySeriesName));
    if (match) return match;
  }
  const line = list.find((item) => item.type === 'line') || list[0];
  return line;
}

function topicHints(title = '', subtitle = '', series = []) {
  const blob = lower(`${title} ${subtitle} ${arr(series).map((s) => s.name).join(' ')}`);
  return {
    ponte: /ponte|œuf|oeuf|ovo|production/.test(blob),
    vente: /ca|marge|vente|commande|client|commercial/.test(blob),
    stock: /stock|inventaire|rupture|aliment|achat/.test(blob),
    finance: /trésorerie|tresorerie|encaisse|dépense|depense|flux|finance|créance|creance/.test(blob),
    tache: /tâche|tache|retard|activité|activite|suivi/.test(blob),
    sante: /santé|sante|soin|vaccin|mortalité|mortalite/.test(blob),
  };
}

function feedLowStocks(stocks = []) {
  return arr(stocks).filter((row) => {
    if (!isLowStock(row)) return false;
    const label = lower(stockLabel(row));
    return /aliment|feed|pondeuse|provende|son|maïs|mais|fourrage/.test(label);
  });
}

function openHealthRecords(sante = [], vaccins = []) {
  const merged = [...arr(sante), ...arr(vaccins)];
  const seen = new Set();
  return merged.filter((row) => {
    const key = String(row.id || `${row.nom}-${row.date}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return isOpenHealth(row);
  });
}

function openTasksOnPeriod(taches = [], labels = []) {
  const open = arr(taches).filter(isOpenTask);
  if (!labels.length) return open;
  const lastLabel = labels[labels.length - 1];
  const monthKey = String(lastLabel || '').slice(0, 7);
  if (!/^\d{4}-\d{2}/.test(monthKey)) return open;
  return open.filter((row) => {
    const due = String(row.due_date || row.date || row.created_at || '').slice(0, 7);
    return !due || due <= monthKey;
  });
}

function eventsInWindow(events = [], labels = []) {
  if (!labels.length) return arr(events).slice(-5);
  const last = String(labels[labels.length - 1] || '');
  const month = last.slice(0, 7);
  return arr(events).filter((row) => {
    const when = String(row.date || row.created_at || row.occurred_at || '').slice(0, 7);
    return !month || !when || when === month || when === last;
  }).slice(0, 6);
}

function buildModuleLink(moduleId, tab, label) {
  return { moduleId, tab, label };
}

function correlateContext({ topics, context = {}, labels = [], delta, trend }) {
  const causes = [];
  const actions = [];
  const links = [];
  let confidence = 0.55;

  const stocks = arr(context.stocks);
  const sante = arr(context.sante);
  const vaccins = arr(context.vaccins);
  const taches = arr(context.taches);
  const events = eventsInWindow(context.businessEvents, labels);

  if (topics.ponte && trend === 'baisse') {
    const lowFeed = feedLowStocks(stocks);
    if (lowFeed.length) {
      const names = lowFeed.slice(0, 2).map(stockLabel).join(', ');
      causes.push(`Rupture ou tension sur l'aliment (${names}).`);
      actions.push("Réapprovisionner l'aliment pondeuse et vérifier les distributions.");
      links.push(buildModuleLink('achats_stock', 'Stock', 'Voir le stock aliment'));
      confidence += 0.12;
    }
    const openCare = openHealthRecords(sante, vaccins);
    if (openCare.length) {
      const count = openCare.length;
      causes.push(`${count} soin${count > 1 ? 's' : ''} non clôturé${count > 1 ? 's' : ''}.`);
      actions.push("Clôturer ou planifier les soins en cours sur l'onglet Santé.");
      links.push(buildModuleLink('elevage', 'Santé', 'Ouvrir les soins élevage'));
      confidence += 0.1;
    }
    if (events.length) {
      const titles = events.slice(0, 2).map((e) => e.title || e.event_type || 'événement').join(', ');
      causes.push(`Événements métier sur la période : ${titles}.`);
      links.push(buildModuleLink('activite_suivi', 'Traçabilité', 'Voir la traçabilité'));
      confidence += 0.06;
    }
  }

  if (topics.vente) {
    const openOrders = arr(context.salesOrders).filter((row) => {
      const st = lower(row.statut || row.status);
      return st && !['livre', 'livrée', 'delivered', 'paye', 'payé', 'closed'].includes(st);
    });
    if (trend === 'baisse' && openOrders.length) {
      causes.push(`${openOrders.length} commande(s) encore ouverte(s) — le CA peut être sous-estimé.`);
      actions.push('Relancer les livraisons ou encaissements en attente.');
      links.push(buildModuleLink('commercial', 'Ventes', 'Voir les ventes'));
      confidence += 0.08;
    }
    const receivables = arr(context.payments).filter((row) => n(row.reste ?? row.remaining) > 0);
    if (receivables.length && (topics.vente || /créance|creance/.test(lower(labels.join(''))))) {
      causes.push(`${receivables.length} encaissement(s) partiel(s) ou créances actives.`);
      links.push(buildModuleLink('finance_pilotage', 'Créances', 'Piloter les créances'));
      confidence += 0.05;
    }
  }

  if (topics.stock) {
    const low = stocks.filter(isLowStock);
    if (low.length) {
      causes.push(`${low.length} référence(s) sous seuil d'alerte.`);
      actions.push('Passer une commande fournisseur ou ajuster le seuil.');
      links.push(buildModuleLink('achats_stock', 'Stock', 'Gérer le stock'));
      confidence += 0.1;
    }
  }

  if (topics.finance) {
    const missingProof = arr(context.transactions).filter((row) => !row.document_id && !row.preuve_id);
    if (missingProof.length) {
      causes.push(`${missingProof.length} mouvement(s) sans justificatif — la lecture peut être incomplète.`);
      links.push(buildModuleLink('documents_rapports', 'Preuves', 'Compléter les preuves'));
      confidence += 0.04;
    }
  }

  if (topics.tache) {
    const late = arr(taches).filter((row) => lower(row.status || row.statut) === 'retard');
    const open = openTasksOnPeriod(taches, labels);
    if (late.length) {
      causes.push(`${late.length} tâche(s) en retard.`);
      actions.push("Prioriser les tâches en retard sur l'onglet Tâches.");
      links.push(buildModuleLink('activite_suivi', 'Tâches', 'Voir les tâches'));
      confidence += 0.08;
    } else if (open.length > 3) {
      causes.push(`Charge élevée : ${open.length} tâches encore ouvertes.`);
      links.push(buildModuleLink('activite_suivi', 'Tâches', 'Voir les tâches'));
      confidence += 0.05;
    }
  }

  if (topics.sante && !causes.some((c) => /soin/i.test(c))) {
    const openCare = openHealthRecords(sante, vaccins);
    if (openCare.length) {
      causes.push(`${openCare.length} intervention(s) sanitaire(s) à suivre.`);
      links.push(buildModuleLink('elevage', 'Santé', 'Suivi sanitaire'));
      confidence += 0.07;
    }
  }

  if (arr(context.alertes).length && trend === 'baisse') {
    causes.push(`${context.alertes.length} alerte(s) active(s) sur le module.`);
    links.push(buildModuleLink('activite_suivi', 'Alertes', 'Consulter les alertes'));
    confidence += 0.04;
  }

  if (delta != null && Math.abs(delta) >= 15 && causes.length === 0) {
    causes.push('Variation marquée sans corrélation automatique évidente — vérifier les saisies terrain.');
    actions.push("Comparer avec le journal d'activité et les preuves de la période.");
    confidence = Math.min(confidence, 0.58);
  }

  if (!actions.length && causes.length) {
    actions.push('Croiser cette courbe avec les modules sources listés ci-dessous.');
  }

  return {
    causes: [...new Set(causes)],
    actions: [...new Set(actions)],
    links: dedupeLinks(links),
    confidence: Math.min(0.95, Math.max(0.42, confidence)),
  };
}

function dedupeLinks(links = []) {
  const seen = new Set();
  return links.filter((link) => {
    const key = `${link.moduleId}-${link.tab}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sumEggsInWindow(logs = [], daysBack = 7) {
  const end = Date.now();
  const start = end - daysBack * 86400000;
  const prevStart = start - daysBack * 86400000;
  let recent = 0;
  let previous = 0;
  arr(logs).forEach((row) => {
    const ts = new Date(String(row.date || row.created_at || '').slice(0, 10)).getTime();
    if (Number.isNaN(ts)) return;
    const qty = n(row.oeufs_produits ?? row.eggs_count ?? row.oeufs);
    if (ts >= start && ts <= end) recent += qty;
    else if (ts >= prevStart && ts < start) previous += qty;
  });
  return { recent, previous, delta: previous > 0 ? Math.round(((recent - previous) / previous) * 100) : (recent > 0 ? 100 : 0) };
}

function buildOperationalSignals({ topics, context = {}, last, prev, unit, delta, trend, seriesName = '' }) {
  const signals = [];
  const push = (signal) => {
    if (signal?.label) signals.push(signal);
  };

  if (topics.ponte) {
    const eggWindow = sumEggsInWindow(context.productionLogs, 7);
    if (eggWindow.recent > 0 || eggWindow.previous > 0) {
      push({
        label: 'Ramassages 7 j',
        value: `${fmt(eggWindow.recent, 'œufs')} (sem. préc. ${fmt(eggWindow.previous, 'œufs')})`,
        severity: eggWindow.delta <= -12 ? 'warn' : 'info',
        action: eggWindow.delta <= -12 ? 'Vérifier alimentation et santé des pondeuses' : 'Continuer le suivi quotidien',
        moduleId: 'elevage',
        tab: 'Production',
        linkLabel: 'Saisir / voir ramassages',
      });
    }
    const lowFeed = feedLowStocks(arr(context.stocks));
    if (lowFeed.length) {
      const names = lowFeed.slice(0, 2).map(stockLabel).join(', ');
      push({
        label: 'Aliment sous seuil',
        value: names,
        severity: 'critique',
        action: `Commander ou réceptionner : ${names}`,
        moduleId: 'achats_stock',
        tab: 'Stock',
        linkLabel: 'Passer commande stock',
      });
    }
  }

  if (topics.stock) {
    const low = arr(context.stocks).filter(isLowStock);
    low.slice(0, 3).forEach((row) => {
      push({
        label: 'Rupture imminente',
        value: `${stockLabel(row)} · ${fmt(n(row.quantite ?? row.quantity), row.unite || 'u')} restant(s)`,
        severity: 'critique',
        action: 'Lancer une réception achat ou ajuster le seuil',
        moduleId: 'achats_stock',
        tab: 'Stock',
        linkLabel: 'Réception achat',
      });
    });
  }

  if (topics.vente) {
    const openOrders = arr(context.salesOrders).filter((row) => {
      const st = lower(row.statut || row.status);
      return st && !['livre', 'livrée', 'delivered', 'paye', 'payé', 'closed'].includes(st);
    });
    if (openOrders.length) {
      const total = openOrders.reduce((s, row) => s + n(row.montant_total ?? row.total ?? row.amount), 0);
      push({
        label: 'Commandes ouvertes',
        value: `${openOrders.length} · ${fmt(total, 'FCFA')} potentiel`,
        severity: trend === 'baisse' ? 'warn' : 'info',
        action: 'Relancer livraison ou encaissement',
        moduleId: 'commercial',
        tab: 'Ventes',
        linkLabel: 'Voir ventes en cours',
      });
    }
  }

  if (topics.finance) {
    const missingProof = arr(context.transactions).filter((row) => !row.document_id && !row.preuve_id);
    if (missingProof.length) {
      push({
        label: 'Preuves manquantes',
        value: `${missingProof.length} mouvement(s) sans justificatif`,
        severity: 'warn',
        action: 'Joindre factures / reçus sur les lignes concernées',
        moduleId: 'documents_rapports',
        tab: null,
        linkLabel: 'Compléter preuves',
      });
    }
  }

  if (topics.tache) {
    const late = arr(context.taches).filter((row) => lower(row.status || row.statut) === 'retard');
    if (late.length) {
      push({
        label: 'Tâches en retard',
        value: `${late.length} action(s)`,
        severity: 'critique',
        action: 'Traiter ou replanifier les tâches en retard',
        moduleId: 'activite_suivi',
        tab: 'Tâches',
        linkLabel: 'Ouvrir les tâches',
      });
    }
  }

  if (topics.sante) {
    const openCare = openHealthRecords(arr(context.sante), arr(context.vaccins));
    if (openCare.length) {
      push({
        label: 'Soins à clôturer',
        value: `${openCare.length} intervention(s)`,
        severity: 'warn',
        action: 'Planifier ou clôturer les soins en cours',
        moduleId: 'elevage',
        tab: 'Santé',
        linkLabel: 'Suivi sanitaire',
      });
    }
  }

  if (delta != null && Math.abs(delta) >= 10 && seriesName) {
    push({
      label: 'Variation mesurée',
      value: `${seriesName} : ${fmt(prev, unit)} → ${fmt(last, unit)} (${delta > 0 ? '+' : ''}${delta} %)`,
      severity: Math.abs(delta) >= 20 ? 'warn' : 'info',
      action: trend === 'baisse' ? 'Identifier la cause terrain cette semaine' : 'Capitaliser sur la dynamique positive',
      moduleId: '',
      tab: null,
      linkLabel: '',
    });
  }

  return signals.slice(0, 5);
}

function buildPriorityAction(signals = [], links = []) {
  const critical = signals.find((s) => s.severity === 'critique');
  if (critical?.action) return critical;
  if (signals[0]?.action) return signals[0];
  if (links[0]) return { label: 'Action suggérée', action: links[0].label, moduleId: links[0].moduleId, tab: links[0].tab, linkLabel: links[0].label };
  return null;
}
function buildSummary({ title, seriesName, last, prev, unit, delta, trend, periodLabel, causes }) {
  const parts = [];
  const metricLabel = seriesName || title;
  if (delta != null && trend !== 'stable') {
    const dir = trend === 'baisse' ? 'baisse' : 'hausse';
    parts.push(`La courbe « ${metricLabel} » affiche une ${dir} d'environ ${Math.abs(delta)} % (${fmt(prev, unit)} → ${fmt(last, unit)}).`);
  } else if (last !== prev) {
    parts.push(`« ${metricLabel} » : ${fmt(last, unit)} sur ${periodLabel} (précédent : ${fmt(prev, unit)}).`);
  } else {
    parts.push(`« ${metricLabel} » reste stable autour de ${fmt(last, unit)} sur ${periodLabel}.`);
  }
  if (causes.length) {
    parts.push(`Cette évolution coïncide avec ${causes[0].replace(/\.$/, '')}${causes.length > 1 ? `, et ${causes.slice(1).join(' ').replace(/\.$/g, '')}` : ''}.`);
  }
  return parts.join(' ');
}

/**
 * Interprète une courbe à partir des séries affichées et du contexte métier (sans modifier les données).
 */
export function explainChartCurve({
  chartId,
  title = 'Graphique',
  subtitle = '',
  series = [],
  labels = [],
  unit = '',
  primarySeriesName = '',
  periodLabel = 'la période affichée',
  context = {},
} = {}) {
  const primary = pickPrimarySeries(series, primarySeriesName);
  const points = arr(primary.data).map((v) => n(v));
  const last = points[points.length - 1] ?? 0;
  const prev = points[points.length - 2] ?? points[0] ?? 0;
  const delta = points.length >= 2 ? deltaPercent(last, prev) : null;
  const trend = trendFromDelta(delta);
  const topics = topicHints(title, subtitle, series);
  const labelLast = labels[labels.length - 1] || periodLabel;

  const { causes, actions, links, confidence } = correlateContext({
    topics,
    context,
    labels,
    delta,
    trend,
  });

  const operational_signals = buildOperationalSignals({
    topics,
    context,
    labels,
    last,
    prev,
    unit: unit || primary.unit || '',
    delta,
    trend,
    seriesName: primary.name,
  });
  const priority_action = buildPriorityAction(operational_signals, links);

  const summary = buildSummary({
    title,
    seriesName: primary.name,
    last,
    prev,
    unit: unit || primary.unit || '',
    delta,
    trend,
    periodLabel: labelLast,
    causes,
  });

  const warnings = [];
  if (points.length < 2) warnings.push('Peu de points : interprétation limitée.');
  if (!causes.length) warnings.push('Aucune corrélation métier automatique — lecture descriptive uniquement.');

  const result = {
    chart_id: chartId || slugify(title),
    title,
    summary,
    probable_causes: causes,
    confidence,
    confidence_label: confidenceLabel(confidence),
    recommended_actions: actions,
    operational_signals,
    priority_action,
    module_links: links,
    metrics: { last, previous: prev, delta_percent: delta, trend },
    interpretation_only: true,
    warnings,
  };

  return result;
}

/**
 * Brouillon gateway (insight only) pour homogénéité avec l'AI Gateway.
 */
export function proposeChartExplainDraft(payload = {}) {
  const insight = explainChartCurve(payload);
  return createAiActionDraft({
    intent: 'chart_explain',
    confidence: insight.confidence,
    source: AI_DRAFT_SOURCES.CHART,
    draft: insight,
    target_workflow: TARGET_WORKFLOWS.INSIGHT_ONLY,
    required_validation: false,
    warnings: insight.warnings,
    missing_fields: [],
    status: 'insight_ready',
  });
}

export function buildChartExplainPayload({
  title,
  subtitle,
  months = [],
  series = [],
  leftUnit,
  rightUnit,
  primarySeriesName,
  moduleName,
  periodLabel,
  items,
  unit,
  chartKind = 'evolution',
}) {
  const chartId = slugify(`${moduleName}-${title}`);
  const primary = pickPrimarySeries(series, primarySeriesName);
  const resolvedUnit = primary.unit || leftUnit || rightUnit || unit || '';

  if (chartKind === 'pie') {
    const labels = arr(items).map((i) => i.name);
    const data = arr(items).map((i) => n(i.value));
    return {
      chartId,
      title,
      subtitle,
      series: [{ name: title, data, unit: resolvedUnit }],
      labels,
      unit: resolvedUnit,
      periodLabel,
    };
  }

  return {
    chartId,
    title,
    subtitle,
    series,
    labels: months,
    unit: resolvedUnit,
    primarySeriesName: primarySeriesName || primary.name,
    periodLabel,
  };
}
