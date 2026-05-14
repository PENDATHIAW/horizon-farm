import { toNumber } from '../utils/format';

const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const dateOf = (row = {}, keys = ['date', 'created_at', 'event_date', 'observed_at']) => {
  const raw = keys.map((key) => row?.[key]).find(Boolean);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const daysBetween = (start, end = new Date()) => {
  if (!start) return null;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const valueByKeys = (row = {}, keys = []) => {
  for (const key of keys) {
    const value = toNumber(row[key], null);
    if (value !== null && Number.isFinite(value) && value !== 0) return value;
  }
  return 0;
};

const sumBy = (rows, keys) => asRows(rows).reduce((sum, row) => sum + valueByKeys(row, keys), 0);

const recentRows = (rows, maxAgeDays = 30) => {
  const now = Date.now();
  return asRows(rows).filter((row) => {
    const date = dateOf(row);
    if (!date) return false;
    return (now - date.getTime()) / (1000 * 60 * 60 * 24) <= maxAgeDays;
  });
};

const averageDailyValue = (rows, keys, maxAgeDays = 30) => {
  const recent = recentRows(rows, maxAgeDays);
  if (!recent.length) return 0;
  const dates = recent.map((row) => dateOf(row)).filter(Boolean).sort((a, b) => a - b);
  const days = daysBetween(dates[0]) || maxAgeDays;
  return sumBy(recent, keys) / Math.min(days, maxAgeDays);
};

const isFeedStock = (row = {}) => {
  const text = normalizeText(`${row.produit || ''} ${row.nom || ''} ${row.categorie || ''} ${row.category || ''} ${row.type || ''}`);
  return text.includes('aliment') || text.includes('feed') || text.includes('pondeuse') || text.includes('chair');
};

export const buildOperationalForecast = ({
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  salesOrders = [],
  payments = [],
  transactions = [],
  horizonDays = 30,
} = {}) => {
  const feedStocks = asRows(stocks).filter(isFeedStock);
  const feedConsumptionPerDay = averageDailyValue(alimentationLogs, ['quantite', 'quantity', 'qty'], 30);
  const feedCostPerDay = averageDailyValue(alimentationLogs, ['montant_total', 'cout_total', 'total', 'montant', 'amount', 'prix_total'], 30);
  const feedQtyAvailable = sumBy(feedStocks, ['quantite', 'quantity', 'qty']);
  const feedAutonomyDays = feedConsumptionPerDay > 0 ? feedQtyAvailable / feedConsumptionPerDay : null;

  const eggProductionPerDay = averageDailyValue(productionLogs, ['oeufs_produits', 'oeufs', 'quantite', 'quantity', 'total_oeufs'], 30);
  const brokenEggsPerDay = averageDailyValue(productionLogs, ['oeufs_casses', 'casses', 'broken_eggs', 'pertes'], 30);
  const sellableEggsPerDay = Math.max(eggProductionPerDay - brokenEggsPerDay, 0);
  const projectedSellableEggs = sellableEggsPerDay * horizonDays;
  const projectedTablets = projectedSellableEggs / 30;

  const salesPerDay = averageDailyValue(salesOrders, ['total_ttc', 'total', 'montant', 'amount', 'prix_total'], 45);
  const paymentsPerDay = averageDailyValue(payments, ['montant_paye', 'paid_amount', 'amount', 'montant'], 45);
  const expensesPerDay = averageDailyValue(
    asRows(transactions).filter((row) => normalizeText(`${row.type || ''} ${row.categorie || ''}`).includes('sortie') || normalizeText(row.categorie).includes('depense')),
    ['montant', 'amount', 'total'],
    45
  );

  const projectedSales = salesPerDay * horizonDays;
  const projectedPayments = paymentsPerDay * horizonDays;
  const projectedExpenses = Math.max(expensesPerDay * horizonDays, feedCostPerDay * horizonDays);
  const projectedCashBalance = projectedPayments - projectedExpenses;

  const risks = [];
  if (feedAutonomyDays !== null && feedAutonomyDays <= 7) {
    risks.push({
      type: 'stock',
      priority: 'critique',
      title: 'Autonomie aliment faible',
      summary: `Autonomie estimee a ${Math.round(feedAutonomyDays)} jour(s).`,
      action_recommandee: 'Verifier stock physique et preparer achat aliment.',
    });
  } else if (feedAutonomyDays !== null && feedAutonomyDays <= 15) {
    risks.push({
      type: 'stock',
      priority: 'haute',
      title: 'Autonomie aliment a surveiller',
      summary: `Autonomie estimee a ${Math.round(feedAutonomyDays)} jour(s).`,
      action_recommandee: 'Comparer les prix et planifier commande avant rupture.',
    });
  }

  if (projectedCashBalance < 0) {
    risks.push({
      type: 'tresorerie',
      priority: 'haute',
      title: 'Tension de tresorerie previsionnelle',
      summary: `Solde previsionnel ${Math.round(projectedCashBalance)} FCFA sur ${horizonDays} jours.`,
      action_recommandee: 'Relancer encaissements, reduire depenses non critiques ou ajuster prix de vente.',
    });
  }

  if (sellableEggsPerDay === 0 && asRows(productionLogs).length > 0) {
    risks.push({
      type: 'production',
      priority: 'haute',
      title: 'Production vendable nulle',
      summary: 'Des journaux de production existent mais aucun volume vendable recent nest calcule.',
      action_recommandee: 'Verifier la saisie production, les pertes, la ponte et la sante du lot.',
    });
  }

  const recommendations = [];
  if (projectedTablets > 0) {
    recommendations.push({
      type: 'vente',
      priority: 'moyenne',
      title: 'Projection vente oeufs',
      summary: `${Math.round(projectedTablets)} tablette(s) vendables estimees sur ${horizonDays} jours.`,
      action_recommandee: 'Preparer clients, emballages et prix de vente selon marche.',
      confidence_score: 60,
    });
  }

  if (feedAutonomyDays !== null) {
    recommendations.push({
      type: 'stock',
      priority: feedAutonomyDays <= 15 ? 'haute' : 'basse',
      title: 'Autonomie aliment',
      summary: `${Math.round(feedAutonomyDays)} jour(s) dautonomie estimee.`,
      action_recommandee: feedAutonomyDays <= 15 ? 'Comparer les fournisseurs avant achat.' : 'Surveiller consommation reelle.',
      confidence_score: 65,
    });
  }

  return {
    generated_at: new Date().toISOString(),
    horizon_days: horizonDays,
    feed: {
      available_qty: feedQtyAvailable,
      consumption_per_day: feedConsumptionPerDay,
      cost_per_day: feedCostPerDay,
      autonomy_days: feedAutonomyDays,
    },
    eggs: {
      production_per_day: eggProductionPerDay,
      broken_per_day: brokenEggsPerDay,
      sellable_per_day: sellableEggsPerDay,
      projected_sellable_eggs: projectedSellableEggs,
      projected_tablets: projectedTablets,
    },
    cash: {
      sales_per_day: salesPerDay,
      payments_per_day: paymentsPerDay,
      expenses_per_day: Math.max(expensesPerDay, feedCostPerDay),
      projected_sales: projectedSales,
      projected_payments: projectedPayments,
      projected_expenses: projectedExpenses,
      projected_cash_balance: projectedCashBalance,
    },
    risks,
    recommendations,
  };
};

export default buildOperationalForecast;
