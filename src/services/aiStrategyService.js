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

export const buildStrategicInsights = ({
  avicoleLots = [],
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

  const forecasts = buildOperationalForecast({
    stocks,
    alimentationLogs,
    productionLogs,
    salesOrders,
    payments,
    transactions: finances,
    horizonDays: 30,
  });

  const anomalies = detectFarmAnomalies({
    stocks,
    lots: avicoleLots,
    productionLogs,
    alimentationLogs,
    transactions: finances,
    payments,
    sensors,
    cameras,
    smartfarmEvents,
  });

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

  const bestLot = [...pondeuses.lots].sort((a, b) => b.estimated_margin_per_tablet - a.estimated_margin_per_tablet)[0];

  if (bestLot && bestLot.estimated_margin_per_tablet > 0) {
    addDecision(decisions, {
      priority: bestLot.estimated_margin_per_tablet > 500 ? 'haute' : 'moyenne',
      axis: 'croissance',
      title: 'Renforcer les pondeuses rentables',
      summary: `${bestLot.lot_name} presente la meilleure marge estimee par tablette.`,
      recommendation: 'Prioriser les lots performants, la biosécurité et la continuité alimentaire.',
      expected_impact: `Marge estimee ${money(bestLot.estimated_margin_per_tablet)} FCFA/tablette.`,
      confidence_score: 75,
      supporting_data: bestLot,
    });
  }

  if (forecasts.feed.autonomy_days !== null && forecasts.feed.autonomy_days <= 15) {
    addDecision(decisions, {
      priority: forecasts.feed.autonomy_days <= 7 ? 'critique' : 'haute',
      axis: 'stock',
      title: 'Securiser rapidement l aliment',
      summary: `Autonomie estimee ${Math.round(forecasts.feed.autonomy_days)} jour(s).`,
      recommendation: 'Comparer les prix du marche, negocier transport et preparer commande avant rupture.',
      expected_impact: 'Eviter baisse ponte et hausse cout urgence.',
      confidence_score: 80,
      supporting_data: forecasts.feed,
    });
  }

  if (eggMarket.best && bestLot) {
    const marketPrice = Number(eggMarket.best.effective_price || 0);
    const estimatedCost = Number(bestLot.cost_per_tablet || 0);

    if (marketPrice > estimatedCost * 1.25) {
      addDecision(decisions, {
        priority: 'moyenne',
        axis: 'vente',
        title: 'Fenetre favorable de vente oeufs',
        summary: `Prix marche observe ${money(marketPrice)} FCFA pour un cout estime ${money(estimatedCost)} FCFA/tablette.`,
        recommendation: 'Augmenter la cadence commerciale, securiser emballages et clients solvables.',
        expected_impact: 'Amelioration potentielle de la marge.',
        confidence_score: 72,
        supporting_data: eggMarket.best,
      });
    }
  }

  if (feedMarket.spread_rate >= 10) {
    addDecision(decisions, {
      priority: 'haute',
      axis: 'achat',
      title: 'Opportunite de negotiation fournisseurs',
      summary: `Ecart prix estime ${Math.round(feedMarket.spread_rate)}% sur aliment pondeuse.`,
      recommendation: 'Comparer les devis recents et negocier les meilleures conditions avant achat massif.',
      expected_impact: 'Reduction cout alimentation.',
      confidence_score: 70,
      supporting_data: {
        best: feedMarket.best,
        highest: feedMarket.highest,
      },
    });
  }

  if (forecasts.cash.projected_cash_balance < 0) {
    addDecision(decisions, {
      priority: 'critique',
      axis: 'tresorerie',
      title: 'Tension de tresorerie previsible',
      summary: `Projection negative ${money(forecasts.cash.projected_cash_balance)} FCFA sur 30 jours.`,
      recommendation: 'Relancer paiements, ralentir depenses non critiques et accelerer ventes rentables.',
      expected_impact: 'Stabilisation du cash-flow.',
      confidence_score: 82,
      supporting_data: forecasts.cash,
    });
  }

  if (anomalies.critique_count > 0 || anomalies.urgence_count > 0) {
    addDecision(decisions, {
      priority: 'critique',
      axis: 'risque',
      title: 'Risque operationnel critique detecte',
      summary: `${anomalies.urgence_count} urgence(s), ${anomalies.critique_count} anomalie(s) critique(s).`,
      recommendation: 'Traiter en priorite la securite, la mortalite, les stocks critiques et les equipements hors ligne.',
      expected_impact: 'Reduction pertes et incidents.',
      confidence_score: 85,
      supporting_data: anomalies,
    });
  }

  if (seasonalEvent) {
    const eventName = seasonalEvent.name || 'evenement marche';
    const effect = normalizeText(seasonalEvent.expected_effect || '');

    addDecision(decisions, {
      priority: 'moyenne',
      axis: 'saisonnier',
      title: `Strategie ${eventName}`,
      summary: `Evenement marche actif detecte: ${eventName}.`,
      recommendation: effect.includes('hausse')
        ? 'Renforcer preparation commerciale, stock et capacite livraison.'
        : 'Adapter progressivement les achats et le rythme de production.',
      expected_impact: 'Meilleure anticipation du marche saisonnier.',
      confidence_score: 65,
      supporting_data: seasonalEvent,
    });
  }

  if (!decisions.length) {
    addDecision(decisions, {
      priority: 'basse',
      axis: 'pilotage',
      title: 'Donnees insuffisantes pour arbitrage avance',
      summary: 'Le moteur strategique manque encore de donnees fiables ou recentes.',
      recommendation: 'Continuer la saisie production, ventes, finances, prix marche et Smart Farm.',
      expected_impact: 'Amelioration progressive de la precision IA.',
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
    const priorities = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
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
