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

  const grossMargin = activityPnl?.totals?.grossMargin;
  const revenue = activityPnl?.totals?.revenue || 0;
  const marginRate = revenue > 0 && grossMargin != null ? (grossMargin / revenue) * 100 : null;

  return [
    {
      id: 'laying',
      label: 'Taux de ponte',
      value: layingRateLabel,
      tone: layingRateCalculable ? 'good' : 'warn',
    },
    {
      id: 'ic',
      label: 'IC global (€/kg)',
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
      value: `${Math.round(feedCost).toLocaleString('fr-FR')} F`,
      tone: 'warn',
    },
    {
      id: 'profitability',
      label: 'Rentabilité globale',
      value: grossMargin != null ? `${fmtCurrency(grossMargin)}${marginRate != null ? ` (${fmtPercent(marginRate)})` : ''}` : '-',
      tone: grossMargin > 0 ? 'good' : grossMargin != null ? 'warn' : 'neutral',
    },
  ];
}
