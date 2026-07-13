/**
 * Réponses assistant alignées sur le Centre décisionnel
 * (mêmes moteurs que CentreDecisionModule : strategic + growth).
 */

import { buildDecisionCenterPlan } from './growthDecisionEngine.js';
import { buildStrategicDecisionPlan } from './strategicDecisionEngine.js';
import {
  buildPrioritesConseilAnswer,
  buildRisquesAnswer,
  buildOpportunitesAnswer,
  buildCommentVaLaFermeConseilAnswer,
} from './assistantFarmAdvisor.js';
import { enrichTerrainAnswer } from './assistantTerrainAnswers.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

function withCentreMeta(answer = {}, tab = '', moduleKey = 'centre_ia') {
  if (!answer) return null;
  return {
    ...answer,
    route: moduleKey,
    tab,
    navigation: { moduleId: moduleKey, tab },
    centreLinked: true,
  };
}

function buildCentreRecommendationsAnswer(dataMap = {}, options = {}) {
  const plan = buildDecisionCenterPlan(dataMap, options);
  const recs = arr(plan.recommendations).slice(0, 4);
  const lines = recs.map((row, index) => {
    const title = row.title || row.activity || 'Recommandation';
    const detail = row.recommendation || row.timing || '';
    return `${index + 1}. ${title}${detail ? ` - ${detail}` : ''}`;
  });

  const strategic = buildStrategicDecisionPlan(dataMap, { meteo: options.meteo || dataMap.meteo });
  const strategicTop = arr(strategic.recommendations).slice(0, 2);
  const strategicLines = strategicTop.map((row) => row.recommendation || row.title).filter(Boolean);

  const situation = lines.length
    ? `Le centre décisionnel propose ${recs.length} axe(s) prioritaire(s) :\n\n${lines.join('\n\n')}`
    : 'Peu de recommandations automatiques pour l\'instant - les objectifs et stocks guident encore la journée.';

  const action = strategicLines[0]
    ? `${strategicLines[0]} Ouvrez le Centre décisionnel → Croissance & opportunités pour le détail.`
    : 'Ouvrez le Centre décisionnel → Croissance & opportunités pour valider les actions.';

  return withCentreMeta({
    title: 'Recommandations',
    intent: 'centre_recommendations',
    situation,
    cause: plan.goals?.month?.attainment != null
      ? `Objectif mois à ${n(plan.goals.month.attainment)} % - les recommandations visent l'écart restant.`
      : 'Synthèse croissance + alertes techniques.',
    action,
    sources: ['buildDecisionCenterPlan', 'buildStrategicDecisionPlan'],
    confidence: recs.length ? 91 : 78,
  }, 'Croissance & opportunités');
}

function buildCentreCyclesAnswer(dataMap = {}, options = {}) {
  const strategic = buildStrategicDecisionPlan(dataMap, { meteo: options.meteo || dataMap.meteo });
  const launch = arr(strategic.recommendations).filter((row) => row.category === 'launch_timing' || row.category === 'sell_now');
  const pick = launch[0] || arr(strategic.recommendations)[0];

  const situation = pick
    ? `${pick.recommendation || pick.title}${pick.timing ? ` (${pick.timing})` : ''}.`
    : 'Aucun signal de cycle urgent - consultez l\'onglet Saisons & marchés pour le calendrier complet.';

  const bfrBlock = arr(strategic.recommendations).find((row) => row.category === 'bfr');
  const cause = bfrBlock
    ? bfrBlock.recommendation
    : (pick?.category === 'sell_now' ? 'Produit ou lot prêt à écouler selon les moteurs stratégiques.' : 'Timing avicole et calendrier commercial.');

  return withCentreMeta({
    title: 'Cycles',
    intent: 'centre_cycles',
    situation,
    cause,
    action: 'Dites « vas-y » pour le plan complet ou ouvrez Centre décisionnel → Saisons & marchés.',
    sources: ['buildStrategicDecisionPlan'],
    confidence: pick ? 90 : 76,
  }, 'Saisons & marchés');
}

function buildCentreActivityAnswer(dataMap = {}) {
  const events = arr(dataMap.business_events || dataMap.businessEvents).slice(0, 6);
  const preview = events.map((e) => e.title || e.event_type || e.type).filter(Boolean).slice(0, 4);
  const journal = preview.length
    ? `Activité récente : ${preview.join(', ')}.`
    : 'Peu d\'événements terrain enregistrés ces derniers jours.';

  return withCentreMeta({
    title: 'Journal',
    intent: 'activity_journal',
    situation: `${fmt(events.length)} événement(s) dans le carnet.${preview.length ? ` ${journal}` : ''}`,
    cause: 'Flux terrain → ERP synchronisés dans Activité & Centre décisionnel.',
    action: 'Je peux résumer les priorités du jour si vous voulez.',
    sources: ['business_events'],
    confidence: 86,
  }, 'Saisons & marchés');
}

function fmt(v) {
  return Number(v || 0).toLocaleString('fr-FR');
}

const INTENT_HANDLERS = Object.freeze({
  today_priorities: (dm) => withCentreMeta(buildPrioritesConseilAnswer(dm), 'Urgences & risques'),
  priorites_du_jour: (dm) => withCentreMeta(buildPrioritesConseilAnswer(dm), 'Urgences & risques'),
  farm_overview: (dm) => withCentreMeta(buildCommentVaLaFermeConseilAnswer(dm), 'Urgences & risques'),
  comment_va_la_ferme: (dm) => withCentreMeta(buildCommentVaLaFermeConseilAnswer(dm), 'Urgences & risques'),
  farm_status: (dm) => withCentreMeta(buildCommentVaLaFermeConseilAnswer(dm), 'Urgences & risques'),
  main_risk: (dm) => withCentreMeta(buildRisquesAnswer(dm), 'Urgences & risques'),
  farm_risks: (dm) => withCentreMeta(buildRisquesAnswer(dm), 'Urgences & risques'),
  farm_opportunities: (dm) => withCentreMeta(buildOpportunitesAnswer(dm), 'Croissance & opportunités'),
  centre_recommendations: buildCentreRecommendationsAnswer,
  centre_cycles: buildCentreCyclesAnswer,
  centre_opportunities: (dm) => withCentreMeta(buildOpportunitesAnswer(dm), 'Croissance & opportunités'),
  activity_journal: buildCentreActivityAnswer,
});

/**
 * Réponse métier pour intents Centre décisionnel.
 */
export function buildCentreDecisionAnswer(intent = '', dataMap = {}, options = {}) {
  const handler = INTENT_HANDLERS[intent];
  if (!handler) return null;
  const raw = handler(dataMap, options);
  if (!raw) return null;
  return enrichTerrainAnswer(raw, intent, dataMap, options);
}

export default buildCentreDecisionAnswer;
