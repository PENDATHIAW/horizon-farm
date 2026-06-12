/**
 * PHASE B étendue — Outils métier par module ERP (15 domaines).
 */

import { normalizeAgriculturalText, classifyUniversalIntent, isQuestionIntent } from './assistantUniversalIntents.js';
import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import {
  buildDirectorEngineAnswer,
  DIRECTOR_INTENTS,
} from './assistantDirectorEngines.js';
import { buildDirectorSnapshot } from './assistantDirectorSnapshot.js';
import { formatCompactHorizonAnswer } from './assistantResponseFormatter.js';
import { enrichTerrainAnswer } from './assistantTerrainAnswers.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

export const FARM_TOOL_IDS = Object.freeze({
  RECEIVABLES: 'get_receivables',
  COMMERCIAL: 'get_commercial_status',
  STOCK: 'get_stock_status',
  ELEVAGE: 'get_elevage_status',
  CULTURES: 'get_cultures_status',
  METEO: 'get_meteo_status',
  TREASURY: 'get_treasury',
  OBJECTIFS: 'get_objectifs_status',
  PRIORITIES: 'get_daily_priorities',
  DOCUMENTS: 'get_documents_activity',
  RH: 'get_rh_operations',
  INVESTOR: 'get_investor_insights',
  ADMIN: 'get_admin_status',
});

const DIRECTOR_BY_INTENT = Object.freeze({
  farm_trends: DIRECTOR_INTENTS.TENDANCES,
  farm_comparisons: DIRECTOR_INTENTS.COMPARAISONS,
  farm_risks: DIRECTOR_INTENTS.RISQUES,
  main_risk: DIRECTOR_INTENTS.RISQUES,
  farm_opportunities: DIRECTOR_INTENTS.OPPORTUNITES,
  money_leaks: DIRECTOR_INTENTS.MONEY_LEAKS,
  comment_va_la_ferme: DIRECTOR_INTENTS.COMMENT_VA_LA_FERME,
  farm_overview: DIRECTOR_INTENTS.COMMENT_VA_LA_FERME,
  farm_status: DIRECTOR_INTENTS.COMMENT_VA_LA_FERME,
  progress_status: DIRECTOR_INTENTS.OBJECTIF_STATUS,
  annual_outlook: DIRECTOR_INTENTS.OBJECTIF_STATUS,
  objectif_status: DIRECTOR_INTENTS.OBJECTIF_STATUS,
  priorites_du_jour: DIRECTOR_INTENTS.PRIORITES_DU_JOUR,
  today_priorities: DIRECTOR_INTENTS.PRIORITES_DU_JOUR,
});

