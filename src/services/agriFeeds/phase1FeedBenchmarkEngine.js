/**
 * AGRI FEEDS - benchmark alimentation Phase 1 (aliments du marché).
 * Agrège alimentation_logs, stocks, lots, animaux, ponte, finances.
 */
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFeedStock(row = {}) {
  const text = norm(`${row.categorie || ''} ${row.produit || ''}`);
  return text.includes('aliment') || text.includes('feed') || text.includes('provende');
}

function isAgriFeedsStock(row = {}) {
  const text = norm(`${row.categorie || ''} ${row.produit || ''}`);
  return text.includes('aliment_agri') || text.includes('agri_feeds') || text.includes('agri feeds');
}

function stockUnitPrice(row = {}) {
  return toNumber(row.prixUnit ?? row.prix_unitaire ?? row.unit_price ?? row.cout_unitaire);
}

function logQty(log = {}) {
  return toNumber(log.quantite ?? log.quantity ?? log.qty);
}

function logCost(log = {}, stocksById = new Map()) {
  const direct = toNumber(log.montant_total ?? log.distribution_cost ?? log.cout);
  if (direct > 0) return direct;
  const stock = stocksById.get(String(log.stock_id || log.produit_id || ''));
  if (stock) return logQty(log) * stockUnitPrice(stock);
  return 0;
}

function findSupplier(log, stocks, fournisseurs) {
  const byId = (id) => arr(fournisseurs).find((f) => String(f.id) === String(id));
  if (log.fournisseur_id) return byId(log.fournisseur_id);
  const stock = arr(stocks).find((s) => String(s.id) === String(log.stock_id || ''));
  if (stock?.fournisseur_id) return byId(stock.fournisseur_id);
  return null;
}

function feedTypeLabel(log = {}, stock = null) {
  const raw = `${log.categorie || ''} ${stock?.categorie || ''} ${stock?.produit || ''} ${log.produit || ''}`;
  const t = norm(raw);
  if (t.includes('pondeuse') || t.includes('layer') || t.includes('ponte')) return 'Aliment pondeuse';
  if (t.includes('chair') || t.includes('broiler') || t.includes('poulet')) return 'Aliment chair';
  if (t.includes('bovin') || t.includes('betail') || t.includes('bétail') || t.includes('cattle')) return 'Aliment bovin';
  if (stock?.produit) return String(stock.produit);
  if (log.categorie) return String(log.categorie);
  return 'Aliment marché';
}

function lotById(lots, id) {
  return arr(lots).find((l) => String(l.id) === String(id)) || null;
}

function animalById(animaux, id) {
  return arr(animaux).find((a) => String(a.id) === String(id)) || null;
}

function computeLayingRate(productionLogs, lotId) {
  const logs = arr(productionLogs).filter((p) => String(p.lot_id) === String(lotId));
  if (!logs.length) return null;
  const eggs = logs.reduce((s, p) => s + toNumber(p.oeufs_produits), 0);
  const hens = Math.max(
    ...logs.map((p) => toNumber(p.pondeuses_actives || p.effectif || 0)),
    0,
  );
  if (hens <= 0) return null;
  const days = Math.max(1, logs.length);
  return (eggs / (hens * days)) * 100;
}

function traysFromEggs(eggs) {
  return eggs > 0 ? eggs / 30 : 0;
}

/**
 * Construit les lignes de référence Phase 1 (une ligne par lot / animal / agrégat).
 */
