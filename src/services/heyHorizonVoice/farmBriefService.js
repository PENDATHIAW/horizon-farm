/**
 * Hey Horizon Vocal — brief ferme lecture seule (Hey Horizon AI Core + contextual voice).
 * Aucune écriture Supabase : journal local assistant uniquement.
 */

import { parseContextualVoicePhrase } from '../aiGateway/contextualVoiceParser.js';
import { saveLocalRecommendation } from '../aiRecommendationsService.js';
import { buildRecommendationsFromData } from '../aiRecommendationsService.js';
import { getHeyHorizonCoreSnapshot } from '../heyHorizonCore/index.js';
import { buildStrategicAnswer } from '../heyHorizonStrategicAnswers.js';
import { filterRealOpenTasks, formatTaskTitleForDisplay } from '../../utils/healthFindingLabels.js';
import { pickRows, low } from '../heyHorizonCore/coreUtils.js';
import { buildBriefSections, formatVoiceBrief } from './voiceBriefFormatter.js';

export const BRIEF_QUERY_TYPES = {
  WEEKLY: 'weekly_brief',
  ENCAISSEMENTS: 'encaissements',
  LOT_RENTABLE: 'lot_profitability',
  RISQUES: 'risks',
  STOCKS: 'low_stock',
  URGENT: 'urgent_tasks',
  GENERAL: 'general',
};

const ACTION_INTENTS = new Set([
  'sale_record',
  'egg_production',
  'health_action',
  'feeding_distribution',
  'stock_purchase',
  'stock_usage',
  'expense_record',
  'task_creation',
  'mortality_record',
  'vaccination_record',
]);

const BRIEF_PATTERNS = [
  { type: BRIEF_QUERY_TYPES.WEEKLY, patterns: [/brief.*semaine/, 'fais-moi le brief', 'brief de la semaine', 'résumé de la semaine', 'resume de la semaine', 'hey horizon'] },
  { type: BRIEF_QUERY_TYPES.ENCAISSEMENTS, patterns: [/combien.*encaiss/, 'encaissé ce mois', 'encaisse ce mois', 'encaissements', 'recettes du mois'] },
  { type: BRIEF_QUERY_TYPES.LOT_RENTABLE, patterns: [/lot.*rentab/, /rentab.*lot/, 'lot le plus rentable', 'lot le moins rentable', 'quel lot'] },
  { type: BRIEF_QUERY_TYPES.RISQUES, patterns: [/risque.*actuel/, 'mes risques', 'quels risques', 'risques du mois', 'principal risque'] },
  { type: BRIEF_QUERY_TYPES.STOCKS, patterns: [/stock.*faible/, /stock.*critique/, 'stocks bas', 'stocks faibles', 'quels stocks'] },
  { type: BRIEF_QUERY_TYPES.URGENT, patterns: [/action.*urgent/, 'urgent aujourd', 'faire aujourd', 'priorité du jour', 'tâches urgentes', 'taches urgentes'] },
  { type: BRIEF_QUERY_TYPES.GENERAL, patterns: [/résumé/, 'resume', 'brief', 'situation de la ferme', 'état de la ferme'] },
];

function matchQuery(text, patterns) {
  const q = low(text);
  return patterns.some((p) => (typeof p === 'string' ? q.includes(p) : p.test(q)));
}

/** Détecte si la phrase est une question brief (vs action terrain). */
export function isFarmBriefQuery(phrase = '') {
  return Boolean(detectBriefQueryType(phrase));
}

export function detectBriefQueryType(phrase = '') {
  const q = String(phrase || '').trim();
  if (!q) return null;
  if (looksLikeActionCommand(q)) return null;

  for (const { type, patterns } of BRIEF_PATTERNS) {
    if (matchQuery(q, patterns)) return type;
  }
  return null;
}

function looksLikeActionCommand(phrase) {
  const q = low(phrase);
  if (/j'ai\s+(vendu|achet|ramass|distribu|isol|utilis|pay|enregistr)/.test(q)) return true;
  if (/^(créer|creer|ajouter|enregistrer)\s/.test(q)) return true;

  const parsed = parseContextualVoicePhrase(phrase, {});
  const primary = parsed.drafts?.[0];
  if (primary && ACTION_INTENTS.has(primary.intent) && (primary.confidence ?? 0) >= 0.55) {
    return true;
  }
  return false;
}

/** Agrège snapshot Core + recommandations + tâches urgentes. */
export function buildFarmBriefData(dataMap = {}) {
  const snapshot = getHeyHorizonCoreSnapshot(dataMap);
  const recommendations = buildRecommendationsFromData(dataMap).slice(0, 6);
  const tasks = filterRealOpenTasks(pickRows(dataMap, 'taches', 'tasks'));
  const urgentTasks = tasks.slice(0, 5).map((task) => ({
    ...task,
    displayTitle: formatTaskTitleForDisplay(task),
  }));
  const sections = buildBriefSections({ snapshot, recommendations, urgentTasks });

  return {
    snapshot,
    recommendations,
    urgentTasks,
    sections,
    farmName: snapshot.farm?.farm_name || 'Non renseigné',
    periodLabel: snapshot.farm?.period?.label || dataMap.periodLabel || 'Non renseigné',
  };
}

function resolveStrategicAnswer(queryType, dataMap) {
  if (queryType === BRIEF_QUERY_TYPES.LOT_RENTABLE) {
    return buildStrategicAnswer('lot_profitability', dataMap);
  }
  if (queryType === BRIEF_QUERY_TYPES.RISQUES) {
    return buildStrategicAnswer('monthly_risks', dataMap);
  }
  return null;
}

/**
 * Produit un brief vocal/texte lecture seule.
 * Réutilise le parseur contextual voice pour éviter les collisions avec les actions terrain.
 */
export async function processHeyHorizonVoiceBrief({
  phrase = '',
  dataMap = {},
  handlers = {},
  queryType: forcedType = null,
} = {}) {
  const query = String(phrase || '').trim();
  if (!query) {
    return { ok: false, error: 'Phrase vide', readOnly: true };
  }

  const detectedType = forcedType || detectBriefQueryType(query) || BRIEF_QUERY_TYPES.WEEKLY;
  if (!forcedType && looksLikeActionCommand(query)) {
    return { ok: false, error: 'action_command', readOnly: true, phrase: query };
  }

  const briefData = buildFarmBriefData(dataMap);
  const strategic = resolveStrategicAnswer(detectedType, dataMap);
  const formatted = formatVoiceBrief({
    ...briefData,
    queryType: detectedType,
    phrase: query,
    strategic,
  });

  try {
    saveLocalRecommendation({
      type: 'voice_brief',
      action: formatted.title,
      text: query,
      module: 'assistant_erp',
      confidence_score: 95,
      summary: formatted.headline,
    });
  } catch {
    // Journal local optionnel (environnement sans localStorage).
  }

  if (handlers.onCreateBusinessEvent) {
    // Journal optionnel — désactivé par défaut (pas d'écriture base pour le brief vocal v1).
  }

  return {
    ok: true,
    readOnly: true,
    queryType: detectedType,
    phrase: query,
    ...formatted,
  };
}

/** Alias pratique pour le bouton « Brief de la semaine ». */
export async function buildWeeklyFarmBrief(dataMap = {}, handlers = {}) {
  return processHeyHorizonVoiceBrief({
    phrase: 'Hey Horizon, fais-moi le brief de la semaine.',
    dataMap,
    handlers,
    queryType: BRIEF_QUERY_TYPES.WEEKLY,
  });
}

export default processHeyHorizonVoiceBrief;
