import { getCalculatedAnimalFeedingCost, getLotFeedingCategory } from './alimentation';
import { toNumber } from './format';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value || 0)));
const clean = (value) => String(value || '').trim().toLowerCase();
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const daysAgo = (days) => Date.now() - days * 86400000;
const healthBaseScore = { sain: 92, actif: 88, a_surveiller: 72, sous_traitement: 65, blesse: 55, malade: 42, critique: 25 };
const money = (row = {}) => toNumber(row.montant_total ?? row.total_cost ?? row.cout_total ?? row.montant ?? row.amount ?? row.cost ?? row.cout ?? row.coût ?? 0);
const linkedId = (row = {}) => String(row.lot_id || row.cible_id || row.target_id || row.entity_id || row.source_id || row.source_record_id || row.related_id || '').trim();
const purchaseCostOfLot = (lot = {}) => toNumber(lot.cout_total_achat ?? lot.cout_achat_bande ?? lot.purchase_cost ?? lot.cout_poussins ?? lot.cout_achat ?? 0);
const saleUnitOfLot = (lot = {}) => toNumber(lot.prix_unitaire_vente ?? lot.unit_sale_price ?? lot.prix_vente_sujet ?? 0);
const saleEstimateOfLot = (lot = {}, current = 0) => {
  const direct = toNumber(lot.prix_vente_estime ?? lot.estimated_sale_price ?? lot.valeur_vente_estimee ?? lot.sale_value_estimated ?? lot.revenuEstime ?? lot.revenu_estime ?? 0);
  if (direct > 0) return direct;
  const unit = saleUnitOfLot(lot);
  return unit > 0 && current > 0 ? unit * current : 0;
};
const isLinkedToLot = (row = {}, lot = {}, category = '') => {
  const id = String(lot.id || '').trim();
  const direct = linkedId(row);
  if (id && direct && direct === id) return true;
  if (row.type_cible === 'lot_avicole' && id && String(row.cible_id || '') === id) return true;
  if (!direct && category && row.categorie === category) return true;
  const text = clean(`${row.libelle || ''} ${row.title || ''} ${row.description || ''} ${row.notes || ''} ${row.product_name || ''}`);
  return Boolean(id && text.includes(clean(id)));
};
const dateOnly = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const addDaysToDate = (value, days) => { if (!value) return ''; const date = new Date(value); date.setDate(date.getDate() + Number(days || 0)); return dateOnly(date); };
const addMonthsToDate = (value, months) => { if (!value) return ''; const date = new Date(value); date.setMonth(date.getMonth() + Number(months || 0)); return dateOnly(date); };

export const isLayerLot = (lot = {}) => ['pondeuse', 'pondeuses'].includes(clean(lot.type)) || lot.type === 'Pondeuse';
export const isBroilerLot = (lot = {}) => ['chair', 'poulet_chair', 'poulets_chair'].includes(clean(lot.type)) || lot.type === 'Chair';

export const calculateLotCurrentCount = (lot = {}) => {
  const initial = toNumber(lot.initial_count ?? lot.effectif_initial);
  const losses = toNumber(lot.mortality) + toNumber(lot.vols) + toNumber(lot.vendus) + toNumber(lot.reformes) + toNumber(lot.sorties);
  return Math.max(0, initial - losses);
};

export const getLotDefaultCycle = (lot = {}) => {
  if (isLayerLot(lot)) return { value: 18, unit: 'mois' };
  if (isBroilerLot(lot)) return { value: 45, unit: 'jours' };
  return { value: 1, unit: 'mois' };
};

export const calculateLotEndDate = (lot = {}) => {
  if (!lot.date_debut) return '';
  const defaults = getLotDefaultCycle(lot);
  const value = toNumber(lot.duree_cycle_valeur || defaults.value);
  const unit = lot.duree_cycle_unite || defaults.unit;
  return unit === 'jours' ? addDaysToDate(lot.date_debut, value) : addMonthsToDate(lot.date_debut, value);
};

export const calculateLotAgeDays = (lot = {}) => {
  if (!lot.date_debut) return null;
  const start = new Date(lot.date_debut).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000));
};

