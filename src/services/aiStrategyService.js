const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const norm = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.valeur_estimee ?? row.estimated_amount);
const qty = (row = {}) => num(row.quantite ?? row.quantity ?? row.qty ?? row.stock);
const dateOf = (row = {}) => {
  const raw = row.date || row.created_at || row.event_date || row.observed_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const recent = (rows, days = 30) => {
  const now = Date.now();
  return arr(rows).filter((row) => {
    const date = dateOf(row);
    if (!date) return false;
    return (now - date.getTime()) / (1000 * 60 * 60 * 24) <= days;
  });
};

const avgDaily = (rows, keys = ['quantite'], days = 30) => {
  const data = recent(rows, days);
  if (!data.length) return 0;
  const total = data.reduce((sum, row) => {
    const value = keys.map((key) => num(row[key])).find((v) => v > 0) || 0;
    return sum + value;
  }, 0);
  return total / Math.max(1, Math.min(days, data.length || days));
};

const isPondeuseLot = (lot = {}) => norm(`${lot.type || ''} ${lot.category || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`).includes('pondeuse');
const isFeedStock = (stock = {}) => norm(`${stock.produit || ''} ${stock.nom || ''} ${stock.categorie || ''} ${stock.category || ''} ${stock.type || ''}`).includes('aliment');

const buildPondeuses = ({ avicoleLots = [], productionLogs = [], alimentationLogs = [], marketPrices = [], meteo = null } = {}) => {
  const lots = arr(avicoleLots).filter(isPondeuseLot);
  const eggPrice = arr(marketPrices).find((p) => norm(p.product_category).includes('oeuf'));

  const analyses = lots.map((lot) => {
    const lotId = lot.id;
    const productions = arr(productionLogs).filter((p) => p.lot_id === lotId || p.cible_id === lotId || p.entity_id === lotId);
    const feeding = arr(alimentationLogs).filter((p) => p.lot_id === lotId || p.cible_id === lotId || p.entity_id === lotId);
    const eggs = productions.reduce((sum, row) => sum + (num(row.oeufs_produits) || num(row.oeufs) || qty(row) || num(row.total_oeufs)), 0);
    const broken = productions.reduce((sum, row) => sum + (num(row.oeufs_casses) || num(row.casses) || num(row.broken_eggs) || num(row.pertes)), 0);
    const sellable = Math.max(0, eggs - broken);
    const feedCost = feeding.reduce((sum, row) => sum + (num(row.montant_total) || num(row.cout_total) || amount(row)), 0);
    const currentCount = num(lot.current_count) || num(lot.effectif_actuel) || num(lot.initial_count) || num(lot.effectif_initial) || num(lot.quantity);
    const days = Math.max(1, productions.length || 1);
    const layingRate = currentCount > 0 ? (eggs / (currentCount * days)) * 100 : 0;
    const costPerEgg = sellable > 0 ? feedCost / sellable : 0;
    const costPerTablet = costPerEgg * 30;
    const suggestedTabletPrice = eggPrice?.price ? Math.max(num(eggPrice.price), costPerTablet * 1.25) : costPerTablet * 1.3;

    return {
      lot_id: lotId,
      lot_name: lot.name || lot.nom || lotId,
      current_count: currentCount,
      produced_eggs: eggs,
      broken_eggs: broken,
      sellable_eggs: sellable,
      tablets: sellable / 30,
      total_feed_cost: feedCost,
      laying_rate: layingRate,
      cost_per_egg: costPerEgg,
      cost_per_tablet: costPerTablet,
      suggested_tablet_price: suggestedTabletPrice,
      estimated_margin_per_tablet: suggestedTabletPrice - costPerTablet,
      alerts: [
        layingRate > 0 && layingRate < 65 ? 'Taux de ponte faible' : null,
        broken > eggs * 0.08 ? 'Taux de casse élevé' : null,
        num(meteo?.temp) >= 35 ? 'Chaleur élevée' : null,
      ].filter(Boolean),
    };
  });

  const totals = analyses.reduce((acc, row) => ({
    lots: acc.lots + 1,
    current_count: acc.current_count + row.current_count,
    produced_eggs: acc.produced_eggs + row.produced_eggs,
    sellable_eggs: acc.sellable_eggs + row.sellable_eggs,
    tablets: acc.tablets + row.tablets,
    total_feed_cost: acc.total_feed_cost + row.total_feed_cost,
  }), { lots: 0, current_count: 0, produced_eggs: 0, sellable_eggs: 0, tablets: 0, total_feed_cost: 0 });

  return {
    lots: analyses,
    totals: {
      ...totals,
      cost_per_egg: totals.sellable_eggs > 0 ? totals.total_feed_cost / totals.sellable_eggs : 0,
      cost_per_tablet: totals.sellable_eggs > 0 ? (totals.total_feed_cost / totals.sellable_eggs) * 30 : 0,
    },
  };
};

const buildForecasts = ({ stocks = [], alimentationLogs = [], productionLogs = [], salesOrders = [], payments = [], finances = [] } = {}) => {
  const feedAvailable = arr(stocks).filter(isFeedStock).reduce((sum, row) => sum + qty(row), 0);
  const feedDaily = avgDaily(alimentationLogs, ['quantite', 'quantity', 'qty'], 30);
  const feedCostDaily = avgDaily(alimentationLogs, ['montant_total', 'cout_total', 'total', 'montant', 'amount'], 30);
  const eggDaily = avgDaily(productionLogs, ['oeufs_produits', 'oeufs', 'quantite', 'quantity', 'total_oeufs'], 30);
  const brokenDaily = avgDaily(productionLogs, ['oeufs_casses', 'casses', 'broken_eggs', 'pertes'], 30);
  const sellableDaily = Math.max(0, eggDaily - brokenDaily);
  const salesDaily = avgDaily(salesOrders, ['total_ttc', 'total', 'montant', 'amount'], 30);
  const paymentsDaily = avgDaily(payments, ['montant_paye', 'paid_amount', 'amount', 'montant'], 30);
  const expenseDaily = Math.max(feedCostDaily, avgDaily(arr(finances).filter((row) => norm(`${row.type || ''} ${row.categorie || ''}`).includes('sortie') || norm(row.categorie).includes('depense')), ['montant', 'amount', 'total'], 30));

  return {
    feed: {
      available_qty: feedAvailable,
      consumption_per_day: feedDaily,
      autonomy_days: feedDaily > 0 ? feedAvailable / feedDaily : null,
      cost_per_day: feedCostDaily,
    },
    eggs: {
      production_per_day: eggDaily,
      broken_per_day: brokenDaily,
      sellable_per_day: sellableDaily,
      projected_sellable_eggs: sellableDaily * 30,
      projected_tablets: (sellableDaily * 30) / 30,
    },
    cash: {
      sales_per_day: salesDaily,
      payments_per_day: paymentsDaily,
      expenses_per_day: expenseDaily,
      projected_sales: salesDaily * 30,
      projected_payments: paymentsDaily * 30,
      projected_expenses: expenseDaily * 30,
      projected_cash_balance: (paymentsDaily * 30) - (expenseDaily * 30),
    },
  };
};

const buildAnomalies = ({ stocks = [], avicoleLots = [], smartfarmEvents = [], sensors = [], cameras = [] } = {}) => {
  const anomalies = [];
  arr(stocks).forEach((stock) => {
    const q = qty(stock);
    const seuil = num(stock.seuil ?? stock.threshold ?? stock.min_stock);
    if (seuil > 0 && q <= seuil) anomalies.push({ id: `stock-${stock.id}`, severity: q <= seuil / 2 ? 'critique' : 'warning', title: `Stock sous seuil: ${stock.produit || stock.nom || stock.id}`, summary: `${q} restant(s), seuil ${seuil}.` });
  });
  arr(avicoleLots).forEach((lot) => {
    const initial = num(lot.initial_count) || num(lot.effectif_initial) || num(lot.quantity);
    const mortality = num(lot.mortality) || num(lot.morts);
    if (initial > 0 && mortality > initial * 0.04) anomalies.push({ id: `lot-${lot.id}`, severity: 'critique', title: `Mortalité élevée: ${lot.name || lot.nom || lot.id}`, summary: `${mortality} morts sur ${initial} sujets.` });
  });
  arr(smartfarmEvents).forEach((event) => {
    const type = norm(event.event_type);
    if (type.includes('intrusion') || type.includes('humain')) anomalies.push({ id: `event-${event.id}`, severity: 'urgence', title: `Intrusion détectée: ${event.zone || 'zone'}`, summary: event.message || 'Présence humaine ou mouvement suspect.' });
  });
  [...arr(sensors), ...arr(cameras)].forEach((device) => {
    const st = norm(device.status || device.etat);
    if (st.includes('offline') || st.includes('hors ligne') || st.includes('panne')) anomalies.push({ id: `device-${device.id}`, severity: 'warning', title: `Appareil hors ligne: ${device.name || device.nom || device.id}`, summary: 'Vérifier alimentation, réseau ou batterie.' });
  });

  return {
    count: anomalies.length,
    urgence_count: anomalies.filter((a) => a.severity === 'urgence').length,
    critique_count: anomalies.filter((a) => a.severity === 'critique').length,
    warning_count: anomalies.filter((a) => a.severity === 'warning').length,
    anomalies,
  };
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
  const pondeuses = buildPondeuses({ avicoleLots, productionLogs, alimentationLogs, marketPrices, meteo });
  const forecasts = buildForecasts({ stocks, alimentationLogs, productionLogs, salesOrders, payments, finances });
  const anomalies = buildAnomalies({ stocks, avicoleLots, smartfarmEvents, sensors, cameras });
  const decisions = [];

  const bestLot = [...pondeuses.lots].sort((a, b) => b.estimated_margin_per_tablet - a.estimated_margin_per_tablet)[0];
  if (bestLot?.estimated_margin_per_tablet > 0) decisions.push({ id: 'ia-pondeuses', priority: 'haute', axis: 'croissance', title: 'Renforcer les pondeuses rentables', summary: `${bestLot.lot_name} présente la meilleure marge estimée.`, recommendation: 'Sécuriser aliment, eau, biosécurité et clients solvables.', expected_impact: `${Math.round(bestLot.estimated_margin_per_tablet)} FCFA/tablette`, confidence_score: 72 });
  if (forecasts.feed.autonomy_days !== null && forecasts.feed.autonomy_days <= 15) decisions.push({ id: 'ia-stock-feed', priority: forecasts.feed.autonomy_days <= 7 ? 'critique' : 'haute', axis: 'stock', title: 'Sécuriser rapidement l’aliment', summary: `Autonomie estimée ${Math.round(forecasts.feed.autonomy_days)} jour(s).`, recommendation: 'Comparer les prix et préparer l’achat avant rupture.', expected_impact: 'Éviter baisse ponte et achat en urgence.', confidence_score: 80 });
  if (forecasts.cash.projected_cash_balance < 0) decisions.push({ id: 'ia-cash', priority: 'critique', axis: 'tresorerie', title: 'Tension de trésorerie prévisible', summary: `Projection 30 jours: ${Math.round(forecasts.cash.projected_cash_balance)} FCFA.`, recommendation: 'Relancer encaissements et réduire dépenses non critiques.', expected_impact: 'Stabiliser le cash-flow.', confidence_score: 78 });
  if (anomalies.urgence_count || anomalies.critique_count) decisions.push({ id: 'ia-risks', priority: 'critique', axis: 'risque', title: 'Risque opérationnel critique détecté', summary: `${anomalies.urgence_count} urgence(s), ${anomalies.critique_count} critique(s).`, recommendation: 'Traiter sécurité, mortalité et stocks critiques en priorité.', expected_impact: 'Réduction pertes et incidents.', confidence_score: 84 });
  if (!decisions.length) decisions.push({ id: 'ia-data', priority: 'basse', axis: 'pilotage', title: 'Données à enrichir', summary: 'Le moteur IA manque encore de données récentes pour arbitrage avancé.', recommendation: 'Continuer la saisie production, ventes, finances, prix marché et Smart Farm.', expected_impact: 'Meilleure précision IA.', confidence_score: 45 });

  const strategic_score = Math.max(0, Math.min(100, 55 + (bestLot?.estimated_margin_per_tablet > 0 ? 15 : -5) + (forecasts.cash.projected_cash_balance >= 0 ? 10 : -15) + (anomalies.critique_count === 0 ? 10 : -10) + ((forecasts.feed.autonomy_days || 0) > 15 ? 10 : -10)));

  const order = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
  decisions.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));

  return { generated_at: new Date().toISOString(), strategic_score, pondeuses, forecasts, anomalies, decisions };
};

export default buildStrategicInsights;
