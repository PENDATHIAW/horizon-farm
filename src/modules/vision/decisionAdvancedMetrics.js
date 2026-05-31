import { toNumber } from '../../utils/format';
import {
  calculateAvicoleLotCost,
  calculateAnimalCost,
  lotTypeKey,
} from '../../utils/costEngine';
import {
  avicoleActiveCount,
  avicoleDeadCount,
  avicoleInitialCount,
} from '../../utils/avicoleMetrics';
import { filterLotsByActivity } from '../../utils/avicoleActivity';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => toNumber(v);
const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const safeDiv = (a, b) => (b > 0 ? a / b : 0);
const logDate = (row = {}) => row.date || row.event_date || row.created_at || '';
const logQty = (log = {}) => n(log.quantite ?? log.quantity ?? log.qty ?? log.amount);
const lotIdOf = (row = {}) => String(row.lot_id || row.cible_id || row.entity_id || row.related_id || row.source_record_id || '');
const buildingOf = (row = {}) => row.batiment || row.nom_batiment || row.logement || row.site || 'Bâtiment non renseigné';
const orderAmount = (o = {}) => n(o.montant_total ?? o.total ?? o.amount ?? o.ca ?? 0);
const clientName = (o = {}, clients = []) => {
  const id = o.client_id || o.customer_id;
  const match = arr(clients).find((c) => String(c.id) === String(id));
  return match?.nom || match?.name || o.client_name || o.client_nom || 'Client non renseigné';
};

function pricePerUnit(log = {}) {
  const qty = logQty(log);
  const amount = n(log.montant_total ?? log.cout_total ?? log.total ?? log.montant ?? log.amount)
    || n(log.prix_unitaire ?? log.unit_price ?? log.price) * qty;
  if (qty > 0 && amount > 0) return { qty, amount, unitPrice: amount / qty, tonnePrice: (amount / qty) * 1000 };
  const unit = n(log.prix_unitaire ?? log.unit_price ?? log.price);
  return { qty, amount: unit * qty, unitPrice: unit, tonnePrice: unit * 1000 };
}

function productKey(log = {}) {
  return low(log.produit || log.product_name || log.nom || log.libelle || log.categorie || log.category || 'produit');
}

function supplierName(log = {}, fournisseurs = []) {
  const id = log.fournisseur_id || log.supplier_id;
  const match = arr(fournisseurs).find((f) => String(f.id) === String(id));
  return match?.nom || match?.name || log.fournisseur_nom || log.fournisseur || 'Non renseigné';
}