export function buildPhase1FeedBenchmark(dataMap = {}) {
  const logs = arr(dataMap.alimentation_logs);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const fournisseurs = arr(dataMap.fournisseurs);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const sales = arr(dataMap.sales_orders);

  const stocksById = new Map(stocks.map((s) => [String(s.id), s]));
  const marketLogs = logs.filter((log) => {
    const source = norm(log.feed_source || 'market_feed');
    if (source.includes('agri')) return false;
    const stock = stocksById.get(String(log.stock_id || ''));
    if (stock && isAgriFeedsStock(stock)) return false;
    return true;
  });

  const byTarget = new Map();

  marketLogs.forEach((log) => {
    const targetType = norm(log.type_cible || '');
    const targetId = String(log.cible_id || log.lot_id || log.animal_id || '');
    const key = targetId
      ? `${targetType || 'lot'}:${targetId}`
      : `cat:${norm(log.categorie || 'general')}`;

    if (!byTarget.has(key)) {
      byTarget.set(key, {
        key,
        targetId: targetId || null,
        targetType: targetType || (targetId ? 'lot_avicole' : 'categorie'),
        logs: [],
        qty: 0,
        cost: 0,
        suppliers: new Set(),
        feedTypes: new Set(),
        prices: [],
        dates: [],
      });
    }
    const bucket = byTarget.get(key);
    const stock = stocksById.get(String(log.stock_id || ''));
    const qty = logQty(log);
    const cost = logCost(log, stocksById);
    const supplier = findSupplier(log, stocks, fournisseurs);
    bucket.logs.push(log);
    bucket.qty += qty;
    bucket.cost += cost;
    if (supplier?.nom || supplier?.name) bucket.suppliers.add(supplier.nom || supplier.name);
    bucket.feedTypes.add(feedTypeLabel(log, stock));
    const unit = qty > 0 ? cost / qty : stockUnitPrice(stock);
    if (unit > 0) bucket.prices.push(unit);
    const d = parseDate(log.date || log.created_at);
    if (d) bucket.dates.push(d);
  });

  const rows = [...byTarget.values()].map((bucket) => {
    const lot = bucket.targetId ? lotById(lots, bucket.targetId) : null;
    const animal = !lot && bucket.targetId ? animalById(animaux, bucket.targetId) : null;
    const species = lot
      ? (norm(lot.type).includes('ponde') ? 'layer' : 'broiler')
      : animal
        ? 'cattle'
        : 'other';

    const initialCount = toNumber(
      lot?.initial_count ?? lot?.effectif_initial ?? animal?.effectif ?? 1,
      1,
    );
    const mortality = toNumber(lot?.mortality ?? lot?.morts ?? (norm(animal?.status || animal?.statut).includes('mort') ? 1 : 0));
    const currentCount = toNumber(
      lot?.current_count ?? lot?.effectif ?? (initialCount - mortality),
      Math.max(0, initialCount - mortality),
    );
    const weightFinal = toNumber(lot?.weight_avg ?? lot?.poids_moyen ?? animal?.poids ?? animal?.weight);
    const layingRate = lot ? computeLayingRate(productionLogs, lot.id) : null;
    const eggs = lot
      ? arr(productionLogs)
        .filter((p) => String(p.lot_id) === String(lot.id))
        .reduce((s, p) => s + toNumber(p.oeufs_produits), 0)
      : 0;
    const trays = traysFromEggs(eggs);

    const subjects = Math.max(1, currentCount || initialCount);
    const costPerSubject = bucket.cost / subjects;
    const costPerTray = trays > 0 ? bucket.cost / trays : null;
    const costPerBeef = species === 'cattle' ? bucket.cost / subjects : null;

    const lotSales = lot
      ? sales.filter((s) => {
        const t = norm(`${s.notes || ''} ${s.product_name || ''} ${s.source_id || ''}`);
        return String(s.source_id || '') === String(lot.id) || t.includes(norm(lot.nom || lot.name || ''));
      })
      : [];
    const revenue = lotSales.reduce((s, o) => s + toNumber(o.total_amount ?? o.montant ?? o.amount), 0)
      || toNumber(lot?.ca_vente ?? lot?.revenue);
    const margin = revenue > 0 ? revenue - bucket.cost : null;

    const avgPriceKg = bucket.prices.length
      ? bucket.prices.reduce((a, b) => a + b, 0) / bucket.prices.length
      : (bucket.qty > 0 ? bucket.cost / bucket.qty : 0);

    const dates = bucket.dates.sort((a, b) => a - b);
    const periodStart = dates[0] ? dates[0].toISOString().slice(0, 10) : null;
    const periodEnd = dates.length ? dates[dates.length - 1].toISOString().slice(0, 10) : null;

    return {
      id: bucket.key,
      animal_lot_id: lot?.id || null,
      animal_id: animal?.id || null,
      label: lot?.nom || lot?.name || animal?.nom || animal?.identifiant || bucket.feedTypes.values().next().value || 'Référence',
      species,
      speciesLabel: species === 'layer' ? 'Pondeuse' : species === 'broiler' ? 'Chair' : species === 'cattle' ? 'Bovin' : 'Autre',
      supplier: [...bucket.suppliers].join(', ') || '-',
      feed_type: [...bucket.feedTypes].join(' · ') || 'Aliment marché',
      price_per_kg: avgPriceKg,
      quantity_consumed: bucket.qty,
      feed_cost_total: bucket.cost,
      cost_feed_per_subject: costPerSubject,
      cost_feed_per_tray: costPerTray,
      cost_feed_per_beef: costPerBeef,
      mortality,
      mortality_rate: initialCount > 0 ? (mortality / initialCount) * 100 : null,
      weight_final: weightFinal || null,
      laying_rate: layingRate,
      egg_production_total: eggs || null,
      revenue: revenue || null,
      margin,
      period_start: periodStart,
      period_end: periodEnd,
      distributions_count: bucket.logs.length,
      source: 'phase_1_market',
    };
  });

  rows.sort((a, b) => (b.feed_cost_total || 0) - (a.feed_cost_total || 0));

  const totals = {
    rows: rows.length,
    quantity_consumed: rows.reduce((s, r) => s + (r.quantity_consumed || 0), 0),
    feed_cost_total: rows.reduce((s, r) => s + (r.feed_cost_total || 0), 0),
    avg_price_per_kg: (() => {
      const withPrice = rows.filter((r) => r.price_per_kg > 0);
      if (!withPrice.length) return 0;
      return withPrice.reduce((s, r) => s + r.price_per_kg, 0) / withPrice.length;
    })(),
    distributions: marketLogs.length,
    market_feed_stocks: stocks.filter((s) => isFeedStock(s) && !isAgriFeedsStock(s)).length,
  };

  return { rows, totals, hasData: rows.length > 0 || marketLogs.length > 0 };
}

