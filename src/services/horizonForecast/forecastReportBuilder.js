/**
 * Construit le rapport d'aide à la décision Horizon Forecast.
 */

import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { runForecastEngine } from './forecastEngine.js';
import { parseForecastScenario } from './forecastScenarioParser.js';
import { analyzeForecastRisks } from './forecastRiskAnalyzer.js';

export const FORECAST_RECOMMENDATIONS = {
  FAVORABLE: 'favorable',
  PRUDENCE: 'prudence',
  DEFAVORABLE: 'defavorable',
};

const RECOMMENDATION_LABELS = {
  [FORECAST_RECOMMENDATIONS.FAVORABLE]: 'Favorable',
  [FORECAST_RECOMMENDATIONS.PRUDENCE]: 'Prudence',
  [FORECAST_RECOMMENDATIONS.DEFAVORABLE]: 'Défavorable',
};

function buildPreLaunchActions(scenario, risks, dataQuality) {
  const actions = [];
  if (!dataQuality.hasSalePrice) actions.push('Compléter les prix de vente récents dans Commercial.');
  if (!dataQuality.hasFeedPrice) actions.push('Mettre à jour le prix aliment dans Achats & Stock.');
  if (!dataQuality.hasPurchaseHistory) actions.push('Enregistrer les coûts d’achat sujets/lots dans Élevage.');
  if (risks.some((r) => r.id === 'forecast-treasury-gap')) {
    actions.push('Sécuriser la trésorerie (encaissements, report dépenses non critiques).');
  }
  if (scenario.scenarioType === 'building_expansion' && dataQuality.missingFields?.length) {
    actions.push('Chiffrer le devis bâtiment dans Investissements ou le BP.');
  }
  actions.push('Valider le planning terrain avec Élevage → Cycles.');
  actions.push('Créer une tâche de préparation avant commande ou lancement.');
  return [...new Set(actions)];
}

function resolveRecommendation(engineResult, risks) {
  const { simulation = {}, finance = {}, dataQuality = {} } = engineResult;
  const highRisks = risks.filter((r) => r.level === 'eleve' || r.level === 'critique').length;
  const margin = simulation.estimatedMargin;
  const need = simulation.treasuryNeed || 0;
  const available = finance.availableTreasury || 0;

  if (simulation.missingInvestmentData || (margin != null && margin < 0) || (need > 0 && available < need * 0.8)) {
    return FORECAST_RECOMMENDATIONS.DEFAVORABLE;
  }
  if (highRisks >= 2 || !dataQuality.hasSalePrice || (margin != null && margin > 0 && simulation.roiPercent < 12)) {
    return FORECAST_RECOMMENDATIONS.PRUDENCE;
  }
  if (margin != null && margin > 0 && available >= need && simulation.roiPercent >= 15) {
    return FORECAST_RECOMMENDATIONS.FAVORABLE;
  }
  return FORECAST_RECOMMENDATIONS.PRUDENCE;
}

function formatPayback(simulation) {
  if (!simulation.paybackDays || simulation.paybackDays <= 0) return 'Non estimé';
  if (simulation.paybackDays <= 45) return `${simulation.paybackDays} jour(s)`;
  const months = Math.round(simulation.paybackDays / 30);
  return `${months} mois (~${simulation.paybackDays} j)`;
}

/**
 * Pipeline complet : parse → engine → risques → rapport.
 */