export const calculateEggProductionMetrics = ({ lot = {}, productionLogs = [] }) => {
  const currentCount = calculateLotCurrentCount(lot) || toNumber(lot.current_count);
  const lotLogs = productionLogs
    .filter((log) => log.lot_id === lot.id || linkedId(log) === String(lot.id))
    .map((log) => {
      const eggsProduced = toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
      const brokenEggs = toNumber(log.oeufs_casses ?? log.broken ?? log.casses ?? log.pertes);
      const sellableEggs = Math.max(0, eggsProduced - brokenEggs);
      return { ...log, _time: log.date ? new Date(log.date).getTime() : 0, eggsProduced, brokenEggs, sellableEggs, trays: Math.floor(sellableEggs / 30), layingRate: currentCount > 0 ? (eggsProduced / currentCount) * 100 : toNumber(log.taux_ponte) };
    })
    .sort((a, b) => a._time - b._time);
  const today = todayKey();
  const todayLogs = lotLogs.filter((log) => dateKey(log.date) === today);
  const since7 = lotLogs.filter((log) => log._time >= daysAgo(7));
  const since30 = lotLogs.filter((log) => log._time >= daysAgo(30));
  const sum = (items, key) => items.reduce((total, item) => total + toNumber(item[key]), 0);
  const avg = (items, key) => (items.length ? sum(items, key) / items.length : 0);
  const todayEggs = sum(todayLogs, 'eggsProduced') || toNumber(lot.productionJour ?? lot.productionjour);
  const todayBroken = sum(todayLogs, 'brokenEggs') || toNumber(lot.oeufs_casses);
  const todaySellable = Math.max(0, todayEggs - todayBroken);
  return { logs: lotLogs, todayEggs, todayBroken, todaySellable, todayTrays: Math.floor(todaySellable / 30), todayLayingRate: currentCount > 0 ? (todayEggs / currentCount) * 100 : toNumber(lot.taux_ponte), avg7Eggs: avg(since7, 'eggsProduced'), avg30Eggs: avg(since30, 'eggsProduced'), avg7LayingRate: avg(since7, 'layingRate'), avg30LayingRate: avg(since30, 'layingRate'), totalBroken: sum(lotLogs, 'brokenEggs'), totalSellable: sum(lotLogs, 'sellableEggs'), totalTrays: sum(lotLogs, 'trays') };
};

export const enrichProductionEggLogs = ({ logs = [], lots = [] }) => logs.map((log) => {
  const lot = lots.find((item) => item.id === log.lot_id) || {};
  const currentCount = calculateLotCurrentCount(lot) || toNumber(lot.current_count);
  const eggsProduced = toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
  const brokenEggs = toNumber(log.oeufs_casses ?? log.broken ?? log.casses ?? log.pertes);
  const sellableEggs = Math.max(0, eggsProduced - brokenEggs);
  return { ...log, lot_name: lot.name || log.lot_id, lot_type: lot.type || '', effectif_actuel: currentCount, oeufs_vendables: sellableEggs, plateaux: Math.floor(sellableEggs / 30), taux_ponte_calcule: currentCount > 0 ? (eggsProduced / currentCount) * 100 : toNumber(log.taux_ponte) };
});

