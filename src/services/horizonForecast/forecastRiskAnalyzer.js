/**
 * Analyse des risques pour scénarios Horizon Forecast.
 */

import { runErpHealthEngine } from '../erpHealthEngine.js';
import { FORECAST_SCENARIO_TYPES } from './forecastScenarioParser.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0) || 0;

function risk(id, title, detail, level = 'moyen', module = 'finance_pilotage') {
  return { id, title, detail, level, module };
}

/**
 * @param {object} engineResult - sortie runForecastEngine
 * @param {object} dataMap
 */
export function analyzeForecastRisks(engineResult = {}, dataMap = {}) {
  const risks = [];
  const { finance = {}, simulation = {}, scenario = {}, dataQuality = {} } = engineResult;
  const treasuryNeed = n(simulation.treasuryNeed);
  const available = n(finance.availableTreasury);
  const margin = simulation.estimatedMargin;

  if (treasuryNeed > 0 && available < treasuryNeed) {
    risks.push(risk(
      'forecast-treasury-gap',
      'Trésorerie insuffisante pour le scénario',
      `Besoin estimé ${Math.round(treasuryNeed).toLocaleString('fr-FR')} FCFA · disponible ~${Math.round(available).toLocaleString('fr-FR')} FCFA`,
      'eleve',
      'finance_pilotage',
    ));
  } else if (treasuryNeed > 0 && available < treasuryNeed * 1.25) {
    risks.push(risk(
      'forecast-treasury-tight',
      'Marge de trésorerie faible',
      'Le projet consomme presque toute la trésorerie disponible — prévoir un coussin.',
      'moyen',
      'finance_pilotage',
    ));
  }

  if (margin != null && margin < 0) {
    risks.push(risk(
      'forecast-negative-margin',
      'Marge estimée négative',
      'Au prix de vente historique, le projet ne couvre pas les coûts estimés.',
      'eleve',
      'commercial',
    ));
  } else if (margin != null && margin > 0 && simulation.initialCost > 0 && (margin / simulation.initialCost) < 0.1) {
    risks.push(risk(
      'forecast-thin-margin',
      'Marge très faible',
      'ROI estimé sous 10 % — sensibilité forte aux hausses aliment ou mortalité.',
      'moyen',
      'finance_pilotage',
    ));
  }

  if (!dataQuality.hasSalePrice && scenario.scenarioType !== FORECAST_SCENARIO_TYPES.BUILDING_EXPANSION) {
    risks.push(risk(
      'forecast-no-sale-price',
      'Prix de vente non renseigné',
      'Aucun prix de vente historique fiable — compléter Commercial avant décision.',
      'moyen',
      'commercial',
    ));
  }

  if (!dataQuality.hasFeedPrice) {
    risks.push(risk(
      'forecast-no-feed-price',
      'Prix aliment absent',
      'Estimation aliment basée sur hypothèse — vérifier Achats & Stock.',
      'moyen',
      'achats_stock',
    ));
  }

  if (simulation.missingInvestmentData) {
    risks.push(risk(
      'forecast-no-investment-data',
      'Coût investissement non renseigné',
      'Ajouter une ligne BP ou un investissement pour chiffrer le bâtiment.',
      'eleve',
      'investissements',
    ));
  }

  const lots = arr(dataMap.avicole || dataMap.lots).filter((l) => /actif|en_cours|production/i.test(String(l.statut || l.status || 'actif')));
  if ([FORECAST_SCENARIO_TYPES.BROILER_CHICKS, FORECAST_SCENARIO_TYPES.BROILER_BAND, FORECAST_SCENARIO_TYPES.LAYER_INCREASE].includes(scenario.scenarioType) && lots.length >= 4) {
    risks.push(risk(
      'forecast-capacity-lots',
      'Charge lots déjà élevée',
      `${lots.length} lot(s) actif(s) — vérifier capacité bâtiment, main-d’œuvre et biosecurité.`,
      'moyen',
      'elevage',
    ));
  }

  const health = runErpHealthEngine(dataMap);
  const criticalFindings = arr(health.findings).filter((f) => f.severity === 'critique' || f.severity === 'haute').slice(0, 3);
  criticalFindings.forEach((f) => {
    risks.push(risk(
      `forecast-health-${f.id}`,
      f.title,
      f.recommended_action || f.description || 'Signal ERP Health',
      'moyen',
      f.module || 'centre_decisionnel',
    ));
  });

  if (n(finance.receivable) > n(finance.encaisse) * 0.5 && n(finance.receivable) > 0) {
    risks.push(risk(
      'forecast-receivables',
      'Créances clients élevées',
      'Encaissements en attente — lancer un projet augmente le risque de tension cash.',
      'moyen',
      'commercial',
    ));
  }

  const levelRank = { eleve: 0, critique: 0, moyen: 1, faible: 2 };
  return risks.sort((a, b) => (levelRank[a.level] ?? 9) - (levelRank[b.level] ?? 9));
}

export default analyzeForecastRisks;
