/**
 * États vides Finance P1 — pas de faux diagnostics sur ferme sans données.
 * Les vérités canoniques P0 (cashNet, creancesReelles, payablesTotal, CMUP) restent inchangées.
 */

import { isFinanceStartupMode } from './financePilotageCore.js';

export const EMPTY_STATE_FINANCE_QA = `Je ne dispose pas encore de suffisamment de données financières.

Commencez par enregistrer :

• une première dépense
ou
• une première vente
ou
• un premier paiement

afin que je puisse produire une analyse fiable.`;

export const FINANCE_EMPTY_LABELS = Object.freeze({
  insufficient: 'Données insuffisantes',
  pending: 'En attente de données',
  notCalculable: 'Non calculable',
});

export function hasMinimumFinanceData(props = {}) {
  return !isFinanceStartupMode(props);
}

export function formatFinanceHealthScore({ score = null, insufficientData = false } = {}) {
  if (insufficientData || score == null) return FINANCE_EMPTY_LABELS.insufficient;
  return `${Math.round(score)}/100`;
}

export function financeHealthTone({ score = null, insufficientData = false } = {}) {
  if (insufficientData || score == null) return 'neutral';
  if (score >= 75) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

export function formatTreasuryRiskLabel({ forecastReady = false, risk = null } = {}) {
  if (!forecastReady || !risk) return FINANCE_EMPTY_LABELS.notCalculable;
  if (risk === 'high') return 'Élevé';
  if (risk === 'medium') return 'Moyen';
  return 'Faible';
}

export function treasuryRiskTone({ forecastReady = false, risk = null } = {}) {
  if (!forecastReady || !risk) return 'neutral';
  if (risk === 'high') return 'bad';
  if (risk === 'medium') return 'warn';
  return 'good';
}