export const calculateLotMetrics = ({ lot = {}, feedingLogs = [], productionLogs = [] } = {}) => {
  const initial = toNumber(lot.initial_count ?? lot.effectif_initial);
  const current = calculateLotCurrentCount(lot);
  const mortality = toNumber(lot.mortality);
  const malades = toNumber(lot.malades);
  const vols = toNumber(lot.vols);
  const vendus = toNumber(lot.vendus);
  const reformes = toNumber(lot.reformes);
  const sorties = toNumber(lot.sorties);
  const healthCost = toNumber(lot.frais_sante ?? lot.sante ?? lot.cout_sante ?? lot.health_cost);
  const otherCosts = toNumber(lot.autres_frais ?? lot.frais_directs ?? lot.other_costs);
  const chickCost = purchaseCostOfLot(lot);
  const expectedSalePrice = toNumber(lot.prix_vente_prevu ?? lot.prix_vente_estime ?? lot.estimated_sale_price);
  const realSalePrice = toNumber(lot.prix_vente_reel ?? lot.sale_price);
  const category = getLotFeedingCategory(lot);
  const lotFeedingLogs = feedingLogs.filter((log) => isLinkedToLot(log, lot, category));
  const feedingCost = lotFeedingLogs.reduce((sum, log) => sum + money(log), 0);
  const coveredDays = lotFeedingLogs.reduce((sum, log) => sum + toNumber(log.duree_jours ?? log.days), 0);
  const eggMetrics = calculateEggProductionMetrics({ lot, productionLogs });
  const productionJour = isLayerLot(lot) ? eggMetrics.todayEggs : toNumber(lot.productionJour ?? lot.productionjour);
  const losses = mortality + vols + vendus + reformes + sorties;
  const survivalRate = initial > 0 ? (current / initial) * 100 : 0;
  const mortalityRate = initial > 0 ? (mortality / initial) * 100 : 0;
  const morbidityRate = current > 0 ? (malades / current) * 100 : 0;
  const theftRate = initial > 0 ? (vols / initial) * 100 : 0;
  const layingRate = isLayerLot(lot) ? eggMetrics.todayLayingRate : toNumber(lot.taux_ponte);
  const autoHealthScore = clamp(100 - mortalityRate * 2 - morbidityRate * 2.5 - theftRate * 1.5);
  const scoreSante = toNumber(lot.scoresSante ?? lot.scores_sante) || healthBaseScore[lot.health_status] || autoHealthScore;
  const grossRevenue = realSalePrice > 0 ? realSalePrice * Math.max(vendus, current || 1) : saleEstimateOfLot(lot, current) || expectedSalePrice * current;
  const totalCosts = feedingCost + healthCost + otherCosts + chickCost;
  const estimatedMargin = toNumber(lot.marge) || grossRevenue - totalCosts;
  const costPerHead = current > 0 ? feedingCost / current : 0;
  const costPerHeadPerDay = current > 0 && coveredDays > 0 ? feedingCost / current / coveredDays : 0;
  const totalCostPerHead = current > 0 ? totalCosts / current : 0;
  const marginPerHead = current > 0 ? estimatedMargin / current : 0;
  return { currentCount: current, losses, feedingCost, healthCost, otherCosts, chickCost, totalCosts, totalCost: totalCosts, survivalRate, mortalityRate, morbidityRate, theftRate, layingRate, scoreSante, estimatedMargin, marginEstimated: estimatedMargin, marginReal: realSalePrice > 0 ? grossRevenue - totalCosts : 0, grossRevenue, costPerHead, costPerHeadPerDay, totalCostPerHead, marginPerHead, productionPerHead: current > 0 ? productionJour / current : 0, eggMetrics, isLayer: isLayerLot(lot), isBroiler: isBroilerLot(lot), linkedFeedingLogs: lotFeedingLogs };
};

export const suggestLotPhase = (lot = {}, metrics = calculateLotMetrics({ lot })) => {
  const age = calculateLotAgeDays(lot);
  if (age === null) return { label: 'Date début à renseigner', value: '', reason: 'Impossible de calculer âge et phase sans date début.' };
  if (isBroilerLot(lot)) {
    if (age <= 7) return { label: 'Démarrage', value: 'demarrage', reason: '0 à 7 jours.' };
    if (age <= 21) return { label: 'Croissance', value: 'croissance', reason: '8 à 21 jours.' };
    if (age <= 35) return { label: 'Finition', value: 'finition', reason: '22 à 35 jours.' };
    return { label: 'Prêt à la vente recommandé', value: 'pret_a_la_vente', reason: 'Âge supérieur à 35 jours.' };
  }
  if (isLayerLot(lot)) {
    if (age < 120) return { label: 'Croissance', value: 'en_croissance', reason: 'Lot avant entrée en ponte.' };
    if (age < 160) return { label: 'Entrée en ponte', value: 'entree_ponte', reason: 'Début production attendu.' };
    if (age < 520 && toNumber(metrics.layingRate) >= 65) return { label: 'En ponte', value: 'en_ponte', reason: 'Cycle productif actif.' };
    return { label: 'Fin de cycle / réforme possible', value: 'a_reformer', reason: 'Âge avancé ou ponte à surveiller.' };
  }
  return { label: lot.phase || 'Suivi', value: lot.phase || '', reason: 'Type lot non spécialisé.' };
};

