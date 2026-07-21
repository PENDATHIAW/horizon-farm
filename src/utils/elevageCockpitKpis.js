import { fmtCurrency, fmtNumber, fmtPercent } from './format.js';

const n = (v) => Number(v || 0);

/** 6 KPI cockpit Résumé - performances & pilotage, pas registre. */
export function buildElevageCockpitKpis({
  layingRateLabel = '-',
  layingRateCalculable = false,
  productionSnapshot = {},
  activityPnl = {},
  feedCost = 0,
  recentMortality = 0,
  animals = [],
  lots = [],
} = {}) {
  const perf = productionSnapshot.performance || {};
  const icChair = perf.chairCostPerKgAvg || 0;
  const icBovin = perf.bovinCostPerKgAvg || 0;
  const icGlobal = icChair && icBovin ? (icChair + icBovin) / 2 : icChair || icBovin || 0;

  const herdValue = animals.reduce((s, a) => {
    const v = n(a.valeur_estimee ?? a.estimated_value ?? a.purchase_cost ?? a.cout_achat ?? a.prix_achat);
    return s + v;
  }, 0);
  const lotValue = lots.reduce((s, l) => s + n(l.valeur_estimee ?? l.estimated_value ?? l.cout_total ?? l.cost_total), 0);
  const herdValueTotal = herdValue + lotValue;

  // Marge réalisée sur ventes effectives (hors cheptel vivant non vendu et capital
  // pondeuses) : indicateur honnête pour un cycle en cours, contrairement au résultat
  // brut qui imputerait tout le capital investi au chiffre d'affaires déjà encaissé.
  const realizedMargin = activityPnl?.totals?.realizedMargin;
  const realizedRevenue = activityPnl?.totals?.realizedRevenue || 0;
  const marginRate = realizedRevenue > 0 && realizedMargin != null ? (realizedMargin / realizedRevenue) * 100 : null;

  return [
    {
      id: 'laying',
      label: 'Taux de ponte',
      value: layingRateLabel,
      tone: layingRateCalculable ? 'good' : 'warn',
    },
    {
      id: 'ic',
      label: 'Coût moyen (FCFA/kg)',
      value: icGlobal > 0 ? fmtCurrency(icGlobal) : '-',
      tone: icGlobal > 0 ? 'neutral' : 'warn',
    },
    {
      id: 'mortality',
      label: 'Mortalité (7 j)',
      value: fmtNumber(recentMortality),
      tone: recentMortality > 5 ? 'bad' : recentMortality > 0 ? 'warn' : 'good',
    },
    {
      id: 'herd_value',
      label: 'Valeur cheptel',
      value: herdValueTotal > 0 ? fmtCurrency(herdValueTotal) : '-',
      tone: herdValueTotal > 0 ? 'good' : 'warn',
    },
    {
      id: 'feed_cost',
      label: 'Coût alimentation',
      value: fmtCurrency(feedCost),
      tone: 'warn',
    },
    {
      id: 'profitability',
      label: 'Marge réalisée (ventes)',
      value: realizedMargin != null ? `${fmtCurrency(realizedMargin)}${marginRate != null ? ` (${fmtPercent(marginRate)})` : ''}` : '-',
      tone: realizedMargin > 0 ? 'good' : realizedMargin != null ? 'warn' : 'neutral',
    },
  ];
}
