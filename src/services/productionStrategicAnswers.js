import { buildProductionCyclePlan } from './productionCyclePlanService.js';
import { buildStrategicInsights } from './aiStrategyService.js';
import { buildOperationalForecast } from './aiForecastService.js';
import { fmtCurrency, fmtNumber } from '../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();

export const PRODUCTION_QUESTIONS = [
  {
    id: 'new_chair_band',
    label: 'Quand lancer une bande chair ?',
    hint: '500 poussins · vente J+40 · roulement 15 j',
    activity: 'poulets_chair',
  },
  {
    id: 'new_layer_band',
    label: 'Quand ajouter une bande pondeuse ?',
    hint: '3 000 départ · 2ᵉ bande selon ponte réelle',
    activity: 'oeufs',
  },
  {
    id: 'reform_lot',
    label: 'Quand réformer un lot pondeuse ?',
    hint: 'Taux de ponte · règle 75% / 14 j',
    activity: 'oeufs',
  },
  {
    id: 'bovine_cycle',
    label: 'Quand acheter ou vendre des bœufs ?',
    hint: '5 têtes/mois · vente J+90',
    activity: 'bovins',
  },
  {
    id: 'feed_autonomy',
    label: 'Ai-je assez d\'aliment ?',
    hint: 'Autonomie stock · alerte < 15 j',
    activity: 'stock',
  },
  {
    id: 'egg_gap',
    label: 'Vais-je manquer d\'œufs ?',
    hint: 'Ponte vs objectif BP',
    activity: 'oeufs',
  },
];

function matchQuery(text, patterns) {
  const q = low(text);
  return patterns.some((p) => (typeof p === 'string' ? q.includes(p) : p.test(q)));
}

export function detectProductionQuestion(text = '') {
  if (matchQuery(text, [/nouvelle bande/, /nouvelle bande chair/, /lancer.*bande/, /bande chair/, /500 poussin/, /quand.*chair/, /poulet.*chair.*bande/])) return 'new_chair_band';
  if (matchQuery(text, [/bande pondeuse/, /pondeuse.*bande/, /ajouter.*pondeuse/, /2e bande/, /deuxieme bande/, /deuxième bande/, /quand.*pondeuse/])) return 'new_layer_band';
  if (matchQuery(text, [/reform/, /réform/, /retirer.*lot/, /lot.*fin/, /pondeuse.*vieill/])) return 'reform_lot';
  if (matchQuery(text, [/bovin/, /bœuf/, /embouche/, /acheter.*boeuf/, /vendre.*boeuf/, /5 tetes/, /5 têtes/])) return 'bovine_cycle';
  if (matchQuery(text, [/aliment.*suffis/, /assez.*aliment/, /autonomie.*aliment/, /rupture.*aliment/, /stock.*aliment/])) return 'feed_autonomy';
  if (matchQuery(text, [/manquer.*oeuf/, /manquer.*œuf/, /rupture.*oeuf/, /continuite.*oeuf/, /objectif.*oeuf/])) return 'egg_gap';
  return null;
}

function forecastContext(dataMap = {}) {
  return buildOperationalForecast({
    stocks: arr(dataMap.stock || dataMap.stocks),
    alimentationLogs: arr(dataMap.alimentation_logs || dataMap.alimentationLogs),
    productionLogs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    salesOrders: arr(dataMap.sales_orders || dataMap.salesOrders),
    payments: arr(dataMap.payments),
    transactions: arr(dataMap.finances || dataMap.transactions),
    horizonDays: 30,
  });
}

