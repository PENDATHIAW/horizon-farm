/**
 * PHASE B — Outils métier ERP pour l'agent Hey Horizon.
 * 5 domaines prioritaires : créances, stock, élevage, trésorerie, priorités du jour.
 */

import { normalizeAgriculturalText, classifyUniversalIntent, isQuestionIntent } from './assistantUniversalIntents.js';
import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import {
  buildDirectorEngineAnswer,
  DIRECTOR_INTENTS,
} from './assistantDirectorEngines.js';
import { buildDirectorSnapshot } from './assistantDirectorSnapshot.js';
import { formatCompactHorizonAnswer } from './assistantResponseFormatter.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

export const FARM_TOOL_IDS = Object.freeze({
  RECEIVABLES: 'get_receivables',
  STOCK: 'get_stock_status',
  ELEVAGE: 'get_elevage_status',
  TREASURY: 'get_treasury',
  PRIORITIES: 'get_daily_priorities',
});

/** Catalogue exposé au LLM et au routeur. */
export const FARM_TOOL_CATALOG = Object.freeze([
  {
    id: FARM_TOOL_IDS.RECEIVABLES,
    label: 'Créances et relances clients',
    description: 'Qui doit de l\'argent, montants impayés, clients à relancer',
    intents: ['receivables', 'relances', 'creances', 'receivable_follow_up', 'follow_up'],
    patterns: [
      /creance|créance|impaye|impayé|relance|me doit|doivent.*argent|qui me doit|clients?.*doit/i,
    ],
    moduleKey: 'commercial',
  },
  {
    id: FARM_TOOL_IDS.STOCK,
    label: 'Stock et ruptures',
    description: 'Niveaux de stock, ruptures, aliments, seuils critiques',
    intents: ['stock_ruptures', 'stock_remain', 'stock_aliment', 'stock_critical_lookup', 'top_product'],
    patterns: [
      /stock|rupture|aliment|intrant|seuil|reste.*stock|quantite.*stock/i,
    ],
    moduleKey: 'stock',
  },
  {
    id: FARM_TOOL_IDS.ELEVAGE,
    label: 'Élevage et lots',
    description: 'Cheptel, lots actifs, animaux malades, sous traitement, mortalité',
    intents: [
      'lots_overview', 'lots_sick', 'lot_mortality', 'animals_under_treatment',
      'headcount_total', 'headcount_bovins', 'headcount_poulets', 'my_animals',
    ],
    patterns: [
      /elevage|élevage|lot|cheptel|bovin|ovin|poulet|pondeuse|avicole|malade|traitement|mortalite|mortalité|animaux/i,
    ],
    moduleKey: 'elevage',
  },
  {
    id: FARM_TOOL_IDS.TREASURY,
    label: 'Trésorerie et finances',
    description: 'Cash disponible, dettes, résultat, situation financière',
    intents: ['treasury', 'dettes', 'resultat', 'money_leaks'],
    patterns: [
      /tresorerie|trésorerie|caisse|liquidite|liquidité|combien j.?ai|argent disponible|dettes?|resultat|résultat|marge/i,
    ],
    moduleKey: 'finance_pilotage',
  },
  {
    id: FARM_TOOL_IDS.PRIORITIES,
    label: 'Priorités du jour',
    description: 'Que faire aujourd\'hui, urgences, vue synthétique exploitation',
    intents: ['today_priorities', 'priorites_du_jour', 'comment_va_la_ferme', 'farm_overview'],
    patterns: [
      /priorite|priorité|que faire|urgence|aujourd.?hui|comment va (la ferme|l exploitation)|situation globale|par quoi commencer/i,
    ],
    moduleKey: 'centre_ia',
  },
]);

const DEFAULT_INTENT_BY_TOOL = Object.freeze({
  [FARM_TOOL_IDS.RECEIVABLES]: 'receivables',
  [FARM_TOOL_IDS.STOCK]: 'stock_ruptures',
  [FARM_TOOL_IDS.ELEVAGE]: 'lots_overview',
  [FARM_TOOL_IDS.TREASURY]: 'treasury',
  [FARM_TOOL_IDS.PRIORITIES]: 'priorites_du_jour',
});