export function buildForecastReport(phrase = '', dataMap = {}) {
  const scenario = parseForecastScenario(phrase);
  const engineResult = runForecastEngine(dataMap, scenario);
  const risks = analyzeForecastRisks(engineResult, dataMap);
  const recommendation = resolveRecommendation(engineResult, risks);
  const { simulation = {}, finance = {}, assumptions = [] } = engineResult;

  const summaryText = [
    `Scénario : ${scenario.label}${engineResult.quantity ? ` · ${fmtNumber(engineResult.quantity)} sujet(s)` : ''}`,
    `Recommandation : ${RECOMMENDATION_LABELS[recommendation]}`,
    simulation.estimatedMargin != null ? `Marge estimée ${fmtCurrency(simulation.estimatedMargin)}` : 'Marge non estimable - données vente manquantes',
    `Besoin trésorerie ${fmtCurrency(simulation.treasuryNeed || 0)}`,
  ].join(' · ');

  return {
    id: `forecast-${Date.now()}`,
    phrase: scenario.phrase,
    scenario,
    recommendation,
    recommendationLabel: RECOMMENDATION_LABELS[recommendation],
    summary: summaryText,
    metrics: {
      initialCost: simulation.initialCost,
      treasuryNeed: simulation.treasuryNeed,
      estimatedCharges: simulation.estimatedCharges,
      estimatedSales: simulation.estimatedSales,
      estimatedMargin: simulation.estimatedMargin,
      roiPercent: simulation.roiPercent,
      paybackLabel: formatPayback(simulation),
      cycleDays: simulation.cycleDays,
    },
    financeContext: {
      treasuryResult: finance.treasuryResult,
      availableTreasury: finance.availableTreasury,
      receivable: finance.receivable,
    },
    assumptions,
    risks,
    preLaunchActions: buildPreLaunchActions(scenario, risks, engineResult.dataQuality),
    engineResult,
    disclaimer: engineResult.disclaimer,
    generated_at: new Date().toISOString(),
    readOnly: true,
  };
}

export function forecastReportToText(report = {}) {
  const m = report.metrics || {};
  const lines = [
    'Horizon Forecast - Rapport d’aide à la décision',
    report.phrase || '',
    '',
    `Recommandation : ${report.recommendationLabel || '-'}`,
    report.summary || '',
    '',
    'Indicateurs',
    `• Coût initial : ${fmtCurrency(m.initialCost)}`,
    `• Besoin trésorerie : ${fmtCurrency(m.treasuryNeed)}`,
    `• Charges estimées : ${fmtCurrency(m.estimatedCharges)}`,
    `• Ventes estimées : ${m.estimatedSales != null ? fmtCurrency(m.estimatedSales) : 'Non renseigné'}`,
    `• Marge estimée : ${m.estimatedMargin != null ? fmtCurrency(m.estimatedMargin) : 'Non renseigné'}`,
    `• ROI estimé : ${m.roiPercent != null ? `${Math.round(m.roiPercent)} %` : 'Non renseigné'}`,
    `• Délai retour : ${m.paybackLabel || 'Non renseigné'}`,
    '',
    'Hypothèses',
    ...(report.assumptions || []).map((a) => `• ${a.label} : ${a.value != null ? a.value : 'Non renseigné'} (${a.source})`),
    '',
    'Risques',
    ...(report.risks || []).map((r) => `• [${r.level}] ${r.title} - ${r.detail}`),
    '',
    'Actions avant lancement',
    ...(report.preLaunchActions || []).map((a) => `• ${a}`),
    '',
    report.disclaimer || '',
  ];
  return lines.join('\n');
}

export function forecastReportToExportPayload(report = {}) {
  const m = report.metrics || {};
  return {
    module: 'objectifs_croissance',
    title: `Horizon Forecast - ${report.scenario?.label || 'Projet'}`,
    period: new Date().toISOString().slice(0, 10),
    subtitle: report.summary,
    labels: ['Indicateur', 'Valeur'],
    series: [{ name: 'Forecast', values: [m.initialCost, m.treasuryNeed, m.estimatedCharges, m.estimatedSales, m.estimatedMargin] }],
    extra: {
      Recommandation: report.recommendationLabel,
      ROI: m.roiPercent != null ? `${Math.round(m.roiPercent)} %` : 'Non renseigné',
      'Délai retour': m.paybackLabel,
      Question: report.phrase,
      ...(report.assumptions || []).reduce((acc, a, i) => {
        acc[`Hypothèse ${i + 1}`] = `${a.label}: ${a.value ?? 'Non renseigné'}`;
        return acc;
      }, {}),
    },
  };
}

export default buildForecastReport;
