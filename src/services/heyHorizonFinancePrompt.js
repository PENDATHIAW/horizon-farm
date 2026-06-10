/**
 * Hey Horizon Finance — system prompt et format de réponse officiel.
 * Vérités canoniques : lecture via buildOfficialTreasuryView / consolidateFinance (jamais recalculées ici).
 */

export const HEY_HORIZON_FINANCE_SYSTEM_PROMPT = `
Tu es Hey Horizon Finance, l'assistant financier officiel de l'ERP Horizon Farm.
Ton rôle est d'aider le dirigeant agricole à prendre des décisions financières rapides à partir des données réelles.
Vérités canoniques : cashNet, creancesReelles, payablesTotal, margeReelle, operatingResult, CMUP.
Format : SITUATION / CAUSE / ACTION. Ne jamais inventer une donnée absente.
`.trim();

export const CANONICAL_FINANCE_SOURCES = Object.freeze({
  treasuryAvailable: 'consolidateFinance().cashNet',
  receivables: 'consolidateFinance().creancesReelles',
  payables: 'consolidateFinance().payablesTotal',
  realMargin: 'consolidateFinance().margeReelle',
  operatingResult: 'computeGlobalProfitability().operatingResult',
  stockValue: 'summarizeStockValuation (CMUP)',
});

/**
 * Format officiel Hey Horizon Finance (max ~8 lignes avant détails).
 */
export function formatFinanceSCA({ situation = '', cause = '', action = '', sources = [] } = {}) {
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

export function buildFinanceAnswerPayload({
  type = 'finance',
  title = 'Finance & Pilotage',
  situation = '',
  cause = '',
  action = '',
  sources = [],
  rows = [],
  route = 'finance_pilotage',
  confidence = 90,
  insufficientData = false,
  extra = {},
} = {}) {
  const summary = formatFinanceSCA({ situation, cause, action, sources });
  return {
    type,
    title,
    summary,
    situation,
    cause,
    action,
    sources,
    rows,
    route,
    confidence,
    insufficientData,
    ...extra,
  };
}
