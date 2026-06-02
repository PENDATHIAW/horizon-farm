import { buildPondeusesIntelligence } from './aiPondeusesService';
import { buildOperationalForecast } from './aiForecastService';
import { detectFarmAnomalies } from './aiAnomalyService';
import { analyzeMarketPrices } from './aiMarketService';

const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const money = (value = 0) => Math.round(Number(value || 0));

const addDecision = (list, decision) => {
  list.push({
    id: decision.id || `strategy-${list.length + 1}-${Date.now()}`,
    priority: decision.priority || 'moyenne',
    axis: decision.axis || 'general',
    title: decision.title,
    summary: decision.summary,
    recommendation: decision.recommendation,
    expected_impact: decision.expected_impact || null,
    confidence_score: decision.confidence_score ?? 65,
    supporting_data: decision.supporting_data || {},
    created_at: new Date().toISOString(),
  });
};

const marketEventBoost = (marketCalendarEvents = []) => {
  const now = new Date();

  return asRows(marketCalendarEvents).find((event) => {
    const start = event.starts_at ? new Date(event.starts_at) : null;
    const end = event.ends_at ? new Date(event.ends_at) : null;

    if (!start || !end) return false;

    return now >= start && now <= end;
  });
};

const normalizeForecasts = (forecast = {}) => {
  const feed = forecast.feed || {};
  const eggs = forecast.eggs || {};
  const cash = forecast.cash || {};

  return {
    ...forecast,
    feed: {
      available_qty: feed.available_qty || 0,
      consumption_per_day: feed.consumption_per_day || 0,
      autonomy_days: feed.autonomy_days ?? null,
      cost_per_day: feed.cost_per_day || 0,
      ...feed,
    },
    eggs: {
      production_per_day: eggs.production_per_day || 0,
      broken_per_day: eggs.broken_per_day || 0,
      sellable_per_day: eggs.sellable_per_day || 0,
      projected_sellable_eggs: eggs.projected_sellable_eggs || 0,
      projected_tablets:
        eggs.projected_tablets ??
        ((eggs.projected_sellable_eggs || 0) / 30),
      ...eggs,
    },
    cash: {
      sales_per_day: cash.sales_per_day || 0,
      payments_per_day: cash.payments_per_day || 0,
      expenses_per_day: cash.expenses_per_day || 0,
      projected_sales: cash.projected_sales || 0,
      projected_payments: cash.projected_payments || 0,
      projected_expenses: cash.projected_expenses || 0,
      projected_cash_balance: cash.projected_cash_balance || 0,
      ...cash,
    },
  };
};

const normalizeAnomalies = (anomalies = {}) => ({
  count: anomalies.count || asRows(anomalies.anomalies).length || 0,
  urgence_count: anomalies.urgence_count || 0,
  critique_count: anomalies.critique_count || 0,
  warning_count: anomalies.warning_count || 0,
  anomalies: asRows(anomalies.anomalies),
  ...anomalies,
});

