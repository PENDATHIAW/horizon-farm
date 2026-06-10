import { fmtCurrency, fmtNumber, toNumber } from './format.js';
import { getRealCultureRows } from '../modules/CulturesTabActionsBridge.jsx';

const costOf = (row = {}) => toNumber(row.cout_total_reel ?? row.budget_prevu);
const revenueOf = (row = {}) => toNumber(row.revenu_reel ?? row.revenu_estime);
const qtyOf = (row = {}) => toNumber(row.quantite_recoltee ?? row.quantite_disponible);

export function buildCulturesChartNarratives(rows = []) {
  const cultures = getRealCultureRows(rows);
  if (!cultures.length) return ['Aucune culture enregistrée — les courbes s’afficheront après création de parcelles et cultures.'];

  const totalMargin = cultures.reduce((sum, row) => sum + revenueOf(row) - costOf(row), 0);
  const totalHarvest = cultures.reduce((sum, row) => sum + qtyOf(row), 0);
  const avgYield = cultures.filter((r) => qtyOf(r) > 0).length
    ? totalHarvest / cultures.filter((r) => qtyOf(r) > 0).length
    : 0;
  const best = [...cultures].sort((a, b) => revenueOf(b) - costOf(b) - (revenueOf(a) - costOf(a)))[0];
  const bestName = best?.nom || best?.type || best?.id || '—';

  const lines = [];
  if (totalMargin >= 0) {
    lines.push(`Marge brute technique agrégée : ${fmtCurrency(totalMargin)} sur la période affichée.`);
  } else {
    lines.push(`Marge négative : ${fmtCurrency(totalMargin)} — compléter intrants et revenus fiche.`);
  }
  if (avgYield > 0) {
    lines.push(`Rendement moyen récolté : ${fmtNumber(avgYield)} unités par culture avec production.`);
  }
  if (best && revenueOf(best) > 0) {
    lines.push(`Performance la plus favorable : ${bestName} (${fmtCurrency(revenueOf(best) - costOf(best))} de marge technique).`);
  }
  return lines;
}