/**
 * Route une question vers un outil métier.
 * @returns {{ toolId: string, intent?: string, confidence: number, label?: string } | null}
 */
export function routeFarmTool(question = '', dataMap = {}) {
  const q = normalizeAgriculturalText(question);
  if (!q) return null;

  const universal = classifyUniversalIntent(question);
  if (universal && isQuestionIntent(universal)) {
    for (const tool of FARM_TOOL_CATALOG) {
      if (tool.intents.includes(universal.intent)) {
        return {
          toolId: tool.id,
          intent: universal.intent,
          confidence: Math.min(0.98, 0.72 + (universal.score || 0) * 0.25),
          label: tool.label,
          moduleKey: tool.moduleKey,
        };
      }
    }
  }

  let best = null;
  for (const tool of FARM_TOOL_CATALOG) {
    let hits = 0;
    for (const pattern of tool.patterns) {
      if (pattern.test(q)) hits += 1;
    }
    if (!hits) continue;
    const confidence = Math.min(0.92, 0.55 + hits * 0.12);
    if (!best || confidence > best.confidence) {
      best = {
        toolId: tool.id,
        intent: DEFAULT_INTENT_BY_TOOL[tool.id],
        confidence,
        label: tool.label,
        moduleKey: tool.moduleKey,
      };
    }
  }
  return best;
}

/**
 * Exécute un outil et retourne réponse structurée + données brutes.
 */
export function executeFarmTool(toolId = '', dataMap = {}, options = {}) {
  const { conversationContext = null, query = '', intent: forcedIntent = null } = options;

  if (toolId === FARM_TOOL_IDS.PRIORITIES) {
    const directorIntent = /comment va|situation globale|etat global/i.test(normalizeAgriculturalText(query))
      ? DIRECTOR_INTENTS.COMMENT_VA_LA_FERME
      : DIRECTOR_INTENTS.PRIORITES_DU_JOUR;
    const answer = buildDirectorEngineAnswer(directorIntent, dataMap, conversationContext, query);
    if (!answer) return null;
    return {
      toolId,
      intent: directorIntent,
      answer,
      summary: formatCompactHorizonAnswer(answer),
      moduleKey: 'centre_ia',
    };
  }

  const intent = forcedIntent || DEFAULT_INTENT_BY_TOOL[toolId];
  if (!intent) return null;

  const answer = buildAgriculturalAnswer(intent, dataMap, { conversationContext, query });
  if (!answer) return null;

  const tool = FARM_TOOL_CATALOG.find((t) => t.id === toolId);
  return {
    toolId,
    intent,
    answer,
    summary: formatCompactHorizonAnswer(answer),
    moduleKey: tool?.moduleKey || 'assistant_erp',
  };
}

/**
 * Extrait un snapshot léger pour le LLM (sans tout le dataMap).
 */
export function buildFarmToolContextSummary(dataMap = {}) {
  const snap = buildDirectorSnapshot(dataMap);
  return {
    creances_label: snap.commercial?.receivable
      ? `${Math.round(n(snap.commercial.receivable)).toLocaleString('fr-FR')} FCFA`
      : '0 FCFA',
    creances_count: arr(snap.receivableRows).length,
    top_client: snap.topReceivable?.clientName || null,
    treasury_label: `${Math.round(n(snap.finance?.cashNet)).toLocaleString('fr-FR')} FCFA`,
    stock_critique: n(snap.stockSummary?.lowStockCount),
    lots_actifs: n(snap.headcount?.activeLots),
    animaux_total: n(snap.headcount?.total),
    alertes_elevage: arr(snap.elevageAlerts).length,
    has_farm_data: snap.hasFarmData,
  };
}

export default {
  FARM_TOOL_IDS,
  FARM_TOOL_CATALOG,
  routeFarmTool,
  executeFarmTool,
  buildFarmToolContextSummary,
};
