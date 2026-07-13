/**
 * Démo Investisseur — orchestrateur lecture seule (4 scénarios).
 * Données simulées BP Horizon Farm · aucune écriture ERP sans validation.
 */

import { parseContextualVoicePhrase } from '../aiGateway/contextualVoiceParser.js';
import { parseInvoiceOcrText, INVOICE_OCR_DEMO_SAMPLES } from '../ocrIntelligent/invoiceOcrParser.js';
import { analyzeMarginImpact } from '../ocrIntelligent/marginImpactAnalyzer.js';
import { buildWeeklyFarmBrief } from '../heyHorizonVoice/farmBriefService.js';
import { buildForecastReport } from '../horizonForecast/forecastReportBuilder.js';
import { buildDailyAdvisorRecommendations } from '../horizonAdvisor/advisorService.js';
import { horizonFarmSimulationSeed } from '../../utils/horizonFarmSimulationSeed.js';
import { fmtCurrency } from '../../utils/format.js';

export const INVESTOR_DEMO_SOURCE = 'investor_demo';
export const INVESTOR_DEMO_MODE_LABEL = 'Mode démo — aucune écriture réelle';

export const INVESTOR_DEMO_SCENARIOS = [
  {
    id: 'whatsapp_horizon',
    order: 1,
    title: 'WhatsApp Horizon',
    subtitle: 'Message terrain → brouillons vente, paiement, stock & finance',
    icon: 'whatsapp',
    inputLabel: 'Message simulé',
    inputText: "J'ai vendu 20 tablettes d'œufs à 70 000 FCFA, payé par Orange Money.",
    narrative: 'Horizon comprend la phrase WhatsApp et prépare toute la chaîne — sans enregistrer tant que Penda n\'a pas validé.',
  },
  {
    id: 'ocr_intelligent',
    order: 2,
    title: 'OCR Intelligent',
    subtitle: 'Facture aliment · hausse de prix · diagnostic marge',
    icon: 'scan',
    inputLabel: 'Facture simulée',
    inputText: INVOICE_OCR_DEMO_SAMPLES.find((s) => s.id === 'demo-aliment')?.text || '',
    narrative: 'Une photo ou un texte de facture suffit : Horizon compare les prix et recommande un ajustement de vente.',
  },
  {
    id: 'hey_horizon_brief',
    order: 3,
    title: 'Hey Horizon Brief',
    subtitle: 'Brief hebdomadaire ferme · risques · priorités',
    icon: 'mic',
    inputLabel: 'Question',
    inputText: 'Fais-moi le brief de la semaine.',
    narrative: 'En une question, la fondatrice obtient la synthèse de la ferme — production, trésorerie, alertes et actions.',
  },
  {
    id: 'horizon_forecast',
    order: 4,
    title: 'Forecast Engine',
    subtitle: 'Simulation lancement poussins · ROI · trésorerie',
    icon: 'forecast',
    inputLabel: 'Question',
    inputText: 'Puis-je lancer 1 000 poussins le mois prochain ?',
    narrative: 'Avant d\'investir, Horizon simule coûts, marge, besoin de trésorerie et risques — décision éclairée.',
  },
  {
    id: 'horizon_advisor',
    order: 5,
    title: 'Horizon Advisor',
    subtitle: 'Recommandations priorisées · actions ERP · impact financier',
    icon: 'advisor',
    inputLabel: 'Contexte',
    inputText: 'Quelles actions prioritaires pour sécuriser trésorerie et production cette semaine ?',
    narrative: 'Horizon Advisor agrège santé ERP, stocks, créances et alertes pour proposer des actions concrètes — sans écriture automatique.',
  },
];

const arr = (value) => (Array.isArray(value) ? value : []);
const money = (value) => fmtCurrency(Number(value || 0));

/** DataMap isolé pour la démo — ne fusionne pas les données live. */
export function buildInvestorDemoDataMap() {
  const seed = horizonFarmSimulationSeed;
  return {
    animaux: arr(seed.animaux),
    avicole: arr(seed.avicole),
    lots: arr(seed.lots || seed.avicole),
    cultures: arr(seed.cultures),
    stock: arr(seed.stock),
    stocks: arr(seed.stocks || seed.stock),
    clients: arr(seed.clients),
    fournisseurs: arr(seed.fournisseurs),
    sales_orders: arr(seed.sales_orders),
    salesOrders: arr(seed.sales_orders),
    payments: arr(seed.payments),
    finances: arr(seed.finances),
    transactions: arr(seed.finances),
    taches: arr(seed.taches),
    tasks: arr(seed.taches),
    alertes: arr(seed.alertes_center),
    alertes_center: arr(seed.alertes_center),
    sante: arr(seed.sante),
    documents: arr(seed.documents),
    investissements: arr(seed.investissements),
    alimentation_logs: arr(seed.alimentation_logs),
    production_oeufs_logs: arr(seed.production_oeufs_logs),
    business_events: arr(seed.business_events),
    business_plans: arr(seed.business_plans),
    demoMode: true,
    demoSource: INVESTOR_DEMO_SOURCE,
    farm_name: 'Horizon Farm',
    periodLabel: 'Mode démo — données simulées BP',
    periodFiltered: false,
  };
}

