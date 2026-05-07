import { getCalculatedAnimalFeedingCost, getLotFeedingCategory } from './alimentation';
import { toNumber } from './format';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value || 0)));

const healthBaseScore = {
  sain: 92,
  actif: 88,
  a_surveiller: 72,
  sous_traitement: 65,
  blesse: 55,
  malade: 42,
  critique: 25,
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const daysAgo = (days) => Date.now() - days * 86400000;

export const isLayerLot = (lot = {}) => ['pondeuse', 'pondeuses'].includes(String(lot.type || '').toLowerCase()) || lot.type === 'Pondeuse';
export const isBroilerLot = (lot = {}) => ['chair', 'poulet_chair', 'poulets_chair'].includes(String(lot.type || '').toLowerCase()) || lot.type === 'Chair';

export const calculateLotCurrentCount = (lot = {}) => {
  const initial = toNumber(lot.initial_count);
  const losses =
    toNumber(lot.mortality) +
    toNumber(lot.vols) +
    toNumber(lot.vendus) +
    toNumber(lot.reformes) +
    toNumber(lot.sorties);
  return Math.max(0, initial - losses);
};

const dateOnly = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const addDaysToDate = (value, days) => {
  if (!value) return '';
  const date = new Date(value);
  date.setDate(date.getDate() + Number(days || 0));
  return dateOnly(date);
};
const addMonthsToDate = (value, months) => {
  if (!value) return '';
  const date = new Date(value);
  date.setMonth(date.getMonth() + Number(months || 0));
  return dateOnly(date);
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

export const suggestLotPhase = (lot = {}, metrics = {}) => {
  const age = calculateLotAgeDays(lot);
  if (age === null) return { label: 'Date debut a renseigner', value: '', reason: 'Impossible de calculer age et phase sans date debut.' };
  if (isBroilerLot(lot)) {
    if (age <= 7) return { label: 'Demarrage', value: 'demarrage', reason: '0 a 7 jours.' };
    if (age <= 21) return { label: 'Croissance', value: 'croissance', reason: '8 a 21 jours.' };
    if (age <= 35) return { label: 'Finition', value: 'finition', reason: '22 a 35 jours.' };
    return { label: 'Pret a la vente recommande', value: 'pret_a_la_vente', reason: 'Age superieur a 35 jours.' };
  }
  if (isLayerLot(lot)) {
    if (age < 120) return { label: 'Croissance', value: 'en_croissance', reason: 'Lot encore avant entree en ponte.' };
    if (age < 160) return { label: 'Entree en ponte', value: 'entree_ponte', reason: 'Debut de production attendu.' };
    if (age < 520 && toNumber(metrics.layingRate) >= 65) return { label: 'En ponte', value: 'en_ponte', reason: 'Cycle productif actif.' };
    if (toNumber(metrics.layingRate) > 0 && toNumber(metrics.layingRate) < 60) return { label: 'Baisse ponte / a surveiller', value: 'baisse_ponte', reason: 'Taux de ponte sous seuil.' };
    return { label: 'Fin de cycle / reforme possible', value: 'a_reformer', reason: 'Age avance ou ponte a surveiller.' };
  }
  return { label: lot.phase || 'Suivi', value: lot.phase || '', reason: 'Type lot non specialise.' };
};

export const calculateLotSaleReadiness = (lot = {}, metrics = calculateLotMetrics({ lot })) => {
  const age = calculateLotAgeDays(lot);
  const expectedEnd = calculateLotEndDate(lot);
  const current = metrics.currentCount ?? calculateLotCurrentCount(lot);
  const weightOk = !toNumber(lot.poids_objectif) || toNumber(lot.weight_avg) >= toNumber(lot.poids_objectif);
  const healthOk = ['sain', 'a_surveiller'].includes(lot.health_status || 'sain');
  const mortalityOk = toNumber(metrics.mortalityRate) < 5;
  const marginOk = toNumber(metrics.estimatedMargin) >= 0;
  const cycleReached = age !== null && expectedEnd && new Date() >= new Date(expectedEnd);
  const criteria = [
    { label: 'Date debut renseignee', ok: age !== null },
    { label: 'Cycle atteint', ok: cycleReached },
    { label: 'Poids objectif OK', ok: weightOk },
    { label: 'Sante lot OK', ok: healthOk },
    { label: 'Mortalite sous seuil', ok: mortalityOk },
    { label: 'Effectif vendable disponible', ok: current > 0 },
    { label: 'Marge estimee positive', ok: marginOk },
  ];
  const score = Math.round((criteria.filter((item) => item.ok).length / criteria.length) * 100);
  const status =
    score >= 86 ? 'recommande_pret' :
    score >= 65 ? 'presque_pret' :
    'non_pret';
  const missing = criteria.filter((item) => !item.ok).map((item) => item.label);
  return {
    score,
    status,
    recommended: score >= 86,
    reason: criteria.filter((item) => item.ok).map((item) => item.label).join(', '),
    missing,
    ageDays: age,
    expectedEndDate: expectedEnd,
  };
};

export const calculateAnimalMetrics = ({ animal = {}, animals = [], feedingLogs = [], vaccins = [] }) => {
  const feedingCost = getCalculatedAnimalFeedingCost({ animal, feedingLogs, animals });
  const healthCost = toNumber(animal.frais_sante ?? animal.sante);
  const otherCosts = toNumber(animal.autres_frais);
  const purchaseCost = toNumber(animal.purchase_cost);
  const salePrice = toNumber(animal.prix_vente_reel ?? animal.sale_price);
  const totalCost = purchaseCost + feedingCost + healthCost + otherCosts;
  const margin = salePrice > 0 ? salePrice - totalCost : null;
  const relatedVaccins = vaccins.filter((vaccin) => String(vaccin.animal || '').includes(animal.id) || String(vaccin.animal || '').includes(animal.tag));
  const overdueVaccines = relatedVaccins.filter((vaccin) => vaccin.statut === 'retard').length;
  const healthScore = clamp(toNumber(animal.score_sante) || (healthBaseScore[animal.health_status || animal.status] || 80) - overdueVaccines * 12);

  return {
    feedingCost,
    healthCost,
    otherCosts,
    purchaseCost,
    salePrice,
    totalCost,
    margin,
    marginRate: salePrice > 0 && totalCost > 0 ? (margin / totalCost) * 100 : 0,
    healthScore,
    overdueVaccines,
    relatedVaccins,
  };
};

export const enrichProductionEggLogs = ({ logs = [], lots = [] }) =>
  logs.map((log) => {
    const lot = lots.find((item) => item.id === log.lot_id) || {};
    const currentCount = calculateLotCurrentCount(lot) || toNumber(lot.current_count);
    const eggsProduced = toNumber(log.oeufs_produits);
    const brokenEggs = toNumber(log.oeufs_casses);
    const sellableEggs = Math.max(0, eggsProduced - brokenEggs);
    const trays = Math.floor(sellableEggs / 30);
    const layingRate = currentCount > 0 ? (eggsProduced / currentCount) * 100 : toNumber(log.taux_ponte);

    return {
      ...log,
      lot_name: lot.name || log.lot_id,
      lot_type: lot.type || '',
      effectif_actuel: currentCount,
      oeufs_vendables: sellableEggs,
      plateaux: trays,
      taux_ponte_calcule: layingRate,
    };
  });

export const calculateEggProductionMetrics = ({ lot = {}, productionLogs = [] }) => {
  const currentCount = calculateLotCurrentCount(lot) || toNumber(lot.current_count);
  const lotLogs = productionLogs
    .filter((log) => log.lot_id === lot.id)
    .map((log) => {
      const eggsProduced = toNumber(log.oeufs_produits);
      const brokenEggs = toNumber(log.oeufs_casses);
      const sellableEggs = Math.max(0, eggsProduced - brokenEggs);
      return {
        ...log,
        _time: log.date ? new Date(log.date).getTime() : 0,
        eggsProduced,
        brokenEggs,
        sellableEggs,
        trays: Math.floor(sellableEggs / 30),
        layingRate: currentCount > 0 ? (eggsProduced / currentCount) * 100 : toNumber(log.taux_ponte),
      };
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

  return {
    logs: lotLogs,
    todayEggs,
    todayBroken,
    todaySellable,
    todayTrays: Math.floor(todaySellable / 30),
    todayLayingRate: currentCount > 0 ? (todayEggs / currentCount) * 100 : toNumber(lot.taux_ponte),
    avg7Eggs: avg(since7, 'eggsProduced'),
    avg30Eggs: avg(since30, 'eggsProduced'),
    avg7LayingRate: avg(since7, 'layingRate'),
    avg30LayingRate: avg(since30, 'layingRate'),
    totalBroken: sum(lotLogs, 'brokenEggs'),
    totalSellable: sum(lotLogs, 'sellableEggs'),
    totalTrays: sum(lotLogs, 'trays'),
  };
};

export const calculateLotMetrics = ({ lot = {}, feedingLogs = [], productionLogs = [] }) => {
  const initial = toNumber(lot.initial_count);
  const current = calculateLotCurrentCount(lot);
  const mortality = toNumber(lot.mortality);
  const malades = toNumber(lot.malades);
  const vols = toNumber(lot.vols);
  const vendus = toNumber(lot.vendus);
  const reformes = toNumber(lot.reformes);
  const sorties = toNumber(lot.sorties);
  const revenuEstime = toNumber(lot.revenuEstime ?? lot.revenu_estime);
  const healthCost = toNumber(lot.frais_sante ?? lot.sante);
  const otherCosts = toNumber(lot.autres_frais);
  const chickCost = toNumber(lot.cout_poussins);
  const expectedSalePrice = toNumber(lot.prix_vente_prevu);
  const realSalePrice = toNumber(lot.prix_vente_reel);
  const category = getLotFeedingCategory(lot);
  const lotFeedingLogs = feedingLogs.filter((log) => log.type_cible === 'lot_avicole' && (log.cible_id ? log.cible_id === lot.id : log.categorie === category));
  const feedingCost = lotFeedingLogs.reduce((sum, log) => sum + toNumber(log.montant_total), 0);
  const coveredDays = lotFeedingLogs.reduce((sum, log) => sum + toNumber(log.duree_jours), 0);
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
  const grossRevenue = realSalePrice > 0 ? realSalePrice * Math.max(vendus, current || 1) : revenuEstime || expectedSalePrice * current;
  const totalCosts = feedingCost + healthCost + otherCosts + chickCost;
  const estimatedMargin = toNumber(lot.marge) || grossRevenue - totalCosts;
  const costPerHead = current > 0 ? feedingCost / current : 0;
  const costPerHeadPerDay = current > 0 && coveredDays > 0 ? feedingCost / current / coveredDays : 0;
  const totalCostPerHead = current > 0 ? totalCosts / current : 0;
  const marginPerHead = current > 0 ? estimatedMargin / current : 0;

  return {
    currentCount: current,
    losses,
    feedingCost,
    healthCost,
    otherCosts,
    chickCost,
    totalCosts,
    survivalRate,
    mortalityRate,
    morbidityRate,
    theftRate,
    layingRate,
    scoreSante,
    estimatedMargin,
    grossRevenue,
    costPerHead,
    costPerHeadPerDay,
    totalCostPerHead,
    marginPerHead,
    productionPerHead: current > 0 ? productionJour / current : 0,
    eggMetrics,
    isLayer: isLayerLot(lot),
    isBroiler: isBroilerLot(lot),
  };
};

export const buildLotAlerts = (lot = {}, metrics = calculateLotMetrics({ lot })) => {
  const alerts = [];
  const initial = toNumber(lot.initial_count);
  if (metrics.losses > initial) alerts.push({ severity: 'critique', message: 'Effectif incoherent: les sorties depassent l\'effectif initial.' });
  if (metrics.mortalityRate >= 5) alerts.push({ severity: 'critique', message: 'Mortalite elevee: isoler les sujets faibles et contacter le veterinaire.' });
  if (metrics.theftRate >= 2) alerts.push({ severity: 'warning', message: 'Vols eleves: verifier clotures, acces et cameras.' });
  if (metrics.morbidityRate >= 3) alerts.push({ severity: 'warning', message: 'Malades eleves: renforcer observation sanitaire et hygiene.' });
  if (metrics.isLayer && metrics.layingRate > 0 && metrics.layingRate < 65) alerts.push({ severity: 'warning', message: 'Production oeufs faible: controler stress, eau, alimentation et lumiere.' });
  if (metrics.isLayer && metrics.eggMetrics.todayBroken >= 10) alerts.push({ severity: 'warning', message: 'Oeufs casses eleves: verifier nids, manipulation et calcium.' });
  if (metrics.isBroiler && toNumber(lot.ic) > 2.2) alerts.push({ severity: 'warning', message: 'IC eleve: analyser qualite aliment et croissance.' });
  if (metrics.isBroiler && toNumber(lot.weight_avg) > 0 && toNumber(lot.weight_avg) < 1.5) alerts.push({ severity: 'info', message: 'Poids moyen faible: surveiller phase de croissance.' });
  if (metrics.estimatedMargin < 0) alerts.push({ severity: 'critique', message: 'Marge negative: revoir couts, prix de vente ou calendrier.' });
  return alerts;
};

export const calculateCultureMetrics = (culture = {}) => {
  const costTotal =
    toNumber(culture.cout_total) ||
    toNumber(culture.cout_semences) +
      toNumber(culture.cout_engrais) +
      toNumber(culture.cout_eau) +
      toNumber(culture.cout_main_oeuvre) +
      toNumber(culture.cout_traitement);
  const harvested = toNumber(culture.quantite_recoltee);
  const expected = toNumber(culture.quantite_prevue);
  const surface = toNumber(culture.surface);
  const revenueEstimated = toNumber(culture.revenu_estime);
  const revenueReal = toNumber(culture.revenu_reel);
  const losses = toNumber(culture.pertes);

  return {
    costTotal,
    rendement: toNumber(culture.rendement) || (surface > 0 ? (harvested || expected) / surface : 0),
    marginEstimated: toNumber(culture.marge_estimee) || revenueEstimated - costTotal,
    marginReal: toNumber(culture.marge_reelle) || (revenueReal > 0 ? revenueReal - costTotal : 0),
    lossRate: expected > 0 ? (losses / expected) * 100 : 0,
    healthScore: clamp(toNumber(culture.score_sante) || 90 - (expected > 0 ? (losses / expected) * 100 : 0)),
  };
};

export const calculateInvestmentMetrics = (investment = {}) => {
  const amount = toNumber(investment.montant);
  const gain = toNumber(investment.gain);
  const roi = amount > 0 ? (gain / amount) * 100 : toNumber(investment.roi);

  return {
    amount,
    gain,
    roi: toNumber(investment.roi) || roi,
    netGain: gain - amount,
    paybackProgress: amount > 0 ? clamp((gain / amount) * 100) : 0,
  };
};

const filterBpRows = (rows = [], bpId) => {
  if (!bpId) return rows || [];
  const filtered = (rows || []).filter((row) => row.business_plan_id === bpId);
  return filtered.length ? filtered : rows || [];
};

const getLineTotal = (line = {}) => toNumber(line.total || toNumber(line.quantite) * toNumber(line.prix_unitaire));
const getCostAmountForCycle = (cost = {}, durationMonths = 0) => {
  const amount = toNumber(cost.montant_mensuel);
  const frequency = cost.frequence || 'mensuelle';
  if (frequency === 'ponctuelle') return amount;
  if (frequency === 'trimestrielle') return amount * Math.ceil(durationMonths / 3);
  if (frequency === 'annuelle') return amount * Math.ceil(durationMonths / 12);
  return amount * durationMonths;
};

const transactionMatchesEntities = (transaction = {}, entityIds = []) => {
  if (!entityIds.length) return false;
  const keys = [
    transaction.lot_id,
    transaction.animal_id,
    transaction.culture_id,
    transaction.related_id,
    transaction.relatedId,
    transaction.entity_id,
  ].filter(Boolean).map(String);
  return keys.some((value) => entityIds.includes(value));
};

export const calculateBpVsReal = ({ bp = {}, links = [], transactions = [], lots = [], animaux = [], cultures = [] } = {}) => {
  const bpLinks = filterBpRows(links, bp.id);
  const linkedLotIds = bpLinks.filter((link) => link.entity_type === 'lot_avicole').map((link) => String(link.entity_id));
  const linkedAnimalIds = bpLinks.filter((link) => link.entity_type === 'animal').map((link) => String(link.entity_id));
  const linkedCultureIds = bpLinks.filter((link) => link.entity_type === 'culture').map((link) => String(link.entity_id));
  const linkedTransactionIds = bpLinks.filter((link) => link.entity_type === 'transaction').map((link) => String(link.entity_id));
  const allEntityIds = [...linkedLotIds, ...linkedAnimalIds, ...linkedCultureIds, ...linkedTransactionIds];

  const linkedTransactions = (transactions || []).filter((transaction) =>
    linkedTransactionIds.includes(String(transaction.id || '')) ||
    transaction.business_plan_id === bp.id ||
    transactionMatchesEntities(transaction, allEntityIds)
  );

  const caReel = linkedTransactions
    .filter((transaction) => transaction.type === 'entree')
    .reduce((sum, transaction) => sum + toNumber(transaction.montant), 0);
  const chargesReelles = linkedTransactions
    .filter((transaction) => transaction.type === 'sortie')
    .reduce((sum, transaction) => sum + toNumber(transaction.montant), 0);
  const margeReelle = caReel - chargesReelles;

  const linkedLots = (lots || []).filter((lot) => linkedLotIds.includes(String(lot.id)));
  const linkedAnimals = (animaux || []).filter((animal) => linkedAnimalIds.includes(String(animal.id)));
  const linkedCultures = (cultures || []).filter((culture) => linkedCultureIds.includes(String(culture.id)));
  const realHeads =
    linkedAnimals.length +
    linkedLots.reduce((sum, lot) => sum + toNumber(lot.current_count), 0);
  const realProduction =
    linkedCultures.reduce((sum, culture) => sum + toNumber(culture.quantite_recoltee || culture.quantite_recoltee_reelle), 0) ||
    linkedLots.reduce((sum, lot) => sum + toNumber(lot.vendus || lot.current_count), 0);

  return {
    caReel,
    chargesReelles,
    margeReelle,
    linkedTransactions,
    linkedLots,
    linkedAnimals,
    linkedCultures,
    realHeads,
    realProduction,
  };
};

export const calculateBusinessPlanMetrics = ({
  bp,
  plan,
  lines,
  investmentLines = [],
  costs,
  recurringCosts = [],
  projections,
  revenueProjections = [],
  fundings,
  fundingSources = [],
  links = [],
  transactions = [],
  lots = [],
  animaux = [],
  cultures = [],
} = {}) => {
  const currentBp = bp || plan || {};
  const bpId = currentBp.id;
  const planLines = filterBpRows(lines || investmentLines, bpId);
  const planCosts = filterBpRows(costs || recurringCosts, bpId);
  const planProjections = filterBpRows(projections || revenueProjections, bpId);
  const planFundings = filterBpRows(fundings || fundingSources, bpId);
  const planLinks = filterBpRows(links, bpId);

  const investissementInitial = planLines.reduce((sum, line) => sum + getLineTotal(line), 0);
  const chargesMensuelles = planCosts
    .filter((cost) => (cost.frequence || 'mensuelle') === 'mensuelle')
    .reduce((sum, cost) => sum + toNumber(cost.montant_mensuel), 0);
  const dureeCycleMois = toNumber(currentBp.duree_cycle_mois);
  const chargesCycleDepuisPlan = planCosts.reduce((sum, cost) => sum + getCostAmountForCycle(cost, Math.max(1, Math.ceil(dureeCycleMois || planProjections.length || 1))), 0);
  const caProjete = planProjections.reduce((sum, projection) =>
    sum + toNumber(projection.ca_estime || toNumber(projection.production_estimee) * toNumber(projection.prix_unitaire_estime)), 0);
  const chargesProjetees = planProjections.reduce((sum, projection) => sum + toNumber(projection.charges_estimees), 0);
  const chargesRecurrentesCycle = chargesProjetees || chargesCycleDepuisPlan || chargesMensuelles * Math.max(1, Math.ceil(dureeCycleMois || 1));
  const coutTotalPrevuCycle = investissementInitial + chargesRecurrentesCycle;
  const margeBruteProjetee = caProjete - chargesRecurrentesCycle;
  const margeNetteCycle = caProjete - coutTotalPrevuCycle;
  const margeProjetee = margeNetteCycle;
  const roiPrevu = coutTotalPrevuCycle > 0 ? (margeNetteCycle / coutTotalPrevuCycle) * 100 : 0;

  let cumul = 0;
  let paybackMois = null;
  [...planProjections]
    .sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index))
    .some((projection) => {
      cumul += toNumber(projection.marge_estimee || toNumber(projection.ca_estime || toNumber(projection.production_estimee) * toNumber(projection.prix_unitaire_estime)) - toNumber(projection.charges_estimees));
      if (cumul >= investissementInitial && paybackMois === null) {
        paybackMois = toNumber(projection.mois_index);
        return true;
      }
      return false;
    });

  const financementObtenu = planFundings
    .filter((funding) => funding.statut === 'accorde')
    .reduce((sum, funding) => sum + toNumber(funding.montant), 0);
  const financementFallback = toNumber(currentBp.apport_personnel) + toNumber(currentBp.financement_recherche);
  const financementTotal = financementObtenu || planFundings.reduce((sum, funding) => sum + toNumber(funding.montant), 0) || financementFallback;
  const couvertureFinancement = investissementInitial > 0 ? (financementObtenu / investissementInitial) * 100 : 0;
  const seuilRentabiliteMensuel = chargesMensuelles;

  const nombreUnitesPrevu = toNumber(
    currentBp.nombre_tetes_prevu ||
      currentBp.capacite_initiale ||
      currentBp.quantite_production_prevue
  );
  const nombreUnitesReel = toNumber(
    currentBp.nombre_tetes_reel ||
      currentBp.quantite_production_reelle ||
      nombreUnitesPrevu
  );

  const getTotalByCategorie = (categories) =>
    planLines
      .filter((line) => categories.includes(line.categorie))
      .reduce((sum, line) => sum + getLineTotal(line), 0);

  const investissementCheptel = getTotalByCategorie(['cheptel', 'animaux', 'poussins', 'poulettes']);
  const investissementInfrastructure = getTotalByCategorie(['infrastructure', 'batiment', 'box', 'parc', 'serre']);
  const investissementEquipement = getTotalByCategorie(['equipement', 'materiel']);
  const investissementAlimentationInitiale = getTotalByCategorie(['alimentation']);
  const investissementSanteInitiale = getTotalByCategorie(['vaccins', 'sante_veto', 'sante']);
  const investissementTransport = getTotalByCategorie(['transport', 'logistique']);
  const investissementAutres = Math.max(
    0,
    investissementInitial -
      investissementCheptel -
      investissementInfrastructure -
      investissementEquipement -
      investissementAlimentationInitiale -
      investissementSanteInitiale -
      investissementTransport
  );

  const coutAchatParTete = nombreUnitesPrevu > 0 ? investissementCheptel / nombreUnitesPrevu : 0;
  const coutInfrastructureParTete = nombreUnitesPrevu > 0 ? investissementInfrastructure / nombreUnitesPrevu : 0;
  const coutEquipementParTete = nombreUnitesPrevu > 0 ? investissementEquipement / nombreUnitesPrevu : 0;
  const coutAlimentationInitialeParTete = nombreUnitesPrevu > 0 ? investissementAlimentationInitiale / nombreUnitesPrevu : 0;
  const coutSanteInitialeParTete = nombreUnitesPrevu > 0 ? investissementSanteInitiale / nombreUnitesPrevu : 0;
  const coutTransportParTete = nombreUnitesPrevu > 0 ? investissementTransport / nombreUnitesPrevu : 0;
  const autresFraisParTete = nombreUnitesPrevu > 0 ? investissementAutres / nombreUnitesPrevu : 0;
  const coutTotalPrevuParUnite = nombreUnitesPrevu > 0 ? coutTotalPrevuCycle / nombreUnitesPrevu : 0;

  const prixVentePrevuUnitaire = toNumber(currentBp.prix_vente_prevu_unitaire);
  const prixVenteReelUnitaire = toNumber(currentBp.prix_vente_reel_unitaire);
  const margePrevueParUnite = prixVentePrevuUnitaire > 0 ? prixVentePrevuUnitaire - coutTotalPrevuParUnite : 0;
  const margeTotalePrevueUnitaire = margePrevueParUnite * nombreUnitesPrevu;

  const productionOeufsPrevue = planProjections.reduce((sum, projection) => {
    const unit = String(projection.unite_production || '').toLowerCase();
    const qty = toNumber(projection.production_estimee);
    if (['oeuf', 'oeufs'].includes(unit)) return sum + qty;
    if (['plateau', 'plateaux', 'tablette', 'tablettes'].includes(unit)) return sum + qty * 30;
    return sum;
  }, 0);
  const coutParOeufPrevu = productionOeufsPrevue > 0 ? coutTotalPrevuCycle / productionOeufsPrevue : 0;
  const coutParPlateauPrevu = coutParOeufPrevu * 30;

  const quantiteProductionPrevue = toNumber(currentBp.quantite_production_prevue);
  const coutParUniteProductionPrevu = quantiteProductionPrevue > 0 ? coutTotalPrevuCycle / quantiteProductionPrevue : 0;

  const vsReal = calculateBpVsReal({ bp: currentBp, links: planLinks, transactions, lots, animaux, cultures });
  const realUnitBase = vsReal.realHeads || vsReal.realProduction || nombreUnitesReel;
  const coutTotalReelParUnite = realUnitBase > 0 ? vsReal.chargesReelles / realUnitBase : 0;
  const margeReelleParUnite = prixVenteReelUnitaire > 0
    ? prixVenteReelUnitaire - coutTotalReelParUnite
    : realUnitBase > 0 ? vsReal.margeReelle / realUnitBase : 0;
  const roiReelParUnite = coutTotalReelParUnite > 0 ? (margeReelleParUnite / coutTotalReelParUnite) * 100 : 0;

  const unitCostRows = [
    { label: 'Cout achat par tete', planned: coutAchatParTete, real: null, unit: 'tete' },
    { label: 'Cout alimentation par tete', planned: coutAlimentationInitialeParTete, real: null, unit: 'tete' },
    { label: 'Cout sante par tete', planned: coutSanteInitialeParTete, real: null, unit: 'tete' },
    { label: 'Cout transport par tete', planned: coutTransportParTete, real: null, unit: 'tete' },
    { label: 'Autres frais par tete', planned: autresFraisParTete, real: null, unit: 'tete' },
    { label: 'Cout total par unite', planned: coutTotalPrevuParUnite, real: coutTotalReelParUnite, unit: currentBp.unite_calcul_cout || 'unite' },
    { label: 'Marge par unite', planned: margePrevueParUnite, real: margeReelleParUnite, unit: currentBp.unite_calcul_cout || 'unite' },
    { label: 'ROI par unite', planned: coutTotalPrevuParUnite > 0 ? (margePrevueParUnite / coutTotalPrevuParUnite) * 100 : 0, real: roiReelParUnite, unit: '%' },
    { label: 'Cout par oeuf', planned: coutParOeufPrevu, real: null, unit: 'oeuf' },
    { label: 'Cout par plateau', planned: coutParPlateauPrevu, real: null, unit: 'plateau' },
    { label: 'Cout par kg / botte / caisse / m2', planned: coutParUniteProductionPrevu, real: realUnitBase > 0 ? vsReal.chargesReelles / realUnitBase : 0, unit: currentBp.unite_calcul_cout || 'production' },
  ];

  return {
    lines: planLines,
    costs: planCosts,
    projections: planProjections,
    fundings: planFundings,
    links: planLinks,
    investissementInitial,
    chargesMensuelles,
    chargesRecurrentesCycle,
    coutTotalPrevuCycle,
    caProjete,
    chargesProjetees,
    margeBruteProjetee,
    margeNetteCycle,
    margeProjetee,
    roiPrevu,
    paybackMois,
    financementObtenu,
    couvertureFinancement,
    seuilRentabiliteMensuel,
    nombreUnitesPrevu,
    nombreUnitesReel,
    coutAchatParTete,
    coutInfrastructureParTete,
    coutEquipementParTete,
    coutAlimentationInitialeParTete,
    coutSanteInitialeParTete,
    coutTransportParTete,
    autresFraisParTete,
    coutTotalPrevuParUnite,
    prixVentePrevuUnitaire,
    prixVenteReelUnitaire,
    margePrevueParUnite,
    margeTotalePrevueUnitaire,
    productionOeufsPrevue,
    coutParOeufPrevu,
    coutParPlateauPrevu,
    quantiteProductionPrevue,
    coutParUniteProductionPrevu,
    vsReal,
    unitCostRows,
    initialInvestment: investissementInitial,
    monthlyRecurring: chargesMensuelles,
    projectedRevenue: caProjete,
    projectedCharges: chargesProjetees,
    projectedMargin: margeProjetee,
    fundingTotal: financementTotal,
    roi: roiPrevu,
    productionQty: quantiteProductionPrevue || productionOeufsPrevue,
    headCount: nombreUnitesReel || nombreUnitesPrevu,
    totalProjectedCost: coutTotalPrevuCycle,
    costPerUnit: coutTotalPrevuParUnite || coutParUniteProductionPrevu,
    paybackMonths: paybackMois,
  };
};

export const calculateClientMetrics = (client = {}) => {
  const total = toNumber(client.totalAchats ?? client.totalachats);
  const score = toNumber(client.score);
  const lastOrder = client.derniereCommande ?? client.dernierecommande;
  const daysSinceOrder = lastOrder ? Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000) : null;
  const recencyScore = daysSinceOrder === null ? 40 : daysSinceOrder <= 30 ? 100 : daysSinceOrder <= 90 ? 75 : 45;
  const valueScore = total >= 3000000 ? 100 : total >= 1000000 ? 80 : total >= 300000 ? 55 : 35;
  const loyaltyScore = clamp(score ? score * 20 : (recencyScore + valueScore) / 2);
  const smartStatus = client.statut || (loyaltyScore >= 88 ? 'VIP' : daysSinceOrder !== null && daysSinceOrder > 90 ? 'a_relancer' : 'actif');

  return {
    total,
    daysSinceOrder,
    recencyScore,
    valueScore,
    loyaltyScore,
    smartStatus,
    averageBasketEstimate: total > 0 ? total / Math.max(1, score || 4) : 0,
  };
};

export const calculateSupplierMetrics = (supplier = {}) => {
  const dettes = toNumber(supplier.dettes);
  const note = toNumber(supplier.note);
  const livraisons = toNumber(supplier.livraisons);
  const reliabilityScore = clamp((note || 3) * 18 + Math.min(livraisons, 30) - (dettes > 0 ? 18 : 0));
  const smartStatus = supplier.statut || (reliabilityScore >= 80 ? 'fiable' : reliabilityScore < 55 ? 'a_risque' : 'actif');

  return { dettes, note, livraisons, reliabilityScore, smartStatus };
};

export const calculateStockMetrics = (stock = {}) => {
  const quantity = toNumber(stock.quantite);
  const threshold = toNumber(stock.seuil);
  const unitPrice = toNumber(stock.prixUnit ?? stock.prixunit);
  const value = quantity * unitPrice;
  const critical = threshold > 0 && quantity <= threshold;
  const coverageRatio = threshold > 0 ? quantity / threshold : 0;

  return {
    quantity,
    threshold,
    unitPrice,
    value,
    critical,
    coverageRatio,
    suggestedOrderQty: critical ? Math.max(threshold * 2 - quantity, threshold) : 0,
  };
};

export const calculateVaccineMetrics = (vaccin = {}) => {
  const isDone = Boolean(vaccin.effectuee) || vaccin.statut === 'fait';
  const dueDate = vaccin.prevue ? new Date(vaccin.prevue) : null;
  const daysToDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
  const computedStatus = isDone ? 'fait' : daysToDue !== null && daysToDue < 0 ? 'retard' : 'a_faire';
  const smartStatus = ['fait', 'annule', 'annulÃ©'].includes(vaccin.statut) ? vaccin.statut : computedStatus;

  return {
    isDone,
    daysToDue,
    smartStatus,
    urgencyScore: smartStatus === 'retard' ? 100 : daysToDue !== null && daysToDue <= 7 ? 75 : 35,
  };
};