export const calculateLotSaleReadiness = (lot = {}, metrics = calculateLotMetrics({ lot })) => {
  const age = calculateLotAgeDays(lot);
  const expectedEnd = calculateLotEndDate(lot);
  const current = metrics.currentCount ?? calculateLotCurrentCount(lot);
  const weightOk = !toNumber(lot.poids_objectif) || toNumber(lot.weight_avg ?? lot.poids_moyen_actuel) >= toNumber(lot.poids_objectif);
  const healthOk = ['sain', 'a_surveiller'].includes(lot.health_status || 'sain');
  const mortalityOk = toNumber(metrics.mortalityRate) < 5;
  const marginOk = toNumber(metrics.estimatedMargin) >= 0;
  const cycleReached = age !== null && expectedEnd && new Date() >= new Date(expectedEnd);
  const criteria = [{ label: 'Date début renseignée', ok: age !== null }, { label: 'Cycle atteint', ok: cycleReached }, { label: 'Poids objectif OK', ok: weightOk }, { label: 'Santé lot OK', ok: healthOk }, { label: 'Mortalité sous seuil', ok: mortalityOk }, { label: 'Effectif vendable disponible', ok: current > 0 }, { label: 'Marge estimée positive', ok: marginOk }];
  const score = Math.round((criteria.filter((item) => item.ok).length / criteria.length) * 100);
  return { score, status: score >= 86 ? 'recommande_pret' : score >= 65 ? 'presque_pret' : 'non_pret', recommended: score >= 86, reason: criteria.filter((item) => item.ok).map((item) => item.label).join(', '), missing: criteria.filter((item) => !item.ok).map((item) => item.label), ageDays: age, expectedEndDate: expectedEnd };
};

export const calculateAnimalMetrics = ({ animal = {}, animals = [], feedingLogs = [], vaccins = [] } = {}) => {
  const feedingCost = getCalculatedAnimalFeedingCost({ animal, feedingLogs, animals });
  const healthCost = toNumber(animal.frais_sante ?? animal.sante);
  const otherCosts = toNumber(animal.autres_frais);
  const purchaseCost = toNumber(animal.purchase_cost ?? animal.prix_achat ?? animal.cout_achat);
  const salePrice = toNumber(animal.prix_vente_reel ?? animal.sale_price ?? animal.prix_vente);
  const totalCost = purchaseCost + feedingCost + healthCost + otherCosts;
  const margin = salePrice > 0 ? salePrice - totalCost : null;
  const relatedVaccins = vaccins.filter((vaccin) => String(vaccin.animal || '').includes(animal.id) || String(vaccin.animal || '').includes(animal.tag));
  const overdueVaccines = relatedVaccins.filter((vaccin) => vaccin.statut === 'retard').length;
  const healthScore = clamp(toNumber(animal.score_sante) || (healthBaseScore[animal.health_status || animal.status] || 80) - overdueVaccines * 12);
  return { feedingCost, healthCost, otherCosts, purchaseCost, salePrice, totalCost, margin, marginRate: salePrice > 0 && totalCost > 0 ? (margin / totalCost) * 100 : 0, healthScore, overdueVaccines, relatedVaccins };
};

