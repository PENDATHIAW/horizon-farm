/**
 * Conseiller d'exploitation V7 - couche d'analyse conversationnelle.
 * Compose uniquement les moteurs existants (Finance, Commercial, Élevage,
 * Cultures, Stock, Objectifs) sans en créer de nouveaux.
 */

import { fmtCurrency } from '../utils/format.js';

import { summarizeSalesMargins } from '../utils/salesMarginEngine.js';
import { enrichCommercialOrders } from '../modules/commercial/commercialMetrics.js';
import { buildDirectorSnapshot, propsFromDataMap } from './assistantDirectorSnapshot.js';
import { dedupeProse, isGenericEntityLabel, resolveLotLabel, resolveProductName } from './assistantEntityLabels.js';

const n = (v) => Number(v || 0);
const arr = (v) => (Array.isArray(v) ? v : []);

const URGENCY_WEIGHT = { critique: 100, haute: 85, moyenne: 60, normal: 40 };

function finalizeAnswer(answer = {}) {
  return {
    ...answer,
    situation: dedupeProse(answer.situation || ''),
    cause: dedupeProse(answer.cause || ''),
    action: dedupeProse(answer.action || ''),
  };
}

/** Signaux de risque - finance, commercial, élevage, stock, objectifs. */
export function collectRiskSignals(snap = {}) {
  const {
    finance, commercial, monthPct, elevageAlerts, stockSummary, growth,
  } = snap;
  const treasury = n(finance?.cashNet);
  const receivables = n(commercial?.receivable);
  const payables = n(finance?.payablesTotal ?? finance?.dettesFournisseurs);
  const risks = [];

  if (treasury < 0) {
    risks.push({
      level: 100,
      domain: 'finance',
      text: 'La trésorerie est négative - chaque dépense doit être arbitrée avec soin.',
    });
  }
  if (receivables > 0 && (treasury <= 0 || receivables > treasury * 2)) {
    risks.push({
      level: 95,
      domain: 'commercial',
      text: `Les créances en attente (${fmtCurrency(receivables)}) pèsent fortement sur votre liquidité.`,
    });
  }
  if (payables > treasury && payables > 0) {
    risks.push({
      level: 88,
      domain: 'finance',
      text: 'Les dettes fournisseurs dépassent la trésorerie disponible.',
    });
  }
  if (monthPct != null && monthPct < 50) {
    risks.push({
      level: 90 - monthPct,
      domain: 'objectifs',
      text: `L'objectif mensuel n'est atteint qu'à ${monthPct} % - le rythme commercial est en retard.`,
    });
  }
  if (arr(elevageAlerts).length > 0) {
    const alertText = elevageAlerts[0]?.text || 'Un lot mérite une surveillance particulière.';
    risks.push({ level: 82, domain: 'elevage', text: alertText });
  }
  if (n(stockSummary?.lowStockCount) > 0) {
    risks.push({
      level: 75,
      domain: 'stock',
      text: `${stockSummary.lowStockCount} produit${stockSummary.lowStockCount > 1 ? 's' : ''} approche${stockSummary.lowStockCount > 1 ? 'nt' : ''} d'une rupture.`,
    });
  }
  const zoAlert = n(growth?.alertCounts?.zootechnie);
  if (zoAlert > 0) {
    risks.push({
      level: 78,
      domain: 'elevage',
      text: `${zoAlert} alerte${zoAlert > 1 ? 's' : ''} zootechnique${zoAlert > 1 ? 's' : ''} demandent votre attention.`,
    });
  }
  const ecoAlert = n(growth?.alertCounts?.economie);
  if (ecoAlert > 0) {
    risks.push({
      level: 72,
      domain: 'objectifs',
      text: `${ecoAlert} indicateur${ecoAlert > 1 ? 's' : ''} économique${ecoAlert > 1 ? 's' : ''} s'écarte${ecoAlert > 1 ? 'nt' : ''} de la cible.`,
    });
  }

  return [...risks].sort((a, b) => b.level - a.level);
}

