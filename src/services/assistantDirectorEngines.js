/**
 * Moteurs dirigeant V6.1 — réponses de directeur d'exploitation.
 * COMMENT_VA_LA_FERME · PRIORITÉS_DU_JOUR · OBJECTIF_STATUS · QUESTION_DE_SUIVI
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';
import { fmtCurrency } from '../utils/format.js';
import { buildDirectorSnapshot } from './assistantDirectorSnapshot.js';

const n = (v) => Number(v || 0);

export const DIRECTOR_INTENTS = Object.freeze({
  COMMENT_VA_LA_FERME: 'comment_va_la_ferme',
  PRIORITES_DU_JOUR: 'priorites_du_jour',
  OBJECTIF_STATUS: 'objectif_status',
  RECEIVABLE_FOLLOW_UP: 'receivable_follow_up',
});

const CLIENT_FOLLOW_UP = /^(quel|quelle|lequel|laquelle)(s)?\s+(client|clients?)\??$/;
const NAME_FOLLOW_UP = /^(son nom|le nom|qui c est|c est qui)\??$/;

/**
 * Détecte une intention dirigeant (prioritaire sur salutations / créances génériques).
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

/** COMMENT_VA_LA_FERME — synthèse multi-domaines. */
export function buildCommentVaLaFermeAnswer(dataMap = {}) {
  const snap = buildDirectorSnapshot(dataMap);
  const {
    commercial, stockSummary, receivableRows, monthPct, elevageAlerts,
  } = snap;

  const ca = n(commercial.ca);
  const receivableCount = receivableRows.length || n(commercial.unpaidOrders);
  const lowStock = n(stockSummary.lowStockCount);
  const lotWatch = elevageAlerts.length > 0;

  const paragraphs = ['Dans l\'ensemble, la ferme fonctionne correctement.'];

  if (ca > 0) {
    paragraphs.push(`Le chiffre d'affaires atteint actuellement ${fmtCurrency(ca)}.`);
  }

  if (lowStock === 0) {
    paragraphs.push('Les stocks sont disponibles sans rupture.');
  } else {
    paragraphs.push(`${lowStock} produit${lowStock > 1 ? 's' : ''} approche${lowStock > 1 ? 'nt' : ''} d'un seuil bas — à surveiller.`);
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

  return {
    title: 'Vue ferme',
    intent: DIRECTOR_INTENTS.COMMENT_VA_LA_FERME,
    situation: paragraphs.join('\n\n'),
    cause: '',
    action: receivableCount > 0 ? 'Si vous voulez, je peux détailler le client le plus urgent.' : '',
    sources: [],
    confidence: 96,
    meta: {
      topReceivable: snap.topReceivable ? {
        clientName: snap.topReceivable.clientName,
        amount: snap.topReceivable.amount,
        orderId: snap.topReceivable.orderId,
        delayDays: snap.topReceivable.delayDays,
      } : null,
    },
  };
}

/** PRIORITÉS_DU_JOUR — top 3 actions classées par impact. */
export function buildPrioritesDuJourAnswer(dataMap = {}) {
  const snap = buildDirectorSnapshot(dataMap);
  const { commercial, receivableRows, monthPct, elevageAlerts, relanceRows, stockSummary } = snap;

  const receivableTotal = n(commercial.receivable);
  const receivableCount = receivableRows.length || n(commercial.unpaidOrders);
  const candidates = [];

  if (receivableTotal > 0) {
    candidates.push({
      impact: 100 + Math.min(receivableTotal / 100000, 20),
      text: `Relancer les ${receivableCount} créance${receivableCount > 1 ? 's' : ''} en attente (${fmtCurrency(receivableTotal)})`,
    });
  }

  if (elevageAlerts.length > 0) {
    const lotLabel = elevageAlerts[0]?.text || 'le lot sous surveillance';
    candidates.push({
      impact: 85,
      text: `Contrôler ${lotLabel.toLowerCase().includes('lot') ? lotLabel : 'le lot sous surveillance'}`,
    });
  }

  if (monthPct != null && monthPct < 80) {
    candidates.push({
      impact: 95 - monthPct,
      text: `Accélérer les ventes car l'objectif mensuel n'est atteint qu'à ${monthPct} %`,
    });
  }

  if (relanceRows.length > 0 && candidates.length < 3) {
    const urgent = relanceRows.find((row) => row.priority === 'Urgent') || relanceRows[0];
    if (urgent?.clientName) {
      candidates.push({
        impact: 70,
        text: `Relancer ${urgent.clientName}`,
      });
    }
  }

  if (n(stockSummary.lowStockCount) > 0 && candidates.length < 3) {
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

  const top3 = [...candidates]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  const lines = top3.map((item, index) => `${index + 1}. ${item.text}`);

  return {
    title: 'Priorités du jour',
    intent: DIRECTOR_INTENTS.PRIORITES_DU_JOUR,
    situation: `Aujourd'hui je vous conseille :\n\n${lines.join('\n\n')}`,
    cause: '',
    action: '',
    sources: [],
    confidence: 95,
    meta: {
      topReceivable: snap.topReceivable ? {
        clientName: snap.topReceivable.clientName,
        amount: snap.topReceivable.amount,
        orderId: snap.topReceivable.orderId,
        delayDays: snap.topReceivable.delayDays,
      } : null,
    },
  };
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