/** Équivalent RECHERCHEV : dernier prix connu vs prix actuel par produit/fournisseur. */
export function buildPriceReferential({ alimentationLogs = [], fournisseurs = [], transactions = [] }) {
  const rows = [...arr(alimentationLogs), ...arr(transactions).filter((tx) => /aliment|provende|feed|mais|son/.test(low(`${tx.libelle || ''} ${tx.categorie || ''} ${tx.title || ''}`)))]
    .map((log) => {
      const date = String(logDate(log)).slice(0, 10);
      const { qty, unitPrice, tonnePrice } = pricePerUnit(log);
      if (!date || unitPrice <= 0) return null;
      return {
        date,
        product: productKey(log),
        supplier: supplierName(log, fournisseurs),
        qty,
        unitPrice,
        tonnePrice,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  const byKey = new Map();
  rows.forEach((row) => {
    const key = `${row.product}::${row.supplier}`;
    const list = byKey.get(key) || [];
    list.push(row);
    byKey.set(key, list);
  });

  const referential = [];
  byKey.forEach((list, key) => {
    const [product, supplier] = key.split('::');
    const current = list[list.length - 1];
    const previous = list.length > 1 ? list[list.length - 2] : null;
    const lastKnown = previous || current;
    const pctVsPrevious = previous ? safeDiv(current.unitPrice - previous.unitPrice, previous.unitPrice) * 100 : 0;
    referential.push({
      id: key,
      product,
      supplier,
      currentPrice: current.unitPrice,
      currentTonPrice: current.tonnePrice,
      lastPrice: lastKnown.unitPrice,
      previousPrice: previous?.unitPrice ?? null,
      pctChange: pctVsPrevious,
      lastDate: current.date,
      purchaseCount: list.length,
      tone: pctVsPrevious > 10 ? 'bad' : pctVsPrevious > 5 ? 'warn' : 'good',
      alert: pctVsPrevious > 5 ? `+${pctVsPrevious.toFixed(1)}% vs achat précédent` : 'Stable',
    });
  });

  const byProduct = new Map();
  referential.forEach((row) => {
    const list = byProduct.get(row.product) || [];
    list.push(row);
    byProduct.set(row.product, list);
  });
  const supplierBars = [...byProduct.entries()].map(([product, list]) => ({
    product,
    bars: list.sort((a, b) => a.currentTonPrice - b.currentTonPrice).map((r) => ({
      supplier: r.supplier,
      tonnePrice: r.currentTonPrice,
      tone: r.tone,
    })),
  }));

  return {
    rows: referential.sort((a, b) => b.pctChange - a.pctChange),
    supplierBars,
    alertCount: referential.filter((r) => r.tone !== 'good').length,
  };
}

function pathologyOf(row = {}) {
  return row.diagnostic || row.symptomes || row.type_intervention || row.nom || row.type || 'Intervention';
}

function healthCost(row = {}) {
  return n(row.cout ?? row.cout_intervention ?? row.montant ?? row.amount);
}

function recoveryDays(row = {}) {
  const parsed = String(row.duree_traitement || '').match(/(\d+)/);
  if (parsed) return n(parsed[1]);
  const start = row.effectuee || row.date;
  const end = row.prochain_controle || row.prochaine_date_calculee;
  if (start && end) {
    const diff = Math.max(0, Math.round((new Date(end) - new Date(start)) / 86400000));
    if (diff > 0) return diff;
  }
  return low(row.statut_sante_apres) === 'sain' ? 1 : null;
}

function lotMortalityForTarget(relatedId, lots = []) {
  const lot = arr(lots).find((l) => String(l.id) === String(relatedId));
  if (!lot) return null;
  const initial = avicoleInitialCount(lot);
  return initial > 0 ? safeDiv(avicoleDeadCount(lot), initial) * 100 : null;
}

/** Tableau croisement pathologie × véto (coût + guérison + pertes lot). */
export function buildVetPathologyMatrix({ sante = [], veterinaires = [], lots = [], animaux = [] }) {
  return arr(sante)
    .filter((row) => healthCost(row) > 0)
    .map((row) => {
      const vet = row.vet || arr(veterinaires).find((v) => String(v.id) === String(row.vet_id))?.nom || 'Non renseigné';
      const relatedId = row.related_id || row.lot_id || row.animal_id;
      const mortality = lotMortalityForTarget(relatedId, lots);
      const recDays = recoveryDays(row);
      const oppCost = recDays && recDays > 7 ? healthCost(row) * 0.15 * (recDays - 7) : 0;
      return {
        id: row.id,
        date: row.effectuee || row.date || row.prevue,
        pathology: pathologyOf(row),
        vet,
        cost: healthCost(row),
        recoveryDays: recDays,
        mortalityPct: mortality,
        target: row.target_summary || row.animal || relatedId || '—',
        realTotalCost: healthCost(row) + oppCost,
        tone: recDays !== null && recDays > 10 ? 'bad' : recDays !== null && recDays <= 5 ? 'good' : 'warn',
      };
    })
    .sort((a, b) => b.realTotalCost - a.realTotalCost);
}

/** ROI nutrition : prix/tonne vs coût/kg produit (IC × prix). */
export function buildFeedNutritionRoi({ alimentationLogs = [], lots = [], fournisseurs = [] }) {
  const chairLots = filterLotsByActivity(lots, 'Chair');
  const results = [];

  chairLots.forEach((lot) => {
    const supplierLogs = arr(alimentationLogs).filter((log) => lotIdOf(log) === String(lot.id));
    const suppliers = new Set(supplierLogs.map((log) => supplierName(log, fournisseurs)));
    suppliers.forEach((supplier) => {
      const logs = supplierLogs.filter((log) => supplierName(log, fournisseurs) === supplier);
      const feedKg = logs.reduce((s, log) => s + logQty(log), 0);
      const feedCost = logs.reduce((s, log) => s + pricePerUnit(log).amount, 0);
      const cost = calculateAvicoleLotCost({ lot, alimentationLogs: logs });
      const cycleDays = n(lot.age_jours ?? lot.age_days ?? lot.duree_cycle_jours) || 42;
      const weight = n(lot.poids_moyen_actuel ?? lot.weight) * Math.max(1, avicoleActiveCount(lot));
      const ic = safeDiv(feedKg, weight);
      const costPerKg = safeDiv(feedCost, weight);
      const tonnePrice = feedKg > 0 ? (feedCost / feedKg) * 1000 : 0;
      results.push({
        id: `${lot.id}-${supplier}`,
        lot: lot.name || lot.nom || lot.id,
        supplier,
        tonnePrice,
        cycleDays,
        ic,
        costPerKg,
        tone: ic > 0 && ic < 1.85 && cycleDays <= 40 ? 'good' : ic > 1.95 || cycleDays > 45 ? 'bad' : 'warn',
        detail: ic > 0 ? `${Math.round(tonnePrice)} F/t · IC ${ic.toFixed(2)} · ${cycleDays} j` : 'Données incomplètes',
      });
    });
  });

  return results.sort((a, b) => a.costPerKg - b.costPerKg);
}

function monthLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Sans date';
  return d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
}

/** Saisonnalité : mortalité & IC par mois × bâtiment. */
export function buildSeasonalityAnalysis({ lots = [], alimentationLogs = [], productionLogs = [] }) {
  const map = new Map();
  arr(lots).forEach((lot) => {
    const month = monthLabel(lot.date_debut || lot.date_entree || lot.created_at);
    const building = buildingOf(lot);
    const key = `${month}::${building}`;
    const bucket = map.get(key) || { month, building, lots: 0, mortalitySum: 0, icSum: 0, layingSum: 0, layingCount: 0 };
    bucket.lots += 1;
    const initial = avicoleInitialCount(lot);
    bucket.mortalitySum += initial > 0 ? safeDiv(avicoleDeadCount(lot), initial) * 100 : 0;
    const feedKg = arr(alimentationLogs).filter((log) => lotIdOf(log) === String(lot.id)).reduce((s, log) => s + logQty(log), 0);
    const weight = n(lot.poids_moyen_actuel ?? lot.weight) * Math.max(1, avicoleActiveCount(lot));
    if (weight > 0 && feedKg > 0) bucket.icSum += feedKg / weight;
    if (lotTypeKey(lot) === 'ponte') {
      const eggs = arr(productionLogs).filter((log) => lotIdOf(log) === String(lot.id)).reduce((s, log) => s + n(log.oeufs_produits ?? log.eggs), 0);
      const birds = avicoleActiveCount(lot) || initial;
      if (birds > 0) {
        bucket.layingSum += safeDiv(eggs, birds) * 100;
        bucket.layingCount += 1;
      }
    }
    map.set(key, bucket);
  });

  return [...map.values()].map((row) => ({
    ...row,
    avgMortality: row.lots ? row.mortalitySum / row.lots : 0,
    avgIc: row.lots ? row.icSum / row.lots : 0,
    avgLaying: row.layingCount ? row.layingSum / row.layingCount : null,
    tone: row.avgMortality > 4 ? 'bad' : row.avgMortality > 2 ? 'warn' : 'good',
  })).sort((a, b) => b.avgMortality - a.avgMortality);
}

/** Démarque : stock théorique vs réel (aliments & œufs simplifiés). */
export function buildShrinkageAnalysis({ stocks = [], alimentationLogs = [], productionLogs = [], salesOrders = [] }) {
  const feedStock = arr(stocks).filter((s) => /aliment|provende|feed|mais|son/.test(low(`${s.nom || ''} ${s.produit || ''}`)));
  const realFeedKg = feedStock.reduce((s, st) => s + n(st.quantite ?? st.quantity), 0);
  const consumedKg = arr(alimentationLogs).reduce((s, log) => s + logQty(log), 0);
  const theoreticalFeedKg = realFeedKg + consumedKg;
  const feedShrinkPct = theoreticalFeedKg > 0 ? safeDiv(theoreticalFeedKg - realFeedKg, theoreticalFeedKg) * 100 : 0;

  const producedEggs = arr(productionLogs).reduce((s, log) => s + n(log.oeufs_produits ?? log.eggs), 0);
  const soldEggs = arr(salesOrders).filter((o) => /oeuf|ponte|tablette/.test(low(`${o.libelle || ''} ${o.notes || ''} ${o.produit || ''}`))).reduce((s, o) => s + n(o.quantite ?? o.quantity ?? 1), 0);
  const eggShrinkPct = producedEggs > 0 ? safeDiv(producedEggs - soldEggs, producedEggs) * 100 : 0;

  return {
    feed: { theoretical: theoreticalFeedKg, real: realFeedKg, shrinkPct: feedShrinkPct, tone: feedShrinkPct > 2 ? 'bad' : 'good' },
    eggs: { theoretical: producedEggs, real: soldEggs, shrinkPct: eggShrinkPct, tone: eggShrinkPct > 2 ? 'bad' : 'good' },
  };
}

/** Qualité lot × client : CA net vs contraintes (poids/calibre proxy). */
export function buildClientQualityAnalysis({ salesOrders = [], clients = [], lots = [] }) {
  const map = new Map();
  arr(salesOrders).forEach((order) => {
    const client = clientName(order, clients);
    const row = map.get(client) || { client, revenue: 0, orders: 0, linkedLots: new Set() };
    row.revenue += orderAmount(order);
    row.orders += 1;
    const lid = lotIdOf(order);
    if (lid) row.linkedLots.add(lid);
    map.set(client, row);
  });

  return [...map.values()].map((row) => {
    const lotWeights = [...row.linkedLots].map((id) => {
      const lot = arr(lots).find((l) => String(l.id) === id);
      return lot ? n(lot.poids_moyen_actuel ?? lot.weight) : 0;
    }).filter((w) => w > 0);
    const avgWeight = lotWeights.length ? lotWeights.reduce((s, w) => s + w, 0) / lotWeights.length : 0;
    const revenuePerOrder = safeDiv(row.revenue, row.orders);
    return {
      client: row.client,
      revenue: row.revenue,
      orders: row.orders,
      avgWeight,
      revenuePerOrder,
      tone: revenuePerOrder > 0 && avgWeight > 0 && revenuePerOrder / avgWeight < 500 ? 'warn' : 'good',
      detail: avgWeight > 0 ? `${Math.round(revenuePerOrder)} F/commande · ~${avgWeight.toFixed(2)} kg` : `${Math.round(revenuePerOrder)} F/commande`,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function buildAdvancedDecisionData(props = {}) {
  const alimentationLogs = arr(props.alimentationLogs);
  const fournisseurs = arr(props.fournisseurs);
  const transactions = arr(props.transactions || props.transactionsAll);
  const sante = arr(props.sante);
  const veterinaires = arr(props.veterinaires);
  const lots = arr(props.lots);
  const animaux = arr(props.animaux);
  const stocks = arr(props.stocks);
  const productionLogs = arr(props.productionLogs);
  const salesOrders = arr(props.salesOrders || props.salesOrdersAll);
  const clients = arr(props.clients);

  const referentiel = buildPriceReferential({ alimentationLogs, fournisseurs, transactions });
  const vetPathology = buildVetPathologyMatrix({ sante, veterinaires, lots, animaux });
  const feedRoi = buildFeedNutritionRoi({ alimentationLogs, lots, fournisseurs });
  const seasonality = buildSeasonalityAnalysis({ lots, alimentationLogs, productionLogs });
  const shrinkage = buildShrinkageAnalysis({ stocks, alimentationLogs, productionLogs, salesOrders });
  const clientQuality = buildClientQualityAnalysis({ salesOrders, clients, lots });

  return {
    referentiel,
    vetPathology,
    feedRoi,
    seasonality,
    shrinkage,
    clientQuality,
    alertCount: referentiel.alertCount + (shrinkage.feed.tone === 'bad' ? 1 : 0) + (shrinkage.eggs.tone === 'bad' ? 1 : 0),
  };
}