export const buildStrategicInsights = ({
  avicoleLots = [],
  animaux = [],
  opportunities = [],
  cultures = [],
  vaccins = [],
  productionLogs = [],
  alimentationLogs = [],
  stocks = [],
  marketPrices = [],
  marketCalendarEvents = [],
  salesOrders = [],
  payments = [],
  finances = [],
  smartfarmEvents = [],
  sensors = [],
  cameras = [],
  meteo = null,
} = {}) => {
  const decisions = [];

  const pondeuses = buildPondeusesIntelligence({
    lots: avicoleLots,
    productionLogs,
    alimentationLogs,
    stocks,
    marketPrices,
    meteo,
  });

  const forecasts = normalizeForecasts(
    buildOperationalForecast({
      stocks,
      alimentationLogs,
      productionLogs,
      salesOrders,
      payments,
      transactions: finances,
      horizonDays: 30,
    })
  );

  const anomalies = normalizeAnomalies(
    detectFarmAnomalies({
      stocks,
      lots: avicoleLots,
      productionLogs,
      alimentationLogs,
      transactions: finances,
      payments,
      sensors,
      cameras,
      smartfarmEvents,
    })
  );

  const eggMarket = analyzeMarketPrices({
    marketPrices,
    category: 'oeufs',
    productQuery: 'tablette oeufs',
  });

  const feedMarket = analyzeMarketPrices({
    marketPrices,
    category: 'aliment_pondeuse',
    productQuery: 'aliment pondeuse',
  });

  const seasonalEvent = marketEventBoost(marketCalendarEvents);

  const bestLot = [...asRows(pondeuses.lots)].sort(
    (a, b) => Number(b.estimated_margin_per_tablet || 0) - Number(a.estimated_margin_per_tablet || 0)
  )[0];

  if (bestLot && Number(bestLot.estimated_margin_per_tablet || 0) > 0) {
    addDecision(decisions, {
      id: 'ia-pondeuses',
      priority: Number(bestLot.estimated_margin_per_tablet || 0) > 500 ? 'haute' : 'moyenne',
      axis: 'croissance',
      title: 'Renforcer les pondeuses rentables',
      summary: `${bestLot.lot_name} présente la meilleure marge estimée par tablette.`,
      recommendation: 'Prioriser les lots performants, la biosécurité et la continuité alimentaire.',
      expected_impact: `Marge estimée ${money(bestLot.estimated_margin_per_tablet)} FCFA/tablette.`,
      confidence_score: 75,
      supporting_data: bestLot,
    });
  }

  if (forecasts.feed.autonomy_days !== null && forecasts.feed.autonomy_days <= 15) {
    addDecision(decisions, {
      id: 'ia-stock-feed',
      priority: forecasts.feed.autonomy_days <= 7 ? 'critique' : 'haute',
      axis: 'stock',
      title: 'Sécuriser rapidement l’aliment',
      summary: `Autonomie estimée ${Math.round(forecasts.feed.autonomy_days)} jour(s).`,
      recommendation: 'Comparer les prix du marché, négocier le transport et préparer la commande avant rupture.',
      expected_impact: 'Éviter baisse de ponte et achat en urgence.',
      confidence_score: 80,
      supporting_data: forecasts.feed,
    });
  }

  if (eggMarket.best && bestLot) {
    const marketPrice = Number(eggMarket.best.effective_price || 0);
    const estimatedCost = Number(bestLot.cost_per_tablet || 0);

    if (marketPrice > estimatedCost * 1.25) {
      addDecision(decisions, {
        id: 'ia-egg-market',
        priority: 'moyenne',
        axis: 'vente',
        title: 'Fenêtre favorable de vente œufs',
        summary: `Prix marché observé ${money(marketPrice)} FCFA pour un coût estimé ${money(estimatedCost)} FCFA/tablette.`,
        recommendation: 'Augmenter la cadence commerciale, sécuriser les emballages et cibler les clients solvables.',
        expected_impact: 'Amélioration potentielle de la marge.',
        confidence_score: 72,
        supporting_data: eggMarket.best,
      });
    }
  }

  if (feedMarket.spread_rate >= 10) {
    addDecision(decisions, {
      id: 'ia-feed-market',
      priority: 'haute',
      axis: 'achat',
      title: 'Opportunité de négociation fournisseurs',
      summary: `Écart prix estimé ${Math.round(feedMarket.spread_rate)}% sur aliment pondeuse.`,
      recommendation: 'Comparer les devis récents et négocier les meilleures conditions avant achat massif.',
      expected_impact: 'Réduction du coût alimentation.',
      confidence_score: 70,
      supporting_data: {
        best: feedMarket.best,
        highest: feedMarket.highest,
      },
    });
  }

  if (forecasts.cash.projected_cash_balance < 0) {
    addDecision(decisions, {
      id: 'ia-cash',
      priority: 'critique',
      axis: 'tresorerie',
      title: 'Tension de trésorerie prévisible',
      summary: `Projection négative ${money(forecasts.cash.projected_cash_balance)} FCFA sur 30 jours.`,
      recommendation: 'Relancer les paiements, ralentir les dépenses non critiques et accélérer les ventes rentables.',
      expected_impact: 'Stabilisation du cash-flow.',
      confidence_score: 82,
      supporting_data: forecasts.cash,
    });
  }

  if (anomalies.critique_count > 0 || anomalies.urgence_count > 0) {
    addDecision(decisions, {
      id: 'ia-risks',
      priority: 'critique',
      axis: 'risque',
      title: 'Risque opérationnel critique détecté',
      summary: `${anomalies.urgence_count} urgence(s), ${anomalies.critique_count} anomalie(s) critique(s).`,
      recommendation: 'Traiter en priorité la sécurité, la mortalité, les stocks critiques et les équipements hors ligne.',
      expected_impact: 'Réduction des pertes et incidents.',
      confidence_score: 85,
      supporting_data: anomalies,
    });
  }

  if (seasonalEvent) {
    const eventName = seasonalEvent.name || 'événement marché';
    const effect = normalizeText(seasonalEvent.expected_effect || '');

    addDecision(decisions, {
      id: `ia-season-${seasonalEvent.id || eventName}`,
      priority: 'moyenne',
      axis: 'saisonnier',
      title: `Stratégie ${eventName}`,
      summary: `Événement marché actif détecté : ${eventName}.`,
      recommendation: effect.includes('hausse')
        ? 'Renforcer la préparation commerciale, le stock et la capacité de livraison.'
        : 'Adapter progressivement les achats et le rythme de production.',
      expected_impact: 'Meilleure anticipation du marché saisonnier.',
      confidence_score: 65,
      supporting_data: seasonalEvent,
    });
  }

  if (!decisions.length) {
    addDecision(decisions, {
      id: 'ia-data',
      priority: 'basse',
      axis: 'pilotage',
      title: 'Données insuffisantes pour arbitrage avancé',
      summary: 'Le moteur stratégique manque encore de données fiables ou récentes.',
      recommendation: 'Continuer la saisie production, ventes, finances, prix marché et Smart Farm.',
      expected_impact: 'Amélioration progressive de la précision IA.',
      confidence_score: 40,
    });
  }

  const strategicScore = Math.max(
    0,
    Math.min(
      100,
      50 +
        (bestLot?.estimated_margin_per_tablet > 0 ? 15 : -10) +
        (forecasts.cash.projected_cash_balance > 0 ? 15 : -15) +
        (anomalies.critique_count === 0 ? 10 : -10) +
        (forecasts.feed.autonomy_days > 15 ? 10 : -10)
    )
  );

  decisions.sort((a, b) => {
    const priorities = {
      critique: 0,
      haute: 1,
      moyenne: 2,
      basse: 3,
    };

    return (priorities[a.priority] ?? 9) - (priorities[b.priority] ?? 9);
  });

  return {
    generated_at: new Date().toISOString(),
    strategic_score: strategicScore,
    pondeuses,
    forecasts,
    anomalies,
    decisions,
  };
};

export default buildStrategicInsights;