/** Tendances - dynamique d'exploitation sur période récente. */
export function collectTrendSignals(snap = {}) {
  const { dynamics, comparisons } = snap;
  const signals = [];

  if (dynamics?.ready) {
    signals.push({
      label: dynamics.label,
      status: dynamics.status,
      periodLabel: dynamics.periodLabel,
      reasons: arr(dynamics.reasons),
    });
  }

  if (!dynamics?.ready) {
    const month = arr(comparisons).find((row) => row.key === 'month' && row.ready);
    const sales = month?.metrics?.find((m) => m.id === 'sales');
    if (sales?.trend === 'up' && sales.current > 0) {
      signals.push({ metric: 'ventes', trend: 'up', label: 'Vos ventes progressent par rapport au mois dernier.' });
    } else if (sales?.trend === 'down' && sales.previous > 0) {
      signals.push({ metric: 'ventes', trend: 'down', label: 'Vos ventes reculent par rapport au mois dernier.' });
    }
  }

  return signals;
}

/** Comparaisons période - mois vs mois précédent, semaine vs semaine. */
export function collectComparisonSignals(snap = {}) {
  const comparisons = arr(snap.comparisons).filter((row) => row.ready);
  const results = [];

  for (const block of comparisons) {
    const metrics = block.metrics
      .filter((m) => !m.snapshot && m.trend !== 'unavailable' && (m.current > 0 || m.previous > 0))
      .map((m) => ({
        id: m.id,
        label: m.label,
        current: m.currentLabel,
        previous: m.previousLabel,
        trend: m.trend,
        delta: m.delta,
      }));
    if (metrics.length) {
      results.push({ key: block.key, label: block.label, metrics });
    }
  }
  return results;
}

/** Opportunités - stock, cultures, lots, animaux prêts à vendre. */
export function collectOpportunitySignals(snap = {}) {
  return arr(snap.opportunities)
    .map((opp) => ({
      title: resolveProductName(opp, opp.title || opp.libelle) || opp.title || 'une production disponible',
      value: n(opp.estimated_value),
      urgency: opp.urgency || 'normal',
      reason: opp.reason || '',
      recommendation: opp.recommendation || '',
      level: URGENCY_WEIGHT[opp.urgency] || 40,
    }))
    .sort((a, b) => b.level - a.level);
}

/** Priorités classées par impact - finance, commercial, élevage, stock, objectifs. */
export function collectPriorityActions(snap = {}) {
  const {
    commercial, receivableRows, monthPct, elevageAlerts, relanceRows, stockSummary,
  } = snap;
  const receivableTotal = n(commercial?.receivable);
  const receivableCount = receivableRows?.length || n(commercial?.unpaidOrders);
  const candidates = [];

  if (receivableTotal > 0) {
    const top = receivableRows?.[0];
    const share = top?.amount > 0 ? Math.round((top.amount / receivableTotal) * 100) : 0;
    const topName = top?.clientName && !isGenericEntityLabel(top.clientName) ? top.clientName : null;
    candidates.push({
      impact: 100 + Math.min(receivableTotal / 100000, 20),
      text: topName
        ? `Commencez par ${topName}${share > 0 ? ` - cette créance représente ${share} % du total en attente (${fmtCurrency(top.amount)})` : ''}`
        : `Relancer les ${receivableCount} créance${receivableCount > 1 ? 's' : ''} en attente (${fmtCurrency(receivableTotal)})`,
    });
  }
  if (arr(elevageAlerts).length > 0) {
    const lotLabel = elevageAlerts[0]?.text || 'le lot sous surveillance';
    candidates.push({
      impact: 85,
      text: `Contrôler ${String(lotLabel).toLowerCase().includes('lot') ? lotLabel : 'le lot sous surveillance'}`,
    });
  }
  if (monthPct != null && monthPct < 80) {
    candidates.push({
      impact: 95 - monthPct,
      text: `Accélérer les ventes car l'objectif mensuel n'est atteint qu'à ${monthPct} %`,
    });
  }
  const topOpp = collectOpportunitySignals(snap)[0];
  if (topOpp && candidates.length < 3) {
    candidates.push({
      impact: topOpp.level,
      text: `Saisir l'opportunité : ${topOpp.title}`,
    });
  }
  if (arr(relanceRows).length > 0 && candidates.length < 3) {
    const urgent = relanceRows.find((row) => row.priority === 'Urgent') || relanceRows[0];
    if (urgent?.clientName) {
      candidates.push({ impact: 70, text: `Relancer ${urgent.clientName}` });
    }
  }
  if (n(stockSummary?.lowStockCount) > 0 && candidates.length < 3) {
    candidates.push({
      impact: 60,
      text: `Réapprovisionner ${stockSummary.lowStockCount} produit${stockSummary.lowStockCount > 1 ? 's' : ''} sous seuil`,
    });
  }
  if (!candidates.length) {
    candidates.push({
      impact: 50,
      text: 'Publier vos disponibilités et contacter un client régulier',
    });
  }

  return [...candidates].sort((a, b) => b.impact - a.impact).slice(0, 3);
}