export function buildProductionAnswer(type, dataMap = {}) {
  const lots = arr(dataMap.lots || dataMap.avicole);
  const animaux = arr(dataMap.animaux);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const plan = buildProductionCyclePlan({ ...dataMap, lots, animaux, productionLogs });
  const forecast = forecastContext(dataMap);

  switch (type) {
    case 'new_chair_band': {
      const chair = plan.chair || {};
      const next = chair.ramp?.[0];
      return {
        type,
        title: 'Lancer une bande chair',
        summary: chair.summary || 'Démarrer par 500 poussins, vendre à J+40, puis installer le roulement.',
        recommendation: next?.action || 'Acheter 500 poussins et enregistrer le lot avec sa date d\'entrée.',
        targetDate: next?.launchDate || chair.firstSaleDate,
        rows: (chair.ramp || []).slice(0, 4).map((row) => ({
          title: row.label,
          detail: `Lancement ${row.launchDate} · vente ${row.expectedSaleDate}`,
          value: `${fmtNumber(row.placementQty)} sujets`,
        })),
        priority: 'haute',
        confidence: 88,
        route: 'elevage',
        module: 'avicole',
      };
    }
    case 'new_layer_band': {
      const layers = plan.pondeuses || {};
      const nextBand = layers.recommendedNextBandSize || 0;
      return {
        type,
        title: 'Ajouter une bande pondeuse',
        summary: layers.summary || 'La 2ᵉ bande se décide selon le taux de ponte réel et la demande clients.',
        recommendation: nextBand > 0
          ? `Bande complémentaire conseillée : ${fmtNumber(nextBand)} pondeuses pour couvrir l'objectif BP.`
          : 'Surveille la ponte 14 jours : si le taux reste sous l\'objectif BP, planifie une bande complémentaire.',
        targetDate: layers.bands?.[1]?.launchDate,
        rows: [
          { title: 'Pondeuses actives', detail: 'Lots + effectifs réels', value: fmtNumber(layers.currentLayers || 0) },
          { title: 'Œufs / jour visés', detail: 'Objectif business plan', value: `${fmtNumber(layers.targetEggsDay)}/j` },
          { title: 'Taux ponte observé', detail: 'Production / effectif', value: `${layers.observedLayingRate || 0}%` },
          { title: 'Bande conseillée', detail: nextBand > 0 ? 'Écart objectif détecté' : 'Attendre plus de données', value: fmtNumber(nextBand) },
        ],
        priority: nextBand > 0 ? 'haute' : 'moyenne',
        confidence: 90,
        route: 'elevage',
        module: 'avicole',
      };
    }
    case 'reform_lot': {
      const layers = plan.pondeuses || {};
      return {
        type,
        title: 'Réformer un lot pondeuse',
        summary: layers.reformRule || 'Réformer si le taux de ponte reste sous 75% pendant 14 jours.',
        recommendation: 'Compare ponte des 14 derniers jours au seuil BP. Réforme progressive lot par lot, pas d\'attente fixe à 17 mois.',
        rows: (layers.bands || []).slice(0, 3).map((band) => ({
          title: band.label,
          detail: `Entrée ${band.launchDate}`,
          value: band.reformWatchDate ? `Surveiller dès ${band.reformWatchDate}` : '—',
        })),
        priority: 'moyenne',
        confidence: 86,
        route: 'elevage',
        module: 'avicole',
      };
    }
    case 'bovine_cycle': {
      const bovins = plan.bovins || {};
      const next = bovins.cycles?.[0];
      return {
        type,
        title: 'Cycle bovins / embouche',
        summary: bovins.summary || '5 bovins/mois : M4 vend M1, puis vente/rachat mensuel.',
        recommendation: next?.action || 'Structurer l\'embouche : acheter 5 têtes ce mois si le pipeline est vide.',
        targetDate: next?.launchDate || next?.expectedSaleDate,
        rows: (bovins.cycles || []).slice(0, 4).map((row) => ({
          title: row.label || `Cycle ${row.month || ''}`,
          detail: `Achat ${row.launchDate || '—'} · vente ${row.expectedSaleDate || '—'}`,
          value: `${fmtNumber(row.qty || 5)} tête(s)`,
        })),
        priority: 'moyenne',
        confidence: 87,
        route: 'elevage',
        module: 'animaux',
      };
    }
    case 'feed_autonomy': {
      const days = forecast.feed?.autonomy_days;
      const insights = buildStrategicInsights({
        avicoleLots: lots,
        productionLogs,
        alimentationLogs: arr(dataMap.alimentation_logs || dataMap.alimentationLogs),
        stocks: arr(dataMap.stock || dataMap.stocks),
        salesOrders: arr(dataMap.sales_orders || dataMap.salesOrders),
        payments: arr(dataMap.payments),
        finances: arr(dataMap.finances || dataMap.transactions),
      });
      const feedDecision = (insights.decisions || []).find((d) => d.id === 'ia-stock-feed');
      return {
        type,
        title: 'Autonomie aliment',
        summary: days != null
          ? `Autonomie estimée : ${Math.round(days)} jour(s). ${days <= 15 ? 'Commander avant rupture.' : 'Stock confortable à court terme.'}`
          : 'Complète les stocks et les sorties aliment pour estimer l\'autonomie.',
        recommendation: feedDecision?.recommendation || 'Comparer fournisseurs et préparer la commande si autonomie < 15 jours.',
        rows: [
          { title: 'Autonomie', detail: 'Consommation / stock aliment', value: days != null ? `${Math.round(days)} j` : 'N/A' },
          { title: 'Coût / jour', detail: 'Alimentation', value: fmtCurrency(forecast.feed?.cost_per_day || 0) },
        ],
        priority: days != null && days <= 7 ? 'haute' : days != null && days <= 15 ? 'moyenne' : 'basse',
        confidence: 82,
        route: 'achats_stock',
        module: 'stock',
      };
    }
    case 'egg_gap': {
      const layers = plan.pondeuses || {};
      const sellable = forecast.eggs?.sellable_per_day || 0;
      const gap = Math.max(0, (layers.targetEggsDay || 0) - sellable);
      return {
        type,
        title: 'Continuité des œufs',
        summary: gap > 0
          ? `Écart estimé : ${fmtNumber(gap)} œufs/jour sous l'objectif BP (${fmtNumber(layers.targetEggsDay)}/j visés).`
          : `Production vendable ~${fmtNumber(sellable)}/j — alignée ou au-dessus de l'objectif.`,
        recommendation: gap > 0
          ? 'Vérifier ponte, mortalité et alimentation. Envisager bande complémentaire ou réforme ciblée.'
          : 'Maintenir biosécurité et alimentation. Pas de rupture prévue à court terme.',
        rows: [
          { title: 'Objectif BP', detail: 'Œufs vendables / jour', value: `${fmtNumber(layers.targetEggsDay)}/j` },
          { title: 'Estimation actuelle', detail: 'Projection 30 j', value: `${fmtNumber(sellable)}/j` },
          { title: 'Bande conseillée', detail: 'Si écart persistant', value: fmtNumber(layers.recommendedNextBandSize || 0) },
        ],
        priority: gap > 500 ? 'haute' : gap > 0 ? 'moyenne' : 'basse',
        confidence: 84,
        route: 'elevage',
        module: 'avicole',
      };
    }
    default:
      return null;
  }
}

export function isProductionPilotageQuery(text = '') {
  return Boolean(detectProductionQuestion(text));
}