export const buildLotAlerts = (lot = {}, metrics = calculateLotMetrics({ lot })) => {
  const alerts = [];
  const initial = toNumber(lot.initial_count);
  if (metrics.losses > initial) alerts.push({ severity: 'critique', message: "Effectif incohérent: les sorties dépassent l'effectif initial." });
  if (metrics.mortalityRate >= 5) alerts.push({ severity: 'critique', message: 'Mortalité élevée: isoler les sujets faibles et contacter le vétérinaire.' });
  if (metrics.theftRate >= 2) alerts.push({ severity: 'warning', message: 'Vols élevés: vérifier clôtures, accès et caméras.' });
  if (metrics.morbidityRate >= 3) alerts.push({ severity: 'warning', message: 'Malades élevés: renforcer observation sanitaire et hygiène.' });
  if (metrics.isLayer && metrics.layingRate > 0 && metrics.layingRate < 65) alerts.push({ severity: 'warning', message: 'Production œufs faible: contrôler stress, eau, alimentation et lumière.' });
  if (metrics.estimatedMargin < 0) alerts.push({ severity: 'critique', message: 'Marge négative: revoir coûts, prix de vente ou calendrier.' });
  return alerts;
};

export const calculateCultureMetrics = (culture = {}) => {
  const costTotal = toNumber(culture.cout_total) || toNumber(culture.cout_semences) + toNumber(culture.cout_engrais) + toNumber(culture.cout_eau) + toNumber(culture.cout_main_oeuvre) + toNumber(culture.cout_traitement);
  const harvested = toNumber(culture.quantite_recoltee);
  const expected = toNumber(culture.quantite_prevue);
  const surface = toNumber(culture.surface);
  const revenueEstimated = toNumber(culture.revenu_estime);
  const revenueReal = toNumber(culture.revenu_reel);
  const losses = toNumber(culture.pertes);
  return { costTotal, rendement: toNumber(culture.rendement) || (surface > 0 ? (harvested || expected) / surface : 0), marginEstimated: toNumber(culture.marge_estimee) || revenueEstimated - costTotal, marginReal: toNumber(culture.marge_reelle) || (revenueReal > 0 ? revenueReal - costTotal : 0), lossRate: expected > 0 ? (losses / expected) * 100 : 0, healthScore: clamp(toNumber(culture.score_sante) || 90 - (expected > 0 ? (losses / expected) * 100 : 0)) };
};

export const calculateClientMetrics = (client = {}) => {
  const total = toNumber(client.total_achats ?? client.total ?? client.ca ?? client.chiffre_affaires);
  const ordersCount = toNumber(client.commandes ?? client.orders_count ?? client.nb_commandes);
  const averageBasketEstimate = ordersCount > 0 ? total / ordersCount : toNumber(client.panier_moyen ?? client.average_basket);
  const score = clamp(toNumber(client.score ?? client.note ?? 0) * 20 || toNumber(client.loyaltyScore ?? client.loyalty_score ?? 0) || 50);
  return { total, ordersCount, averageBasketEstimate, loyaltyScore: score, score };
};

export const calculateSupplierMetrics = (supplier = {}) => {
  const note = toNumber(supplier.note ?? supplier.score ?? supplier.rating ?? 0);
  const dettes = toNumber(supplier.dettes ?? supplier.solde_du ?? supplier.amount_due ?? 0);
  const livraisons = toNumber(supplier.livraisons ?? supplier.deliveries ?? supplier.nb_livraisons ?? 0);
  const achats = toNumber(supplier.achats ?? supplier.total_achats ?? supplier.purchase_total ?? 0);
  const reliabilityScore = clamp((note || 3) * 20 - (dettes > 0 ? 15 : 0) + Math.min(20, livraisons));
  return { note, dettes, livraisons, achats, reliabilityScore, riskScore: clamp(100 - reliabilityScore) };
};

export const calculateStockMetrics = (stock = {}) => {
  const quantity = toNumber(stock.quantite ?? stock.quantity ?? stock.qty ?? stock.stock ?? stock.current_stock);
  const threshold = toNumber(stock.seuil_alerte ?? stock.threshold ?? stock.min_stock ?? stock.stock_min ?? stock.minimum);
  const unitCost = toNumber(stock.prix_unitaire ?? stock.unit_cost ?? stock.cost ?? stock.cout_unitaire);
  const value = toNumber(stock.valeur_stock ?? stock.stock_value) || quantity * unitCost;
  const critical = threshold > 0 ? quantity <= threshold : quantity <= 0;
  return { quantity, threshold, unitCost, value, critical, stockValue: value };
};
