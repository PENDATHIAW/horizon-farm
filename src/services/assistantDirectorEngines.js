/**
 * Moteurs dirigeant V6.1 + Conseiller V7.
 * COMMENT_VA_LA_FERME · PRIORITÉS · OBJECTIFS · SUIVI · TENDANCES · COMPARAISONS · RISQUES · OPPORTUNITÉS
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';
import { fmtCurrency } from '../utils/format.js';
import { buildDirectorSnapshot } from './assistantDirectorSnapshot.js';
import {
  buildCommentVaLaFermeConseilAnswer,
  buildPrioritesConseilAnswer,
  buildTendancesAnswer,
  buildComparaisonsAnswer,
  buildRisquesAnswer,
  buildOpportunitesAnswer,
} from './assistantFarmAdvisor.js';

const n = (v) => Number(v || 0);

export const DIRECTOR_INTENTS = Object.freeze({
  COMMENT_VA_LA_FERME: 'comment_va_la_ferme',
  PRIORITES_DU_JOUR: 'priorites_du_jour',
  OBJECTIF_STATUS: 'objectif_status',
  RECEIVABLE_FOLLOW_UP: 'receivable_follow_up',
  TENDANCES: 'farm_trends',
  COMPARAISONS: 'farm_comparisons',
  RISQUES: 'farm_risks',
  OPPORTUNITES: 'farm_opportunities',
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

  if (/comment va (la ferme|l exploitation|mon exploitation)|situation globale|etat global/.test(q)) {
    return DIRECTOR_INTENTS.COMMENT_VA_LA_FERME;
  }
  if (/quelles priorit|quelle priorit|^priorites\?*$|^priorite\?*$|que faire aujourd|que dois je faire|par quoi commencer|urgences/.test(q)) {
    return DIRECTOR_INTENTS.PRIORITES_DU_JOUR;
  }
  if (/objectif.*atteint|objectif mensuel|objectif annuel|suis je en avance|en avance sur l objectif|où j en suis|ou j en suis|avancement objectif/.test(q)) {
    return DIRECTOR_INTENTS.OBJECTIF_STATUS;
  }

  return null;
}

/** COMMENT_VA_LA_FERME — synthèse conseil multi-domaines. */
export function buildCommentVaLaFermeAnswer(dataMap = {}) {
  return buildCommentVaLaFermeConseilAnswer(dataMap);
}

/** PRIORITÉS_DU_JOUR — top 3 actions classées par impact + tendance. */
export function buildPrioritesDuJourAnswer(dataMap = {}) {
  return buildPrioritesConseilAnswer(dataMap);
}

/** OBJECTIF_STATUS — objectifs sans détour par les créances. */
export function buildObjectifStatusAnswer(dataMap = {}, query = '') {
  const snap = buildDirectorSnapshot(dataMap);
  const q = normalizeAgriculturalText(query);
  const {
    monthTarget, monthRealized, monthPct, commercial, growth,
  } = snap;

  const annualTarget = n(growth?.annualTarget ?? growth?.objectifAnnuel);
  const annualRealized = n(growth?.annualRealized ?? growth?.caAnnee ?? commercial.ca);
  const annualPct = annualTarget > 0 ? Math.round((annualRealized / annualTarget) * 100) : null;

  const focusAnnual = /annuel|annee|année|finir l annee/.test(q);
  const focusAdvance = /en avance|en retard|avance|retard/.test(q);

  let situation;
  let cause = '';
  let action = '';

  if (focusAnnual && annualTarget > 0) {
    situation = `Votre objectif annuel est atteint à ${annualPct} % (${fmtCurrency(annualRealized)} sur ${fmtCurrency(annualTarget)}).`;
    if (annualPct != null && annualPct < 70) {
      cause = 'Le rythme annuel reste en retard sur la cible.';
      action = 'Il faudrait accélérer les ventes sur le trimestre en cours.';
    } else if (annualPct != null && annualPct >= 100) {
      cause = 'Vous êtes en avance sur l\'objectif annuel.';
      action = 'Belle dynamique — consolidez la trésorerie pour la suite.';
    } else {
      cause = 'Vous progressez vers la cible annuelle.';
      action = 'Maintenez le rythme commercial actuel.';
    }
  } else if (monthTarget > 0 && monthPct != null) {
    situation = `Votre objectif mensuel est atteint à ${monthPct} % (${fmtCurrency(monthRealized)} sur ${fmtCurrency(monthTarget)}).`;
    if (focusAdvance) {
      if (monthPct >= 100) {
        cause = 'Vous êtes en avance sur l\'objectif du mois.';
        action = 'Vous pouvez sécuriser les encaissements et préparer la suite.';
      } else if (monthPct < 50) {
        cause = 'Vous êtes en retard sur l\'objectif du mois.';
        action = 'Accélérez ventes et livraisons cette semaine.';
      } else {
        cause = 'Vous progressez vers la cible mensuelle.';
        action = 'Quelques ventes supplémentaires vous mettraient sur la bonne trajectoire.';
      }
    } else if (monthPct < 50) {
      cause = 'Le rythme commercial reste en retard sur la cible du mois.';
      action = 'Accélérez ventes et livraisons cette semaine.';
    } else if (monthPct >= 100) {
      cause = 'L\'objectif mensuel est déjà atteint.';
      action = 'Consolidez le résultat et préparez le mois suivant.';
    } else {
      cause = 'Vous avancez vers l\'objectif mensuel.';
      action = 'Quelques ventes supplémentaires vous rapprocheraient de la cible.';
    }
  } else {
    situation = `Le chiffre d'affaires de la période est de ${fmtCurrency(commercial.ca)}.`;
    cause = 'Aucun objectif mensuel chiffré n\'est configuré pour comparer l\'avancement.';
    action = 'Définissez un objectif mensuel pour suivre votre progression.';
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

/** QUESTION_DE_SUIVI — détail client prioritaire après créances. */
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