/** Bundle conseil complet - une seule lecture snapshot. */
export function buildFarmAdvisoryBundle(dataMap = {}) {
  const snap = buildDirectorSnapshot(dataMap);
  return {
    snap,
    risks: collectRiskSignals(snap),
    trends: collectTrendSignals(snap),
    comparisons: collectComparisonSignals(snap),
    opportunities: collectOpportunitySignals(snap),
    priorities: collectPriorityActions(snap),
  };
}

function trendSentence(signals = []) {
  const dynamic = signals.find((s) => s.label);
  if (dynamic?.label) {
    const reasons = [...new Set(arr(dynamic.reasons).map((r) => String(r).trim()).filter(Boolean))].slice(0, 2);
    if (reasons.length) {
      const period = dynamic.periodLabel?.toLowerCase() || 'la période récente';
      const status = dynamic.label.toLowerCase();
      const cleanedReasons = reasons
        .map((r) => String(r).trim())
        .filter((r) => r && !/^(en hausse|en baisse|stable|en progression|en recul)$/i.test(r));
      const reasonText = (cleanedReasons.length ? cleanedReasons : reasons)
        .join(', ')
        .toLowerCase();
      if (/en hausse|en baisse|en progression|en recul|stable/.test(reasonText)) {
        return dedupeProse(`Sur ${period}, ${reasonText}.`);
      }
      return dedupeProse(`Sur ${period}, l'exploitation est ${status} : ${reasonText}.`);
    }
    return dedupeProse(`La dynamique récente est ${dynamic.label.toLowerCase()}.`);
  }
  const metric = signals.find((s) => s.label && !s.reasons);
  if (metric?.label) return dedupeProse(metric.label);
  return '';
}

function comparisonSentences(comparisons = []) {
  const month = comparisons.find((c) => c.key === 'month') || comparisons[0];
  if (!month) return [];

  const lines = [];
  const sales = month.metrics.find((m) => m.id === 'sales');
  const collections = month.metrics.find((m) => m.id === 'collections');

  if (sales) {
    if (sales.trend === 'up') {
      lines.push(`Vos ventes passent de ${sales.previous} à ${sales.current} sur la période.`);
    } else if (sales.trend === 'down') {
      lines.push(`Vos ventes reculent (${sales.previous} contre ${sales.current} actuellement).`);
    } else if (sales.current) {
      lines.push(`Vos ventes se maintiennent autour de ${sales.current}.`);
    }
  }
  if (collections && collections.trend === 'up') {
    lines.push(`Les encaissements suivent une bonne dynamique (${collections.current}).`);
  } else if (collections && collections.trend === 'down') {
    lines.push(`Les encaissements ralentissent - ${collections.current} contre ${collections.previous} sur la période précédente.`);
  }
  return lines;
}

