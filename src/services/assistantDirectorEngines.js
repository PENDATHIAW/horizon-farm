/**
 * Moteurs dirigeant V6.1 + Conseiller V7.
 * COMMENT_VA_LA_FERME · PRIORITÉS · OBJECTIFS · SUIVI · TENDANCES · COMPARAISONS · RISQUES · OPPORTUNITÉS
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';
import { isAffirmativeFollowUp } from './assistantProgressiveResponse.js';
import { fmtCurrency } from '../utils/format.js';
import { buildDirectorSnapshot } from './assistantDirectorSnapshot.js';
import {
  buildCommentVaLaFermeConseilAnswer,
  buildPrioritesConseilAnswer,
  buildTendancesAnswer,
  buildComparaisonsAnswer,
  buildRisquesAnswer,
  buildOpportunitesAnswer,
  buildMoneyLeaksAnswer,
} from './assistantFarmAdvisor.js';
import { resolveCanonicalGoalProgress } from './assistantGoalProgress.js';



export const DIRECTOR_INTENTS = Object.freeze({
  COMMENT_VA_LA_FERME: 'comment_va_la_ferme',
  PRIORITES_DU_JOUR: 'priorites_du_jour',
  OBJECTIF_STATUS: 'objectif_status',
  RECEIVABLE_FOLLOW_UP: 'receivable_follow_up',
  TENDANCES: 'farm_trends',
  COMPARAISONS: 'farm_comparisons',
  RISQUES: 'farm_risks',
  OPPORTUNITES: 'farm_opportunities',
  MONEY_LEAKS: 'money_leaks',
});

const CLIENT_FOLLOW_UP = /^(quel|quelle|lequel|laquelle)(s)?\s+(client|clients?)\??$/;
const NAME_FOLLOW_UP = /^(son nom|le nom|qui c est|c est qui)\??$/;

/**
 * Détecte une intention dirigeant / conseiller (prioritaire sur salutations / créances génériques).
 */
export function resolveDirectorIntent(query = '', conversationContext = null) {
  const q = normalizeAgriculturalText(query);
  if (!q) return null;

  const memory = conversationContext?.memory || {};
  const pending = conversationContext?.pendingFollowUp;
  const pendingReceivable = pending?.kind === 'intent' && pending.intent === 'receivable_follow_up';
  if (isAffirmativeFollowUp(query) && (memory.topReceivable || pendingReceivable)) {
    return DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP;
  }
  if (isAffirmativeFollowUp(query) && pending?.kind === 'intent' && pending.intent) {
    const map = {
      priorites_du_jour: DIRECTOR_INTENTS.PRIORITES_DU_JOUR,
      objectif_status: DIRECTOR_INTENTS.OBJECTIF_STATUS,
      farm_risks: DIRECTOR_INTENTS.RISQUES,
      farm_opportunities: DIRECTOR_INTENTS.OPPORTUNITES,
      farm_trends: DIRECTOR_INTENTS.TENDANCES,
      farm_comparisons: DIRECTOR_INTENTS.COMPARAISONS,
      money_leaks: DIRECTOR_INTENTS.MONEY_LEAKS,
      comment_va_la_ferme: DIRECTOR_INTENTS.COMMENT_VA_LA_FERME,
    };
    if (map[pending.intent]) return map[pending.intent];
  }
  if (memory.topReceivable && (CLIENT_FOLLOW_UP.test(q) || NAME_FOLLOW_UP.test(q))) {
    return DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP;
  }
  if (/^quel(le)?s? client/.test(q) && (
    memory.topReceivable
    || ['receivables', 'relances', 'creances', 'receivable_detail', 'follow_up', 'receivable_follow_up'].includes(conversationContext?.lastIntent)
  )) {
    return DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP;
  }

  if (/comment evolue|evolution exploitation|tendance|dynamique exploitation|en hausse ou en baisse/.test(q)) {
    return DIRECTOR_INTENTS.TENDANCES;
  }
  if (/compar|par rapport au mois|par rapport a la semaine|versus|vs mois|semaine precedente|mois precedent|mois dernier/.test(q)) {
    return DIRECTOR_INTENTS.COMPARAISONS;
  }
  if (/quels risques|mes risques|principal risque|risque principal|plus gros risque|quel risque|points de vigilance/.test(q)) {
    return DIRECTOR_INTENTS.RISQUES;
  }
  if (/opportunite|quoi vendre|que vendre|que puis je vendre|puis je vendre|ecouler/.test(q)) {
    return DIRECTOR_INTENTS.OPPORTUNITES;
  }
  if (/perdre de l argent|fait perdre|fuite financiere|fuite d argent|detruit ma marge|postes de perte|ou je perds|où je perds|pertes financieres|je perds de l argent/.test(q)) {
    return DIRECTOR_INTENTS.MONEY_LEAKS;
  }

  if (/comment va (la ferme|l exploitation|mon exploitation)|situation globale|etat global/.test(q)) {
    return DIRECTOR_INTENTS.COMMENT_VA_LA_FERME;
  }
  if (/quelles priorit|quelle priorit|^priorites\?*$|^priorite\?*$|que faire aujourd|que dois je faire|par quoi commencer|urgences/.test(q)) {
    return DIRECTOR_INTENTS.PRIORITES_DU_JOUR;
  }
  if (/objectif.*atteint|objectif mensuel|objectif annuel|suis je en avance|en avance ou en retard|avance ou en retard|en avance sur l objectif|où j en suis|ou j en suis|avancement objectif/.test(q)) {
    return DIRECTOR_INTENTS.OBJECTIF_STATUS;
  }

  return null;
}