/** Catalogue complet — aligné sur MODULE_BUSINESS_QUESTIONS. */
export const FARM_TOOL_CATALOG = Object.freeze([
  {
    id: FARM_TOOL_IDS.RECEIVABLES,
    label: 'Créances et relances',
    description: 'Clients débiteurs, impayés, relances à faire',
    moduleKey: 'commercial',
    intents: ['receivables', 'relances', 'creances', 'receivable_follow_up', 'follow_up', 'receivable_detail'],
    patterns: [/creance|créance|impaye|impayé|relance|me doit|doivent.*argent|qui me doit|clients?.*doit|argent a recuperer/i],
  },
  {
    id: FARM_TOOL_IDS.COMMERCIAL,
    label: 'Commercial et ventes',
    description: 'CA, ventes, commandes, livraisons, meilleur client/produit, opportunités',
    moduleKey: 'commercial',
    intents: [
      'ventes', 'top_client', 'top_product', 'commercial_summary', 'ventes_today',
      'orders_overview', 'deliveries_overview', 'sell_today', 'farm_opportunities', 'ca_progress',
    ],
    patterns: [
      /ventes?|chiffre d.?affaires|\bca\b|commandes?|livraisons?|meilleur client|meilleur produit|produit.*vend|commercial|opportunite|opportunité|quoi vendre|que vendre|orange money|superette|encaisse/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.STOCK,
    label: 'Stock et achats',
    description: 'Inventaire, ruptures, aliments, DLC, achats, fournisseurs',
    moduleKey: 'stock',
    intents: [
      'stock_overview', 'stock_remain', 'stock_aliment', 'stock_maiz', 'stock_ruptures',
      'stock_dlc', 'stock_sellable', 'purchases_overview', 'suppliers_overview', 'stock_critical_lookup',
    ],
    patterns: [
      /stock|rupture|magasin|inventaire|aliment|intrant|dlc|peremption|péremotion|achats?|fournisseurs?|seuil|manque de|provende|provender|sacs d aliment/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.ELEVAGE,
    label: 'Élevage',
    description: 'Cheptel, lots, espèces, traitements, mortalité, surveillance',
    moduleKey: 'elevage',
    intents: [
      'my_animals', 'lots_overview', 'lots_sick', 'lot_mortality', 'animals_under_treatment',
      'lots_surveillance', 'elevage_status', 'headcount_total', 'headcount_bovins', 'headcount_poulets',
      'headcount_pondeuses', 'headcount_ovins', 'headcount_caprins',
    ],
    patterns: [
      /elevage|élevage|cheptel|lot|bande|bovin|ovin|caprin|poulet|pondeuse|avicole|malade|traitement|mortalite|mortalité|animaux|vache|mouton|chevre|chèvre|surveiller|lot chair|bande chair|cale|perte.*poulet/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.CULTURES,
    label: 'Cultures et parcelles',
    description: 'Parcelles, rendements, récoltes, campagnes, cultures en difficulté',
    moduleKey: 'cultures',
    intents: [
      'parcelles_status', 'rendement', 'recoltes', 'campagnes', 'cultures_difficulte',
      'parcel_best', 'culture_profit',
    ],
    patterns: [
      /parcelle|culture|recolte|récolte|rendement|campagne|saison agricole|tomate|oignon|mais|maïs|difficulte|difficulté/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.METEO,
    label: 'Météo',
    description: 'Conditions actuelles, risques météo, prévisions',
    moduleKey: 'cultures',
    intents: ['weather_now', 'weather_risk', 'weather_forecast'],
    patterns: [/meteo|météo|pluie|pleuvoir|temperature|température|vent|humidite|humidité|temps qu il fait/i],
  },
  {
    id: FARM_TOOL_IDS.TREASURY,
    label: 'Finance et trésorerie',
    description: 'Trésorerie, dettes, charges, rentabilité, fuites financières',
    moduleKey: 'finance_pilotage',
    intents: [
      'treasury', 'dettes', 'creances', 'resultat', 'charges_overview', 'money_leaks',
      'profitability', 'investment_capacity',
    ],
    patterns: [
      /tresorerie|trésorerie|treso|tréso|caisse|liquidite|liquidité|combien j.?ai|argent disponible|dettes?|resultat|résultat|marge|rentab|charges?|depenses?|dépenses?|perdre de l argent|fuite/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.OBJECTIFS,
    label: 'Objectifs et croissance',
    description: 'Avancement objectifs mensuels/annuels, projections',
    moduleKey: 'objectifs_croissance',
    intents: ['progress_status', 'annual_outlook', 'month_goal', 'annual_goal', 'objectif_status'],
    patterns: [/objectif|atteindre|cible|avancement|projection|ecart|écart|finir l annee|finir l année/i],
  },
  {
    id: FARM_TOOL_IDS.PRIORITIES,
    label: 'Priorités et pilotage',
    description: 'Urgences du jour, journal d\'activité, que faire',
    moduleKey: 'centre_ia',
    intents: [
      'today_priorities', 'priorites_du_jour', 'comment_va_la_ferme', 'farm_overview',
      'farm_status', 'activity_journal',
    ],
    patterns: [
      /priorite|priorité|que faire|urgence|aujourd.?hui|par quoi commencer|comment va (la ferme|l exploitation)|situation globale|journal|activite recente|activité récente/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.DOCUMENTS,
    label: 'Documents et rapports',
    description: 'Rapports générés, exports, documents exploitation',
    moduleKey: 'documents_rapports',
    intents: ['documents_summary'],
    patterns: [/rapports?|documents?|exports?|justificatif|preuve|generes|générés/i],
  },
  {
    id: FARM_TOOL_IDS.RH,
    label: 'RH et équipements',
    description: 'Personnel, équipes, tracteurs, maintenance matériel',
    moduleKey: 'rh',
    intents: ['rh_personnel', 'equipment_overview', 'equipment_action'],
    patterns: [/personnel|equipes?|équipes?|employe|employé|tracteur|equipement|équipement|maintenance|panne|ressources humaines/i],
  },
  {
    id: FARM_TOOL_IDS.INVESTOR,
    label: 'Investisseur et performance',
    description: 'Vue financeur, croissance, risques, tendances, comparaisons',
    moduleKey: 'investisseurs_forums',
    intents: [
      'investor_summary', 'growth', 'ca_progress', 'investment_capacity', 'main_risk',
      'farm_trends', 'farm_comparisons', 'farm_risks',
    ],
    patterns: [
      /investisseur|financeur|banque|dossier|croissance|performance|tendance|compar|versus|vs mois|risque principal|vigilance/i,
    ],
  },
  {
    id: FARM_TOOL_IDS.ADMIN,
    label: 'Système et synchronisation',
    description: 'Sync ERP, intégrité données, administration',
    moduleKey: 'gestion_systeme',
    intents: ['sync_status', 'system_overview'],
    patterns: [/synchronis|sync erp|integrite|intégrité|utilisateurs?|permissions?|parametres|paramètres|administration/i],
  },
]);

const DEFAULT_INTENT_BY_TOOL = Object.freeze({
  [FARM_TOOL_IDS.RECEIVABLES]: 'receivables',
  [FARM_TOOL_IDS.COMMERCIAL]: 'ventes',
  [FARM_TOOL_IDS.STOCK]: 'stock_overview',
  [FARM_TOOL_IDS.ELEVAGE]: 'lots_overview',
  [FARM_TOOL_IDS.CULTURES]: 'parcelles_status',
  [FARM_TOOL_IDS.METEO]: 'weather_now',
  [FARM_TOOL_IDS.TREASURY]: 'treasury',
  [FARM_TOOL_IDS.OBJECTIFS]: 'progress_status',
  [FARM_TOOL_IDS.PRIORITIES]: 'priorites_du_jour',
  [FARM_TOOL_IDS.DOCUMENTS]: 'documents_summary',
  [FARM_TOOL_IDS.RH]: 'rh_personnel',
  [FARM_TOOL_IDS.INVESTOR]: 'investor_summary',
  [FARM_TOOL_IDS.ADMIN]: 'sync_status',
});

function resolveToolIntent(toolId, query = '', forcedIntent = null) {
  if (forcedIntent) return forcedIntent;
  const universal = classifyUniversalIntent(query);
  const tool = FARM_TOOL_CATALOG.find((t) => t.id === toolId);
  if (universal && isQuestionIntent(universal) && tool?.intents.includes(universal.intent)) {
    return universal.intent;
  }
  return DEFAULT_INTENT_BY_TOOL[toolId];
}

/**
 * Route une question vers un outil métier.
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
    const confidence = Math.min(0.9, 0.52 + hits * 0.1);
    if (!best || confidence > best.confidence) {
      best = {
        toolId: tool.id,
        intent: resolveToolIntent(tool.id, question),
        confidence,
        label: tool.label,
        moduleKey: tool.moduleKey,
      };
    }
  }
  return best;
}

function buildAnswerForIntent(intent, dataMap, options = {}) {
  const directorKey = DIRECTOR_BY_INTENT[intent];
  if (directorKey) {
    const directorAnswer = buildDirectorEngineAnswer(
      directorKey,
      dataMap,
      options.conversationContext,
      options.query,
    );
    if (directorAnswer) {
      return enrichTerrainAnswer(directorAnswer, intent, dataMap, options);
    }
  }
  return buildAgriculturalAnswer(intent, dataMap, {
    conversationContext: options.conversationContext,
    query: options.query,
  });
}

/**
 * Exécute un outil et retourne réponse structurée.
 */
export function executeFarmTool(toolId = '', dataMap = {}, options = {}) {
  const { conversationContext = null, query = '', intent: forcedIntent = null } = options;
  const intent = resolveToolIntent(toolId, query, forcedIntent);
  if (!intent) return null;

  const answer = buildAnswerForIntent(intent, dataMap, { conversationContext, query });
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
 * Snapshot léger pour le LLM routeur.
 */
export function buildFarmToolContextSummary(dataMap = {}) {
  const snap = buildDirectorSnapshot(dataMap);
  return {
    creances_label: snap.commercial?.receivable
      ? `${Math.round(n(snap.commercial.receivable)).toLocaleString('fr-FR')} FCFA`
      : '0 FCFA',
    creances_count: arr(snap.receivableRows).length,
    top_client: snap.topReceivable?.clientName || null,
    ca_label: `${Math.round(n(snap.commercial?.ca)).toLocaleString('fr-FR')} FCFA`,
    treasury_label: `${Math.round(n(snap.finance?.cashNet)).toLocaleString('fr-FR')} FCFA`,
    stock_critique: n(snap.stockSummary?.lowStockCount),
    parcelles: n(snap.cultureSummary?.activeCount || snap.props?.cultures?.length),
    lots_actifs: n(snap.headcount?.activeLots),
    animaux_total: n(snap.headcount?.total),
    objectif_mois_pct: snap.monthPct,
    alertes_elevage: arr(snap.elevageAlerts).length,
    documents_count: arr(snap.props?.documents).length,
    has_farm_data: snap.hasFarmData,
  };
}

/** Liste des intents couverts par les outils (pour tests). */
export function allToolIntents() {
  return [...new Set(FARM_TOOL_CATALOG.flatMap((t) => t.intents))];
}

export default {
  FARM_TOOL_IDS,
  FARM_TOOL_CATALOG,
  routeFarmTool,
  executeFarmTool,
  buildFarmToolContextSummary,
  allToolIntents,
  resolveToolIntent,
};