function riskSentences(risks = []) {
  if (!risks.length) {
    return {
      situation: 'Je ne vois pas de risque majeur immédiat sur votre exploitation.',
      cause: 'La trésorerie, les stocks et l\'activité commerciale restent dans une zone acceptable.',
      action: 'Continuez le pilotage habituel et gardez un œil sur les encaissements.',
    };
  }
  const main = risks[0];
  const others = risks.slice(1, 3);
  return {
    situation: `Le point de vigilance principal : ${main.text.charAt(0).toLowerCase() + main.text.slice(1)}`,
    cause: others.length
      ? `J'ai aussi noté : ${others.map((r) => r.text.charAt(0).toLowerCase() + r.text.slice(1)).join(' ')}`
      : '',
    action: main.domain === 'commercial'
      ? 'Je commencerais par relancer les clients les plus en retard cette semaine.'
      : main.domain === 'stock'
        ? 'Planifiez un réapprovisionnement sur les produits critiques.'
        : main.domain === 'elevage'
          ? 'Passez voir le lot concerné et mettez à jour le suivi sanitaire.'
          : 'Arbitrez vos sorties de trésorerie et sécurisez les encaissements prioritaires.',
  };
}

function opportunitySentences(opportunities = []) {
  if (!opportunities.length) {
    return {
      situation: 'Je ne vois pas d\'opportunité de vente immédiate dans vos stocks et productions.',
      cause: '',
      action: 'Pensez à mettre à jour vos disponibilités ou à contacter un client régulier.',
    };
  }
  const top = opportunities[0];
  const others = opportunities.slice(1, 2);
  const valueText = top.value > 0 ? ` (environ ${fmtCurrency(top.value)})` : '';
  return {
    situation: `La meilleure opportunité du moment : ${top.title}${valueText}.`,
    cause: top.reason || (others[0] ? `Vous pourriez aussi envisager ${others[0].title.toLowerCase()}.` : ''),
    action: top.recommendation || 'Contactez vos clients habituels pour écouler ce produit rapidement.',
  };
}

/** Enrichit une réponse existante avec l'analyse conseil. */
export function enrichWithAdvisory(baseAnswer = {}, bundle = {}, facets = {}) {
  const {
    trends = true,
    risks = true,
    opportunities = false,
  } = facets;
  const paragraphs = [baseAnswer.situation].filter(Boolean);
  let cause = baseAnswer.cause || '';
  let action = baseAnswer.action || '';

  if (trends) {
    const trend = trendSentence(bundle.trends);
    if (trend) paragraphs.splice(1, 0, trend);
  }
  if (risks && bundle.risks?.length) {
    const mainRisk = bundle.risks[0];
    if (!cause) {
      cause = `Ce qui me préoccupe : ${mainRisk.text.charAt(0).toLowerCase() + mainRisk.text.slice(1)}`;
    }
  }
  if (opportunities && bundle.opportunities?.length && !action) {
    const top = bundle.opportunities[0];
    action = top.recommendation || `Je regarderais l'opportunité « ${top.title} » en priorité.`;
  }

  return {
    ...baseAnswer,
    situation: paragraphs.join('\n\n'),
    cause,
    action,
  };
}

export function buildTendancesAnswer(dataMap = {}) {
  const bundle = buildFarmAdvisoryBundle(dataMap);
  const trend = trendSentence(bundle.trends);
  const { snap } = bundle;
  const ca = n(snap.commercial?.ca);

  const paragraphs = [];
  if (trend) {
    paragraphs.push(trend);
  } else if (bundle.trends.length) {
    paragraphs.push('L\'activité reste régulière sans variation marquée sur la période récente.');
  } else {
    paragraphs.push('Il me faut encore quelques jours d\'activité pour lire une tendance fiable.');
  }

  if (ca > 0) {
    paragraphs.push(`Le chiffre d'affaires cumulé est de ${fmtCurrency(ca)}.`);
  }
  if (snap.monthPct != null) {
    paragraphs.push(`L'objectif mensuel est atteint à ${snap.monthPct} %.`);
  }

  const mainRisk = bundle.risks[0];
  return finalizeAnswer({
    title: 'Tendances',
    intent: 'farm_trends',
    situation: paragraphs.join('\n\n'),
    cause: mainRisk ? `Point de vigilance : ${mainRisk.text.charAt(0).toLowerCase() + mainRisk.text.slice(1)}` : '',
    action: bundle.trends.find((t) => t.trend === 'down')
      ? 'Relancez vos clients actifs et accélérez les livraisons cette semaine.'
      : 'Maintenez le rythme actuel et surveillez les encaissements.',
    sources: [],
    confidence: 93,
    meta: {},
  });
}

