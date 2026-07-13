/**
 * Croisements analytiques Objectifs & Croissance :
 * véto, inflation aliment, saisonnalité météo, démarque stock, qualité lots par client.
 */


import { avicoleActiveCount, avicoleDeadCount } from '../../utils/avicoleMetrics.js';
import { inferWorkshopFromLot } from './breedStockReferential.js';
import { buildLotPivotContext } from './datePivotEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const safeDiv = (a, b) => (b > 0 ? a / b : 0);
const logDate = (r = {}) => String(r.date || r.event_date || r.created_at || '').slice(0, 10);
const lotIdOf = (r = {}) => String(r.lot_id || r.lot || r.cible_id || '');
const amount = (r = {}) => num(r.montant_total ?? r.total ?? r.amount ?? r.montant ?? r.montant_paye);
const FEED_PATTERNS = ['aliment', 'provende', 'feed', 'mais', 'son', 'tourteau'];

function feedStandardKgPerBird(workshop, ageDays) {
  if (workshop === 'pondeuses') return ageDays > 150 ? 0.135 : 0.110;
  if (workshop === 'poulets_chair') {
    if (ageDays <= 14) return 0.055;
    if (ageDays <= 28) return 0.095;
    return 0.120;
  }
  return 0.1;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Comparaison véto : coût vs délai de guérison pour même type d'intervention. */
export function buildVetPerformanceComparison(dataMap = {}) {
  const sante = arr(dataMap.sante || dataMap.vaccins);
  const veterinaires = arr(dataMap.veterinaires);

  const vetName = (row) => {
    if (row.vet || row.veterinaire) return row.vet || row.veterinaire;
    const match = veterinaires.find((v) => String(v.id) === String(row.vet_id || row.veterinaire_id));
    return match?.nom || match?.name || 'Vétérinaire non renseigné';
  };

  const records = sante
    .filter((row) => {
      const st = norm(row.statut || row.status);
      return num(row.cout ?? row.cout_intervention ?? row.montant) > 0
        && (row.effectuee || ['fait', 'realise', 'termine', 'done'].some((x) => st.includes(x)));
    })
    .map((row) => {
      const start = row.effectuee || row.date || row.prevue;
      const end = row.prochain_controle || row.prochaine_date_calculee;
      let recoveryDays = null;
      if (start && end) {
        const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
        if (diff > 0) recoveryDays = diff;
      } else if (norm(row.statut_sante_apres) === 'sain') recoveryDays = 1;
      return {
        id: row.id,
        intervention: row.nom || row.type_intervention || row.type || 'Intervention',
        interventionKey: norm(row.type_intervention || row.type || row.nom),
        vet: vetName(row),
        cost: num(row.cout ?? row.cout_intervention ?? row.montant),
        recoveryDays,
        recovered: norm(row.statut_sante_apres) === 'sain',
      };
    });

  const byType = new Map();
  records.forEach((r) => {
    const bucket = byType.get(r.interventionKey) || [];
    bucket.push(r);
    byType.set(r.interventionKey, bucket);
  });

  const insights = [];
  const rankings = [];

  byType.forEach((rows, key) => {
    const vetMap = new Map();
    rows.forEach((row) => {
      const prev = vetMap.get(row.vet) || { vet: row.vet, costs: [], recoveries: [], count: 0 };
      prev.costs.push(row.cost);
      if (row.recoveryDays != null) prev.recoveries.push(row.recoveryDays);
      prev.count += 1;
      vetMap.set(row.vet, prev);
    });
    const vets = [...vetMap.values()]
      .map((v) => ({
        ...v,
        avgCost: v.costs.reduce((s, c) => s + c, 0) / v.costs.length,
        avgRecovery: v.recoveries.length ? v.recoveries.reduce((s, d) => s + d, 0) / v.recoveries.length : null,
      }))
      .filter((v) => v.avgCost > 0)
      .sort((a, b) => a.avgCost - b.avgCost);

    if (vets.length < 2) return;
    rankings.push({ interventionKey: key, label: rows[0]?.intervention || key, vets });

    const best = vets[0];
    const worst = vets[vets.length - 1];
    const costSavePct = worst.avgCost > 0 ? ((worst.avgCost - best.avgCost) / worst.avgCost) * 100 : 0;
    const recoveryGain = best.avgRecovery != null && worst.avgRecovery != null && worst.avgRecovery > best.avgRecovery
      ? worst.avgRecovery - best.avgRecovery
      : null;

    if (costSavePct >= 5 || (recoveryGain != null && recoveryGain >= 2)) {
      insights.push({
        id: `vet-${key}`,
        intervention: rows[0]?.intervention || key,
        bestVet: best.vet,
        bestCost: Math.round(best.avgCost),
        bestRecoveryDays: best.avgRecovery != null ? Math.round(best.avgRecovery) : null,
        compareVet: worst.vet,
        compareCost: Math.round(worst.avgCost),
        compareRecoveryDays: worst.avgRecovery != null ? Math.round(worst.avgRecovery) : null,
        costSavePct: Math.round(costSavePct),
        recoveryGainDays: recoveryGain != null ? Math.round(recoveryGain) : null,
        alert: costSavePct >= 10,
        message: [
          costSavePct >= 5 ? `${best.vet} coûte ~${costSavePct.toFixed(0)}% moins cher que ${worst.vet} pour la même intervention.` : null,
          recoveryGain != null && recoveryGain >= 2
            ? `Rétablissement ~${Math.round(recoveryGain)} j plus rapide (${Math.round(best.avgRecovery)} j vs ${Math.round(worst.avgRecovery)} j).`
            : null,
        ].filter(Boolean).join(' '),
      });
    }
  });

  console.info('[buildVetPerformanceComparison]', { records: records.length, insights: insights.length });
  return { records, rankings, insights };
}

/** Alerte inflation fournisseurs aliment (+10 % vs période précédente). */
export function buildFeedInflationAlerts(dataMap = {}) {
  const logs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const achats = arr(dataMap.achats || dataMap.purchases || dataMap.stock_movements);

  const purchases = [
    ...logs.filter((l) => num(l.quantite ?? l.quantity) > 0).map((l) => ({
      date: logDate(l),
      product: l.produit || l.product || l.libelle || 'Aliment',
      supplier: l.fournisseur || l.supplier || 'Non renseigné',
      qty: num(l.quantite ?? l.quantity),
      pricePerKg: safeDiv(num(l.cout ?? l.montant ?? l.prix_total), num(l.quantite ?? l.quantity) || 1),
    })),
    ...achats.filter((a) => FEED_PATTERNS.some((p) => norm(`${a.produit || ''} ${a.libelle || ''}`).includes(p))).map((a) => ({
      date: logDate(a),
      product: a.produit || a.libelle || 'Aliment',
      supplier: a.fournisseur || a.supplier || 'Non renseigné',
      qty: num(a.quantite ?? a.quantity),
      pricePerKg: safeDiv(amount(a), num(a.quantite ?? a.quantity) || 1),
    })),
  ].filter((p) => p.date && p.pricePerKg > 0);

  const now = Date.now();
  const ms30 = 30 * 86400000;
  const current = purchases.filter((p) => now - new Date(p.date).getTime() <= ms30);
  const previous = purchases.filter((p) => {
    const age = now - new Date(p.date).getTime();
    return age > ms30 && age <= ms30 * 2;
  });

  const alerts = [];
  const products = [...new Set(purchases.map((p) => p.product))];

  products.forEach((product) => {
    const cur = current.filter((p) => p.product === product);
    const prev = previous.filter((p) => p.product === product);
    if (!cur.length || !prev.length) return;
    const curAvg = cur.reduce((s, p) => s + p.pricePerKg, 0) / cur.length;
    const prevAvg = prev.reduce((s, p) => s + p.pricePerKg, 0) / prev.length;
    if (prevAvg <= 0) return;
    const pctChange = ((curAvg - prevAvg) / prevAvg) * 100;
    if (pctChange >= 10) {
      alerts.push({
        id: `feed-inflation-${norm(product)}`,
        product,
        currentPricePerKg: Math.round(curAvg),
        previousPricePerKg: Math.round(prevAvg),
        pctChange: Math.round(pctChange * 10) / 10,
        severity: pctChange >= 15 ? 'critique' : 'orange',
        message: `Aliment « ${product} » : +${pctChange.toFixed(1)}% vs période précédente (${Math.round(prevAvg)} → ${Math.round(curAvg)} FCFA/kg). Vérifier fournisseur et négocier ou changer.`,
      });
    }
  });

  console.info('[buildFeedInflationAlerts]', { alerts: alerts.length });
  return { purchases, alerts };
}

/** Saisonnalité météo vs performance (IC, mortalité, ponte par mois). */
export function buildSeasonalityWeatherAnalysis(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const meteo = options.meteo || dataMap.meteo || {};
  const currentTemp = num(meteo.temperature ?? meteo.temp ?? 28);
  const currentHumidity = num(meteo.humidity ?? meteo.humidite ?? 60);

  const monthlyStats = new Map();
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  productionLogs.forEach((log) => {
    const d = logDate(log);
    if (!d) return;
    const mk = d.slice(0, 7);
    const m = monthlyStats.get(mk) || { month: mk, eggs: 0, days: new Set(), mortality: 0, feedKg: 0 };
    m.eggs += num(log.oeufs_produits ?? log.eggs);
    m.days.add(d);
    monthlyStats.set(mk, m);
  });

  alimentationLogs.forEach((log) => {
    const mk = logDate(log).slice(0, 7);
    if (!mk) return;
    const m = monthlyStats.get(mk) || { month: mk, eggs: 0, days: new Set(), mortality: 0, feedKg: 0 };
    m.feedKg += num(log.quantite ?? log.quantity);
    monthlyStats.set(mk, m);
  });

  lots.forEach((lot) => {
    const mk = String(lot.date_debut || lot.date_entree || lot.created_at || '').slice(0, 7);
    if (!mk) return;
    const m = monthlyStats.get(mk) || { month: mk, eggs: 0, days: new Set(), mortality: 0, feedKg: 0 };
    m.mortality += avicoleDeadCount(lot);
    monthlyStats.set(mk, m);
  });

  const rows = [...monthlyStats.values()].map((m) => {
    const monthNum = Number(m.month.slice(5, 7)) - 1;
    const isHotSeason = monthNum >= 3 && monthNum <= 4;
    const birds = lots.reduce((s, l) => s + avicoleActiveCount(l), 0) || 1;
    const dayCount = m.days.size || 1;
    const layingRate = safeDiv(m.eggs, birds * dayCount) * 100;
    const icProxy = m.eggs > 0 ? safeDiv(m.feedKg, m.eggs / 12) : null;
    return {
      month: m.month,
      monthLabel: monthNames[monthNum] || m.month,
      layingRate: Math.round(layingRate * 10) / 10,
      icProxy: icProxy != null ? Math.round(icProxy * 100) / 100 : null,
      mortality: m.mortality,
      isHotSeason,
      alert: isHotSeason && layingRate > 0 && layingRate < 75,
    };
  }).sort((a, b) => a.month.localeCompare(b.month));

  const hotMonths = rows.filter((r) => r.isHotSeason && r.layingRate > 0);
  const avgHotLaying = hotMonths.length ? hotMonths.reduce((s, r) => s + r.layingRate, 0) / hotMonths.length : 0;
  const coolMonths = rows.filter((r) => !r.isHotSeason && r.layingRate > 0);
  const avgCoolLaying = coolMonths.length ? coolMonths.reduce((s, r) => s + r.layingRate, 0) / coolMonths.length : 0;
  const seasonalDrop = avgCoolLaying > 0 ? avgCoolLaying - avgHotLaying : 0;

  const currentMonth = monthKey();
  const isCurrentlyHot = currentTemp >= 32 || (Number(currentMonth.slice(5, 7)) >= 4 && Number(currentMonth.slice(5, 7)) <= 5);

  const insights = [];
  if (seasonalDrop >= 5) {
    insights.push({
      id: 'seasonality-heat-laying',
      type: 'saisonnalité',
      message: `En saison chaude (avr/mai), la ponte baisse en moyenne de ${seasonalDrop.toFixed(1)} pts vs autres mois. Anticiper brumisation et densité réduite.`,
      seasonalDropPct: Math.round(seasonalDrop * 10) / 10,
    });
  }
  if (isCurrentlyHot && currentTemp >= 35) {
    insights.push({
      id: 'seasonality-current-heat',
      type: 'alerte_immédiate',
      message: `Température actuelle ${currentTemp}°C, humidité ${currentHumidity}%. Risque IC et mortalité élevés — surveiller consommation et ponte quotidiennement.`,
    });
  }

  console.info('[buildSeasonalityWeatherAnalysis]', { rows: rows.length, insights: insights.length });
  return { rows, insights, currentTemp, currentHumidity, seasonalDropPct: Math.round(seasonalDrop * 10) / 10 };
}

/** Démarque : stock théorique vs réel (œufs, aliment). */
export function buildStockShrinkageAnalysis(dataMap = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const stocks = arr(dataMap.stock || dataMap.stocks);

  const alerts = [];

  lots.filter((l) => inferWorkshopFromLot(l) === 'pondeuses').forEach((lot) => {

    const logs = productionLogs.filter((r) => lotIdOf(r) === String(lot.id));
    const theoreticalEggs = logs.reduce((s, r) => s + num(r.oeufs_produits ?? r.eggs), 0);
    const soldEggs = salesOrders
      .filter((o) => lotIdOf(o) === String(lot.id) || norm(o.product_name || o.libelle || '').includes('oeuf'))
      .reduce((s, o) => s + num(o.quantite ?? o.qty ?? 0), 0);
    if (theoreticalEggs > 0 && soldEggs >= 0) {
      const shrinkPct = safeDiv(theoreticalEggs - soldEggs, theoreticalEggs) * 100;
      if (shrinkPct > 2) {
        alerts.push({
          id: `shrink-eggs-${lot.id}`,
          lotId: lot.id,
          lotName: lot.name || lot.nom || lot.id,
          type: 'oeufs',
          theoretical: Math.round(theoreticalEggs),
          actual: Math.round(soldEggs),
          shrinkPct: Math.round(shrinkPct * 10) / 10,
          lossValue: Math.round((theoreticalEggs - soldEggs) * num(lot.prix_oeuf ?? 25)),
          message: `Écart ponte/vente ${shrinkPct.toFixed(1)}% sur ${lot.name || lot.id} — casse, vol ou coulage possible.`,
        });
      }
    }
  });

  const theoreticalFeedKg = lots.reduce((sum, lot) => {
    const pivot = buildLotPivotContext(lot);
    const birds = avicoleActiveCount(lot);
    const std = feedStandardKgPerBird(pivot.workshop, pivot.ageDays);
    return sum + birds * std;
  }, 0);

  const actualFeedKg = alimentationLogs.reduce((s, l) => s + num(l.quantite ?? l.quantity), 0);
  if (theoreticalFeedKg > 0 && actualFeedKg > 0) {
    const overPct = safeDiv(actualFeedKg - theoreticalFeedKg, theoreticalFeedKg) * 100;
    if (overPct > 10) {
      alerts.push({
        id: 'shrink-feed-global',
        type: 'aliment',
        theoretical: Math.round(theoreticalFeedKg),
        actual: Math.round(actualFeedKg),
        shrinkPct: Math.round(overPct * 10) / 10,
        message: `Surconsommation aliment +${overPct.toFixed(1)}% vs standard souche. Vérifier coulage, gaspillage ou rats.`,
      });
    }
  }

  const feedStock = stocks
    .filter((s) => FEED_PATTERNS.some((p) => norm(`${s.nom || ''} ${s.categorie || ''}`).includes(p)))
    .reduce((s, st) => s + num(st.quantite ?? st.quantity), 0);

  console.info('[buildStockShrinkageAnalysis]', { alerts: alerts.length });
  return { alerts, theoreticalFeedKg: Math.round(theoreticalFeedKg), actualFeedKg: Math.round(actualFeedKg), feedStockKg: Math.round(feedStock) };
}

/** Qualité lots par client : poids/calibre vs prix net. */
export function buildLotQualityByClient(dataMap = {}) {
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const clients = arr(dataMap.clients);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);

  const clientMap = new Map(clients.map((c) => [String(c.id), c.nom || c.name || c.id]));

  const rows = salesOrders
    .filter((o) => amount(o) > 0)
    .map((order) => {
      const clientId = String(order.client_id || order.customer_id || '');
      const clientName = order.client_nom || order.customer_name || clientMap.get(clientId) || 'Client';
      const qty = num(order.quantite ?? order.qty ?? 1);
      const total = amount(order);
      const unitPrice = safeDiv(total, qty);
      const lotId = lotIdOf(order);
      const lot = lots.find((l) => String(l.id) === lotId);
      const animal = animaux.find((a) => String(a.id) === lotId);
      let avgWeight = null;
      let productType = 'stock';
      if (lot) {
        productType = inferWorkshopFromLot(lot) === 'pondeuses' ? 'oeufs' : 'volaille';
        avgWeight = num(lot.poids_moyen_actuel ?? lot.poids_moyen) / (productType === 'volaille' ? 1000 : 1);
      } else if (animal) {
        productType = 'bovins';
        avgWeight = num(animal.poids_actuel ?? animal.poids);
      }
      const triStrict = norm(order.notes || order.commentaire || '').includes('tri') || norm(order.exigence || '').includes('calibr');
      const marginScore = triStrict && unitPrice < 5000 ? 'faible' : unitPrice >= 5000 ? 'bonne' : 'moyenne';
      return {
        id: order.id,
        clientName,
        clientId,
        productType,
        qty,
        total,
        unitPrice: Math.round(unitPrice),
        avgWeight: avgWeight != null ? Math.round(avgWeight * 100) / 100 : null,
        triStrict,
        marginScore,
        alert: triStrict && marginScore === 'faible',
        message: triStrict && marginScore === 'faible'
          ? `${clientName} exige un tri strict pour seulement +${Math.round(unitPrice)} FCFA/unité — rentabilité faible.`
          : null,
      };
    });

  const clientRanking = [...rows.reduce((map, row) => {
    const prev = map.get(row.clientName) || { client: row.clientName, orders: 0, revenue: 0, alerts: 0, avgUnitPrice: 0 };
    prev.orders += 1;
    prev.revenue += row.total;
    if (row.alert) prev.alerts += 1;
    prev.avgUnitPrice = safeDiv(prev.revenue, prev.orders);
    map.set(row.clientName, prev);
    return map;
  }, new Map()).values()].sort((a, b) => b.revenue - a.revenue);

  const insights = rows.filter((r) => r.alert).map((r) => ({
    id: `client-quality-${r.id}`,
    clientName: r.clientName,
    message: r.message,
  }));

  console.info('[buildLotQualityByClient]', { rows: rows.length, insights: insights.length });
  return { rows: rows.slice(0, 50), clientRanking: clientRanking.slice(0, 10), insights };
}

export function buildCrossAnalyticsPlan(dataMap = {}, options = {}) {
  return {
    veterinaires: buildVetPerformanceComparison(dataMap),
    feedInflation: buildFeedInflationAlerts(dataMap),
    seasonality: buildSeasonalityWeatherAnalysis(dataMap, options),
    shrinkage: buildStockShrinkageAnalysis(dataMap),
    clientQuality: buildLotQualityByClient(dataMap),
  };
}

export default buildCrossAnalyticsPlan;