function summarizeDraft(draft = {}) {
  const fields = draft.draft?.fields || draft.draft?.legacy_hey?.draft_fields || draft.draft_fields || {};
  return {
    id: draft.id,
    intent: draft.intent,
    title: draft.draft?.title || draft.ui?.title || draft.intent,
    subtitle: draft.draft?.subtitle || draft.ui?.subtitle || '',
    status: draft.status,
    role: draft.meta?.role || (draft.status === 'chain_info' ? 'chain' : 'primary'),
    fields,
  };
}

function buildWhatsAppImpacts(message, parsed, primaryFields = {}) {
  const qty = Number(primaryFields.quantity || primaryFields.quantite || 20);
  const total = Number(primaryFields.montant_total || primaryFields.payment_amount || primaryFields.montant_paye || 70000);

  return [
    {
      id: 'sale',
      label: 'Brouillon vente',
      detail: `${qty} tablette(s) d'œufs · ${money(total)} · lot pondeuses HF-PO-001`,
      tone: 'primary',
    },
    {
      id: 'payment',
      label: 'Brouillon paiement',
      detail: `${money(total)} · Orange Money · statut payé`,
      tone: 'good',
    },
    {
      id: 'stock',
      label: 'Impact stock',
      detail: `Sortie ${qty} tablette(s) · stock emballage/tablettes mis à jour après validation`,
      tone: 'neutral',
    },
    {
      id: 'finance',
      label: 'Impact finance',
      detail: `Encaissement ${money(total)} · écriture trésorerie liée à la vente`,
      tone: 'good',
    },
  ];
}

export async function runWhatsAppHorizonDemo(dataMap = buildInvestorDemoDataMap()) {
  const message = INVESTOR_DEMO_SCENARIOS[0].inputText;
  const parsed = parseContextualVoicePhrase(message, dataMap);
  const primary = parsed.drafts?.[0];
  const primaryFields = primary?.draft?.fields || primary?.draft?.legacy_hey?.draft_fields || {};

  const drafts = arr(parsed.drafts).map(summarizeDraft);
  const chainSteps = drafts.filter((d) => d.role === 'chain' || d.status === 'chain_info');
  const impacts = buildWhatsAppImpacts(message, parsed, primaryFields);

  return {
    id: 'whatsapp_horizon',
    readOnly: true,
    demoMode: true,
    title: 'WhatsApp Horizon',
    message,
    channel: 'WhatsApp simulé',
    sender: 'Penda · terrain',
    parsed: {
      scenario: parsed.scenario || 'sale',
      clarify: parsed.clarify || '',
      draftCount: drafts.length,
    },
    drafts,
    chainSteps,
    impacts,
    headline: `Brouillon vente ${money(70000)} prêt à valider`,
    summary: `${drafts.length} brouillon(s) généré(s) : vente, encaissement Orange Money, sortie stock tablettes et écriture finance — sans écriture tant que non validé.`,
    validationNote: 'Aucune donnée ERP modifiée. Penda valide ou corrige avant enregistrement.',
  };
}

export async function runOcrIntelligentDemo(dataMap = buildInvestorDemoDataMap()) {
  const sample = INVOICE_OCR_DEMO_SAMPLES.find((s) => s.id === 'demo-aliment');
  const invoice = parseInvoiceOcrText(sample?.text || '', { demo: true });
  const diagnostic = analyzeMarginImpact(invoice, dataMap);
  const recommendation = diagnostic.recommendation || {};
  const margin = diagnostic.margin_impact || {};

  return {
    id: 'ocr_intelligent',
    readOnly: true,
    demoMode: true,
    title: 'OCR Intelligent',
    invoiceText: sample?.text || '',
    invoice: {
      fournisseur: invoice.fournisseur,
      produit: invoice.produit,
      quantite: invoice.quantite,
      prix_unitaire: invoice.prix_unitaire,
      montant_total: invoice.montant_total,
    },
    priceDelta: diagnostic.price_comparison,
    margin,
    treasury: diagnostic.treasury_impact,
    headline: recommendation.headline || 'Diagnostic facture aliment',
    summary: recommendation.summary || '',
    bullets: recommendation.bullets || [],
    recommendation: recommendation.action || 'Ajuster prix de vente ou renégocier fournisseur',
    severity: recommendation.severity || 'warning',
    validationNote: 'Brouillon achat/stock/dépense — validation utilisateur requise avant écriture.',
  };
}