export function buildComparaisonsAnswer(dataMap = {}) {
  const bundle = buildFarmAdvisoryBundle(dataMap);
  const lines = comparisonSentences(bundle.comparisons);

  if (!lines.length) {
    return finalizeAnswer({
      title: 'Comparaisons',
      intent: 'farm_comparisons',
      situation: 'Je n\'ai pas encore assez de recul pour comparer deux périodes de façon fiable.',
      cause: '',
      action: 'Continuez à enregistrer ventes et encaissements - la comparaison sera disponible sous peu.',
      sources: [],
      confidence: 70,
      meta: {},
    });
  }

  return finalizeAnswer({
    title: 'Comparaisons',
    intent: 'farm_comparisons',
    situation: lines.join('\n\n'),
    cause: bundle.risks[0]
      ? `En parallèle, ${bundle.risks[0].text.charAt(0).toLowerCase() + bundle.risks[0].text.slice(1)}`
      : '',
    action: lines.some((l) => /recul|ralentissent/i.test(l))
      ? 'Accélérez les ventes et les relances pour retrouver le rythme du mois précédent.'
      : 'Bonne dynamique - consolidez en sécurisant les encaissements.',
    sources: [],
    confidence: 92,
    meta: {},
  });
}

export function buildRisquesAnswer(dataMap = {}) {
  const bundle = buildFarmAdvisoryBundle(dataMap);
  const { situation, cause, action } = riskSentences(bundle.risks);
  return finalizeAnswer({
    title: 'Risques',
    intent: 'farm_risks',
    situation,
    cause,
    action,
    sources: [],
    confidence: bundle.risks.length ? 94 : 88,
    meta: {},
  });
}

export function buildOpportunitesAnswer(dataMap = {}) {
  const bundle = buildFarmAdvisoryBundle(dataMap);
  const { situation, cause, action } = opportunitySentences(bundle.opportunities);
  return finalizeAnswer({
    title: 'Opportunités',
    intent: 'farm_opportunities',
    situation,
    cause,
    action,
    sources: [],
    confidence: bundle.opportunities.length ? 93 : 75,
    meta: {},
  });
}