/**
 * Compare une référence Phase 1 (lot) à une formule AGRI FEEDS (si données disponibles).
 * Étape 1 : comparaison partielle - KPI formule souvent absents tant que production/tests non livrés.
 */
export function compareMarketFeedToAgriFeedsFormula({
  dataMap = {},
  animalLotId,
  formulaVersionId,
  period = {},
} = {}) {
  const benchmark = buildPhase1FeedBenchmark(dataMap);
  let marketRow = benchmark.rows.find((r) => String(r.animal_lot_id) === String(animalLotId));
  if (!marketRow && animalLotId) {
    marketRow = benchmark.rows.find((r) => String(r.animal_id) === String(animalLotId));
  }

  const versions = arr(dataMap.feed_formula_versions);
  const version = versions.find((v) => String(v.id) === String(formulaVersionId)) || null;
  const formulas = arr(dataMap.feed_formulas);
  const formula = version
    ? formulas.find((f) => String(f.id) === String(version.formula_id))
    : null;

  const trials = arr(dataMap.feed_trials).filter((t) => {
    const sameLot = !animalLotId || String(t.animal_lot_id) === String(animalLotId);
    const sameFormula = !formulaVersionId || String(t.formula_version_id) === String(formulaVersionId);
    return sameLot && sameFormula;
  });

  const trial = trials.sort((a, b) => String(b.end_date || '').localeCompare(String(a.end_date || '')))[0] || null;

  if (!marketRow && !trial && !version) {
    return {
      status: 'insufficient_data',
      message: 'Données insuffisantes pour conclure.',
      market: null,
      agriFeeds: null,
      comparison: [],
      period,
    };
  }

  const agri = trial ? {
    formula_name: formula?.name || version?.version_code || 'Formule AGRI FEEDS',
    formula_version_id: formulaVersionId || trial.formula_version_id,
    cost_per_kg: toNumber(version?.theoretical_cost_per_kg || trial.cost_feed_per_kg_gain),
    quantity_consumed: toNumber(trial.total_feed_consumed),
    cost_feed_per_subject: toNumber(trial.cost_feed_per_animal),
    cost_feed_per_tray: toNumber(trial.feed_cost_per_tray),
    mortality_rate: toNumber(trial.mortality_rate),
    weight_final: toNumber(trial.ending_weight_avg),
    laying_related: toNumber(trial.egg_production_total),
    feed_conversion_ratio: toNumber(trial.feed_conversion_ratio),
    margin: toNumber(trial.margin),
    source: 'trial',
  } : version ? {
    formula_name: formula?.name || version.version_code,
    formula_version_id: version.id,
    cost_per_kg: toNumber(version.theoretical_cost_per_kg),
    quantity_consumed: null,
    cost_feed_per_subject: null,
    cost_feed_per_tray: null,
    mortality_rate: null,
    weight_final: null,
    laying_related: null,
    feed_conversion_ratio: null,
    margin: null,
    source: 'formula_only',
  } : null;

  const metrics = [
    { key: 'price_per_kg', label: 'Coût / kg aliment', market: marketRow?.price_per_kg, agri: agri?.cost_per_kg, lowerIsBetter: true },
    { key: 'cost_feed_per_subject', label: 'Coût alimentaire / sujet', market: marketRow?.cost_feed_per_subject, agri: agri?.cost_feed_per_subject, lowerIsBetter: true },
    { key: 'cost_feed_per_tray', label: 'Coût alimentaire / plateau', market: marketRow?.cost_feed_per_tray, agri: agri?.cost_feed_per_tray, lowerIsBetter: true },
    { key: 'mortality_rate', label: 'Mortalité %', market: marketRow?.mortality_rate, agri: agri?.mortality_rate, lowerIsBetter: true },
    { key: 'weight_final', label: 'Poids final', market: marketRow?.weight_final, agri: agri?.weight_final, lowerIsBetter: false },
    { key: 'laying_rate', label: 'Taux de ponte / œufs', market: marketRow?.laying_rate ?? marketRow?.egg_production_total, agri: agri?.laying_related, lowerIsBetter: false },
    { key: 'margin', label: 'Marge', market: marketRow?.margin, agri: agri?.margin, lowerIsBetter: false },
  ];

  const comparison = metrics.map((m) => {
    const hasMarket = m.market != null && Number.isFinite(Number(m.market));
    const hasAgri = m.agri != null && Number.isFinite(Number(m.agri)) && Number(m.agri) !== 0;
    if (!hasMarket || !hasAgri) {
      return { ...m, result: 'donnees_insuffisantes', resultLabel: 'Données insuffisantes' };
    }
    const mv = Number(m.market);
    const av = Number(m.agri);
    const delta = av - mv;
    const rel = Math.abs(mv) > 0 ? Math.abs(delta / mv) : 0;
    if (rel < 0.05) {
      return { ...m, result: 'equivalent', resultLabel: 'Équivalent', delta };
    }
    const agriBetter = m.lowerIsBetter ? av < mv : av > mv;
    return {
      ...m,
      delta,
      result: agriBetter ? 'favorable' : 'moins_performant',
      resultLabel: agriBetter
        ? 'Meilleure performance observée sur les lots suivis'
        : 'Moins performant sur les données disponibles',
    };
  });

  const conclusive = comparison.filter((c) => c.result === 'favorable' || c.result === 'moins_performant' || c.result === 'equivalent');
  let overall = 'donnees_insuffisantes';
  let overallLabel = 'Données insuffisantes pour conclure.';
  if (conclusive.length >= 2) {
    const fav = conclusive.filter((c) => c.result === 'favorable').length;
    const worse = conclusive.filter((c) => c.result === 'moins_performant').length;
    if (fav > worse) {
      overall = 'favorable';
      overallLabel = 'Résultat favorable sur les données disponibles.';
    } else if (worse > fav) {
      overall = 'moins_performant';
      overallLabel = 'Résultat moins favorable sur les données disponibles.';
    } else {
      overall = 'equivalent';
      overallLabel = 'Performance équivalente sur les indicateurs disponibles.';
    }
  } else if (agri?.source === 'formula_only') {
    overallLabel = 'Un cycle supplémentaire est nécessaire avant validation.';
  }

  return {
    status: overall,
    message: overallLabel,
    market: marketRow,
    agriFeeds: agri,
    comparison,
    period,
  };
}