export async function runHeyHorizonBriefDemo(dataMap = buildInvestorDemoDataMap()) {
  const phrase = INVESTOR_DEMO_SCENARIOS[2].inputText;
  const brief = await buildWeeklyFarmBrief(dataMap, {});

  const sections = arr(brief.sections).slice(0, 8);
  const priorities = sections
    .filter((s) => s.tone === 'warn' || s.tone === 'missing')
    .map((s) => s.label)
    .slice(0, 4);

  return {
    id: 'hey_horizon_brief',
    readOnly: true,
    demoMode: true,
    title: 'Hey Horizon Brief',
    phrase,
    headline: brief.headline || brief.title || 'Brief de la semaine',
    spokenText: brief.spokenText || brief.summary || '',
    sections,
    priorities: priorities.length ? priorities : ['Ponte', 'Trésorerie', 'Stocks', 'Alertes'],
    risks: sections.filter((s) => /risque|alerte|créance|stock|mortalité/i.test(`${s.label} ${s.detail}`)).slice(0, 3),
    validationNote: 'Lecture seule — aucun enregistrement ERP.',
  };
}

export function runHorizonForecastDemo(dataMap = buildInvestorDemoDataMap()) {
  const phrase = INVESTOR_DEMO_SCENARIOS[3].inputText;
  const report = buildForecastReport(phrase, dataMap);
  const m = report.metrics || {};

  return {
    id: 'horizon_forecast',
    readOnly: true,
    demoMode: true,
    title: 'Horizon Forecast',
    phrase,
    recommendation: report.recommendationLabel,
    recommendationKey: report.recommendation,
    headline: report.summary,
    metrics: {
      roiPercent: m.roiPercent,
      initialCost: m.initialCost,
      treasuryNeed: m.treasuryNeed,
      estimatedMargin: m.estimatedMargin,
      estimatedSales: m.estimatedSales,
      paybackLabel: m.paybackLabel,
      cycleDays: m.cycleDays,
    },
    risks: arr(report.risks).slice(0, 4).map((r) => ({
      label: r.label || r.title,
      detail: r.detail || r.message,
      level: r.level,
    })),
    preLaunchActions: arr(report.preLaunchActions).slice(0, 4),
    validationNote: 'Simulation décisionnelle — pas de lancement automatique.',
  };
}

export function runHorizonAdvisorDemo(dataMap = buildInvestorDemoDataMap()) {
  const phrase = INVESTOR_DEMO_SCENARIOS[4].inputText;
  const report = buildDailyAdvisorRecommendations(dataMap, { limit: 6 });
  const top = report.recommendations?.[0];
  const financialImpact = report.recommendations
    ?.filter((r) => /trésorerie|créance|stock|marge|coût|vente/i.test(`${r.title} ${r.summary}`))
    .slice(0, 3)
    .map((r) => ({ label: r.title, detail: r.recommended_action, urgency: r.urgency }));

  return {
    id: 'horizon_advisor',
    readOnly: true,
    demoMode: true,
    title: 'Horizon Advisor',
    phrase,
    headline: top?.title || 'Recommandations priorisées du jour',
    summary: top?.summary || 'Analyse croisée ERP : santé, stocks, créances, production et documents.',
    recommendations: (report.recommendations || []).slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      action: r.recommended_action,
      urgency: r.urgency,
      module: r.module,
      confidence: r.confidence_score,
    })),
    financialImpact: financialImpact?.length ? financialImpact : [{
      label: 'Pilotage décisionnel',
      detail: 'Actions priorisées pour sécuriser trésorerie et production',
      urgency: 'elevee',
    }],
    businessValue: 'Décisions quotidiennes accélérées — moins de pertes, meilleure trésorerie, dossier investisseur crédible.',
    healthScore: report.health_score,
    counts: report.counts,
    validationNote: 'Brouillons tâches/alertes — validation Penda requise.',
  };
}

/** Exécute un scénario par id. */
export async function runInvestorDemoScenario(scenarioId, dataMap = buildInvestorDemoDataMap()) {
  switch (scenarioId) {
    case 'whatsapp_horizon':
      return runWhatsAppHorizonDemo(dataMap);
    case 'ocr_intelligent':
      return runOcrIntelligentDemo(dataMap);
    case 'hey_horizon_brief':
      return runHeyHorizonBriefDemo(dataMap);
    case 'horizon_forecast':
      return runHorizonForecastDemo(dataMap);
    case 'horizon_advisor':
      return runHorizonAdvisorDemo(dataMap);
    default:
      throw new Error(`Scénario démo inconnu : ${scenarioId}`);
  }
}