/** COMMENT_VA_LA_FERME - synthèse conseil multi-domaines. */
export function buildCommentVaLaFermeAnswer(dataMap = {}) {
  return buildCommentVaLaFermeConseilAnswer(dataMap);
}

/** PRIORITÉS_DU_JOUR - top 3 actions classées par impact + tendance. */
export function buildPrioritesDuJourAnswer(dataMap = {}) {
  return buildPrioritesConseilAnswer(dataMap);
}

/** OBJECTIF_STATUS - objectifs sans détour par les créances. */
export function buildObjectifStatusAnswer(dataMap = {}, query = '') {
  const snap = buildDirectorSnapshot(dataMap);
  const goals = resolveCanonicalGoalProgress(dataMap);
  const q = normalizeAgriculturalText(query);
  const {
    monthTarget, monthRealized, monthPct, commercial,
  } = snap;
  const hasMonthlyGoal = goals.hasMonthlyGoal || monthTarget > 0;
  const effectiveMonthPct = monthPct ?? goals.monthPct;
  const effectiveMonthTarget = monthTarget || goals.monthTarget;
  const effectiveMonthRealized = monthRealized || goals.monthRealized;

  const annualTarget = goals.annualTarget;
  const annualRealized = goals.annualRealized;
  const annualPct = goals.annualPct;

  const focusAnnual = /annuel|annee|année|finir l annee/.test(q);
  const focusAdvance = /en avance|en retard|avance ou en retard|avance|retard/.test(q);

  let situation;
  let cause;
  let action;

  if (focusAnnual && annualTarget > 0) {
    situation = `Votre objectif annuel est atteint à ${annualPct} % (${fmtCurrency(annualRealized)} sur ${fmtCurrency(annualTarget)}).`;
    if (annualPct != null && annualPct < 70) {
      cause = 'Le rythme annuel reste en retard sur la cible.';
      action = 'Il faudrait accélérer les ventes sur le trimestre en cours.';
    } else if (annualPct != null && annualPct >= 100) {
      cause = 'Vous êtes en avance sur l\'objectif annuel.';
      action = 'Belle dynamique - consolidez la trésorerie pour la suite.';
    } else {
      cause = 'Vous progressez vers la cible annuelle.';
      action = 'Maintenez le rythme commercial actuel.';
    }
  } else if (hasMonthlyGoal && effectiveMonthPct != null) {
    situation = `Votre objectif mensuel est atteint à ${effectiveMonthPct} % (${fmtCurrency(effectiveMonthRealized)} sur ${fmtCurrency(effectiveMonthTarget)}).`;
    if (focusAdvance) {
      if (effectiveMonthPct >= 100) {
        cause = 'Vous êtes en avance sur l\'objectif du mois.';
        action = 'Vous pouvez sécuriser les encaissements et préparer la suite.';
      } else if (effectiveMonthPct < 50) {
        cause = 'Vous êtes en retard sur l\'objectif du mois.';
        action = 'Accélérez ventes et livraisons cette semaine.';
      } else {
        cause = 'Vous progressez vers la cible mensuelle, sans être encore en avance.';
        action = 'Quelques ventes supplémentaires vous mettraient sur la bonne trajectoire.';
      }
    } else if (effectiveMonthPct < 50) {
      cause = 'Le rythme commercial reste en retard sur la cible du mois.';
      action = 'Accélérez ventes et livraisons cette semaine.';
    } else if (effectiveMonthPct >= 100) {
      cause = 'L\'objectif mensuel est déjà atteint.';
      action = 'Consolidez le résultat et préparez le mois suivant.';
    } else {
      cause = 'Vous avancez vers l\'objectif mensuel.';
      action = 'Quelques ventes supplémentaires vous rapprocheraient de la cible.';
    }
  } else {
    situation = `Le chiffre d'affaires de la période est de ${fmtCurrency(commercial.ca)}.`;
    cause = 'Je n\'ai pas encore de cible mensuelle comparable sur cette période.';
    action = 'Vérifiez l\'objectif dans Objectifs & Croissance pour activer le suivi d\'avancement.';
  }

  return {
    title: 'Objectifs',
    intent: DIRECTOR_INTENTS.OBJECTIF_STATUS,
    situation,
    cause,
    action,
    sources: [],
    confidence: 94,
    meta: {},
  };
}

