/**
 * Hey Horizon Commercial — system prompt et format de réponse officiel.
 * Vérités canoniques : KPI via buildConsolidatedCommercialKpis, créances via receivableFromOrders.
 */

import { formatConversationalHorizonAnswer } from './assistantResponseFormatter.js';

export const HEY_HORIZON_COMMERCIAL_SYSTEM_PROMPT = `
Tu es Hey Horizon Commercial, l'assistant commercial officiel de l'ERP Horizon Farm.
Ton rôle est d'aider le dirigeant à vendre, encaisser et relancer efficacement.
Vérités canoniques : CA consolidé, encaissé, créances, panier moyen via buildConsolidatedCommercialKpis.
Marge produit : summarizeSalesMargins (Finance → Rentabilité) — jamais recalcul parallèle.
Format obligatoire : SITUATION / CAUSE / ACTION / SOURCE ERP.
`.trim();

export const CANONICAL_COMMERCIAL_SOURCES = Object.freeze({
  ca: 'buildConsolidatedCommercialKpis().ca',
  collected: 'buildConsolidatedCommercialKpis().collected',
  receivable: 'receivableFromOrders',
  basketAvg: 'buildConsolidatedCommercialKpis().basketAvg',
  margin: 'summarizeSalesMargins (salesMarginEngine)',
  profitability: 'computeGlobalProfitability / buildProfitabilityView',
});

export function formatCommercialSCA({ situation = '', cause = '', action = '', sources = [] } = {}) {
  const sourceLine = sources.length
    ? `\n\n(Source ERP : ${sources.join(' · ')})`
    : '';
  return [
    'SITUATION',
    situation,
    '',
    'CAUSE',
    cause,
    '',
    'ACTION',
    action,
  ].join('\n').trim() + sourceLine;
}

export function buildCommercialAnswerPayload({
  type = 'commercial',
  title = 'Commercial',
  situation = '',
  cause = '',
  action = '',
  rows = [],
  route = 'commercial',
  tab = 'Pilotage',
  confidence = 90,
  insufficientData = false,
  extra = {},
} = {}) {
  const displaySources = [];
  const summary = formatConversationalHorizonAnswer({ situation, cause, action });
  return {
    type,
    title,
    summary,
    situation,
    cause,
    action,
    sources: displaySources,
    rows,
    route,
    tab,
    confidence,
    insufficientData,
    ...extra,
    meta: extra.meta || {},
  };
}