export function collectMoneyLeakSignals(dataMap = {}) {
  const snap = buildDirectorSnapshot(dataMap);
  const props = propsFromDataMap(dataMap);
  const leaks = [];
  const receivable = n(snap.commercial?.receivable);

  if (receivable > 0) {
    leaks.push({
      level: 100,
      label: 'Créances en attente',
      text: `${fmtCurrency(receivable)} restent en attente de paiement`,
      impact: 'Tant que ces montants ne sont pas recouvrés, ils limitent votre trésorerie et votre capacité d\'investissement.',
    });
  }

  const mortalityLots = arr(props.lots)
    .map((lot) => ({
      label: resolveLotLabel(lot, null),
      losses: n(lot.mortalite ?? lot.mortalité ?? lot.morts ?? lot.deaths ?? lot.pertes),
    }))
    .filter((row) => row.losses > 0 && row.label)
    .sort((a, b) => b.losses - a.losses);
  if (mortalityLots[0]) {
    leaks.push({
      level: 88,
      label: 'Mortalités',
      text: `${mortalityLots[0].losses} perte(s) signalée(s) sur ${mortalityLots[0].label}`,
      impact: 'Chaque perte réduit directement votre production vendable et votre marge.',
    });
  }

  const surcoutRows = [
    ...arr(snap.growth?.zootechnie?.croissance),
    ...arr(snap.growth?.zootechnie?.pondeuses),
  ].filter((row) => row.tone === 'bad' && n(row.surcout) > 0);
  if (surcoutRows[0]) {
    const label = resolveLotLabel(surcoutRows[0], surcoutRows[0].label || surcoutRows[0].lotLabel);
    leaks.push({
      level: 82,
      label: 'Intrants coûteux',
      text: `Surcoût estimé sur ${label || 'un lot'} : ${fmtCurrency(surcoutRows[0].surcout)}`,
      impact: 'La conduite d\'élevage consomme plus d\'aliment que prévu.',
    });
  }

  const enriched = enrichCommercialOrders(props.salesOrdersAll, {
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const margins = summarizeSalesMargins(enriched, {
    lots: props.lots,
    animaux: props.animaux,
    cultures: props.cultures,
    stocks: props.stocks,
    payments: props.paymentsAll,
    transactions: props.transactionsAll,
  });
  const weakProduct = arr(margins?.products || margins?.rows)
    .filter((row) => n(row.margin ?? row.marge_directe) < 0)[0];
  if (weakProduct) {
    const productName = resolveProductName(weakProduct, weakProduct.name || weakProduct.product_name);
    leaks.push({
      level: 76,
      label: 'Produit peu rentable',
      text: `${productName || 'Un produit'} génère une marge négative`,
      impact: 'Revoir le prix de vente ou le coût de production sur ce poste.',
    });
  }

  return { leaks: [...leaks].sort((a, b) => b.level - a.level), snap };
}

/** Fuites financières - impact métier, pas situation de trésorerie brute. */
export function buildMoneyLeaksAnswer(dataMap = {}) {
  const { leaks, snap } = collectMoneyLeakSignals(dataMap);

  if (!leaks.length) {
    return finalizeAnswer({
      title: 'Pertes financières',
      intent: 'money_leaks',
      situation: 'Je ne vois pas de fuite financière majeure dans vos données actuelles.',
      cause: 'Les créances, mortalités et marges restent dans une zone acceptable.',
      action: 'Continuez à suivre encaissements et coûts de production chaque semaine.',
      sources: [],
      confidence: 82,
      meta: {},
    });
  }

  const main = leaks[0];
  const top3 = leaks.slice(0, 3);
  const situation = main.label === 'Créances en attente'
    ? `Aujourd'hui, votre principale fuite financière vient des créances non encaissées.\n\n${main.text}.`
    : `Aujourd'hui, ce qui vous fait le plus perdre de l'argent, c'est ${main.label.toLowerCase()} : ${main.text}.`;

  const cause = top3.length > 1
    ? `Vos ${top3.length} principaux postes de perte sont :\n\n${top3.map((item, index) => `${index + 1}. ${item.label}`).join('\n')}`
    : main.impact;

  const topClient = snap.topReceivable;
  let action = main.impact;
  if (main.label === 'Créances en attente' && topClient?.clientName && !isGenericEntityLabel(topClient.clientName)) {
    action = `Commencez par relancer ${topClient.clientName} sur la commande ${topClient.orderId}.`;
  }

  return finalizeAnswer({
    title: 'Pertes financières',
    intent: 'money_leaks',
    situation,
    cause,
    action,
    sources: [],
    confidence: 95,
    meta: snap.topReceivable ? { topReceivable: snap.topReceivable } : {},
  });
}

export function buildPrioritesConseilAnswer(dataMap = {}) {
  const bundle = buildFarmAdvisoryBundle(dataMap);
  const lines = bundle.priorities.map((item, index) => `${index + 1}. ${item.text}`);
  const trend = trendSentence(bundle.trends);

  const intro = trend
    ? `${trend}\n\nAujourd'hui je vous conseille :`
    : 'Aujourd\'hui je vous conseille :';

  return finalizeAnswer({
    title: 'Priorités du jour',
    intent: 'priorites_du_jour',
    situation: `${intro}\n\n${lines.join('\n\n')}`,
    cause: bundle.risks[0]
      ? `Le risque principal à garder en tête : ${bundle.risks[0].text.charAt(0).toLowerCase() + bundle.risks[0].text.slice(1)}`
      : '',
    action: '',
    sources: [],
    confidence: 96,
    meta: bundle.snap.topReceivable ? {
      topReceivable: {
        clientName: bundle.snap.topReceivable.clientName,
        amount: bundle.snap.topReceivable.amount,
        orderId: bundle.snap.topReceivable.orderId,
        delayDays: bundle.snap.topReceivable.delayDays,
      },
    } : {},
  });
}

export function buildCommentVaLaFermeConseilAnswer(dataMap = {}) {
  const bundle = buildFarmAdvisoryBundle(dataMap);
  const { snap } = bundle;
  const {
    commercial, stockSummary, receivableRows, monthPct, elevageAlerts,
  } = snap;

  const ca = n(commercial?.ca);
  const receivableCount = receivableRows?.length || n(commercial?.unpaidOrders);
  const lowStock = n(stockSummary?.lowStockCount);
  const lotWatch = arr(elevageAlerts).length > 0;

  const paragraphs = ['Dans l\'ensemble, la ferme fonctionne correctement.'];

  const trend = trendSentence(bundle.trends);
  if (trend) paragraphs.push(trend);

  if (ca > 0) {
    paragraphs.push(`Le chiffre d'affaires atteint actuellement ${fmtCurrency(ca)}.`);
  }

  if (lowStock === 0) {
    paragraphs.push('Les stocks sont disponibles sans rupture.');
  } else {
    paragraphs.push(`${lowStock} produit${lowStock > 1 ? 's' : ''} approche${lowStock > 1 ? 'nt' : ''} d'un seuil bas - à surveiller.`);
  }

  if (receivableCount > 0 && lotWatch) {
    paragraphs.push(`J'ai identifié ${receivableCount} créance${receivableCount > 1 ? 's' : ''} à suivre et un lot qui mérite une surveillance particulière.`);
  } else if (receivableCount > 0) {
    paragraphs.push(`J'ai identifié ${receivableCount} créance${receivableCount > 1 ? 's' : ''} à suivre.`);
  } else if (lotWatch) {
    paragraphs.push('Un lot mérite une surveillance particulière cette semaine.');
  }

  if (monthPct != null) {
    paragraphs.push(`L'objectif mensuel est atteint à ${monthPct} %.`);
  }

  const topOpp = bundle.opportunities[0];
  let action = receivableCount > 0 ? 'Si vous voulez, je peux détailler le client le plus urgent.' : '';
  if (topOpp && !action) {
    action = topOpp.recommendation || `Je regarderais l'opportunité « ${topOpp.title} ».`;
  }

  return finalizeAnswer({
    title: 'Vue ferme',
    intent: 'comment_va_la_ferme',
    situation: paragraphs.join('\n\n'),
    cause: bundle.risks[0]
      ? `Ce qui me préoccupe : ${bundle.risks[0].text.charAt(0).toLowerCase() + bundle.risks[0].text.slice(1)}`
      : '',
    action,
    sources: [],
    confidence: 97,
    meta: snap.topReceivable ? {
      topReceivable: {
        clientName: snap.topReceivable.clientName,
        amount: snap.topReceivable.amount,
        orderId: snap.topReceivable.orderId,
        delayDays: snap.topReceivable.delayDays,
      },
    } : {},
  });
}

export default {
  buildFarmAdvisoryBundle,
  collectRiskSignals,
  collectTrendSignals,
  collectComparisonSignals,
  collectOpportunitySignals,
  collectPriorityActions,
  enrichWithAdvisory,
  buildTendancesAnswer,
  buildComparaisonsAnswer,
  buildRisquesAnswer,
  buildOpportunitesAnswer,
  buildPrioritesConseilAnswer,
  buildCommentVaLaFermeConseilAnswer,
  collectMoneyLeakSignals,
  buildMoneyLeaksAnswer,
};