/** Parcours visuel 4 colonnes pour la démo investisseur. */
export function buildInvestorDemoFlow(result = {}) {
  if (result.id === 'whatsapp_horizon') {
    return [
      { key: 'input', label: 'Donnée de départ', body: result.message, tone: 'neutral' },
      { key: 'ai', label: 'Traitement', body: result.summary || 'Analyse NLP + génération brouillons', tone: 'primary' },
      { key: 'erp', label: 'Impact ERP', body: (result.impacts || []).map((i) => `${i.label} : ${i.detail}`).join('\n'), tone: 'warn' },
      { key: 'investor', label: 'Résultat investisseur', body: result.headline || 'Vente terrain capturée sans ressaisie — traçabilité et rapidité.', tone: 'good' },
    ];
  }
  if (result.id === 'ocr_intelligent') {
    return [
      { key: 'input', label: 'Donnée de départ', body: `${result.invoice?.fournisseur} · ${money(result.invoice?.montant_total)}`, tone: 'neutral' },
      { key: 'ai', label: 'Traitement', body: result.headline || 'OCR + comparaison prix + diagnostic marge', tone: 'primary' },
      { key: 'erp', label: 'Impact ERP', body: (result.bullets || []).slice(0, 3).join('\n') || 'Brouillon achat/stock/dépense proposé', tone: 'warn' },
      { key: 'investor', label: 'Résultat investisseur', body: result.recommendation || 'Maîtrise des coûts et marges en temps réel.', tone: 'good' },
    ];
  }
  if (result.id === 'hey_horizon_brief') {
    return [
      { key: 'input', label: 'Donnée de départ', body: result.phrase, tone: 'neutral' },
      { key: 'ai', label: 'Traitement', body: result.headline || 'Brief vocal hebdomadaire', tone: 'primary' },
      { key: 'erp', label: 'Impact ERP', body: (result.sections || []).slice(0, 4).map((s) => `${s.label} : ${s.value || s.detail}`).join('\n'), tone: 'warn' },
      { key: 'investor', label: 'Résultat investisseur', body: 'Pilotage quotidien sans tableur — décisions fondatrice accélérées.', tone: 'good' },
    ];
  }
  if (result.id === 'horizon_forecast') {
    const m = result.metrics || {};
    return [
      { key: 'input', label: 'Donnée de départ', body: result.phrase, tone: 'neutral' },
      { key: 'ai', label: 'Traitement', body: result.headline || 'Simulation Forecast Engine', tone: 'primary' },
      { key: 'erp', label: 'Impact ERP', body: `ROI ${m.roiPercent != null ? `${Math.round(m.roiPercent)}%` : '—'} · Trésorerie ${money(m.treasuryNeed)} · Marge ${money(m.estimatedMargin)}`, tone: 'warn' },
      { key: 'investor', label: 'Résultat investisseur', body: `Recommandation : ${result.recommendation || 'Décision chiffrée avant investissement.'}`, tone: 'good' },
    ];
  }
  if (result.id === 'horizon_advisor') {
    return [
      { key: 'input', label: 'Entrée', body: result.phrase, tone: 'neutral' },
      { key: 'ai', label: 'Analyse', body: (result.recommendations || []).slice(0, 3).map((r) => `${r.title} (${r.urgency})`).join('\n') || result.summary, tone: 'primary' },
      { key: 'erp', label: 'Résultat', body: (result.recommendations || []).slice(0, 3).map((r) => r.action).join('\n'), tone: 'warn' },
      { key: 'investor', label: 'Valeur business', body: `${result.businessValue}\nImpact financier : ${(result.financialImpact || []).map((f) => f.label).join(' · ')}`, tone: 'good' },
    ];
  }
  return [];
}

/** Lance les scénarios en séquence (preview). */
export async function runFullInvestorDemo(dataMap = buildInvestorDemoDataMap()) {
  const steps = [];
  for (const scenario of INVESTOR_DEMO_SCENARIOS) {
    steps.push(await runInvestorDemoScenario(scenario.id, dataMap));
  }
  return {
    source: INVESTOR_DEMO_SOURCE,
    readOnly: true,
    demoMode: true,
    modeLabel: INVESTOR_DEMO_MODE_LABEL,
    tagline: 'Horizon Farm : copilote agricole intelligent — pas seulement un ERP.',
    steps,
    generated_at: new Date().toISOString(),
  };
}

export default runFullInvestorDemo;