/** QUESTION_DE_SUIVI - détail client prioritaire après créances. */
export function buildReceivableFollowUpAnswer(dataMap = {}, conversationContext = null) {
  const memoryTop = conversationContext?.memory?.topReceivable;
  const snap = buildDirectorSnapshot(dataMap);
  const top = memoryTop || snap.topReceivable;

  if (!top?.clientName) {
    return {
      title: 'Créances',
      intent: DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP,
      situation: 'Je n\'ai pas de client prioritaire en mémoire pour l\'instant.',
      cause: '',
      action: 'Posez d\'abord « qui me doit de l\'argent ? » puis redemandez le client.',
      sources: [],
      confidence: 70,
      meta: {},
    };
  }

  return {
    title: 'Client prioritaire',
    intent: DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP,
    situation: `Le principal montant en attente concerne ${top.clientName}.`,
    cause: `La commande ${top.orderId} représente ${fmtCurrency(top.amount)}.`,
    action: 'Je vous suggère de le relancer aujourd\'hui.',
    sources: [],
    confidence: 97,
    meta: { topReceivable: top },
  };
}

export function buildDirectorEngineAnswer(intent = '', dataMap = {}, conversationContext = null, query = '') {
  switch (intent) {
    case DIRECTOR_INTENTS.COMMENT_VA_LA_FERME:
      return buildCommentVaLaFermeAnswer(dataMap);
    case DIRECTOR_INTENTS.PRIORITES_DU_JOUR:
      return buildPrioritesDuJourAnswer(dataMap);
    case DIRECTOR_INTENTS.OBJECTIF_STATUS:
      return buildObjectifStatusAnswer(dataMap, query);
    case DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP:
      return buildReceivableFollowUpAnswer(dataMap, conversationContext);
    case DIRECTOR_INTENTS.TENDANCES:
      return buildTendancesAnswer(dataMap);
    case DIRECTOR_INTENTS.COMPARAISONS:
      return buildComparaisonsAnswer(dataMap);
    case DIRECTOR_INTENTS.RISQUES:
      return buildRisquesAnswer(dataMap);
    case DIRECTOR_INTENTS.OPPORTUNITES:
      return buildOpportunitesAnswer(dataMap);
    case DIRECTOR_INTENTS.MONEY_LEAKS:
      return buildMoneyLeaksAnswer(dataMap);
    default:
      return null;
  }
}

export default {
  DIRECTOR_INTENTS,
  resolveDirectorIntent,
  buildCommentVaLaFermeAnswer,
  buildPrioritesDuJourAnswer,
  buildObjectifStatusAnswer,
  buildReceivableFollowUpAnswer,
  buildDirectorEngineAnswer,
};
