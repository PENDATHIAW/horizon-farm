const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0) || 0;
const today = () => new Date();
const iso = (date) => new Date(date).toISOString().slice(0, 10);
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d; };
const roundTo = (value, step = 50) => Math.ceil(Number(value || 0) / step) * step;

export const defaultCycleStrategy = {
  chair: {
    label: 'Poulets de chair',
    cycleDays: 45,
    saleEveryDays: 15,
    starterPlacementQty: 500,
    targetSellEveryPeriod: 500,
    mortalityBufferRate: 0.06,
    rampPlacements: [0, 15, 30],
  },
  bovins: {
    label: 'Bœufs / embouche',
    cycleDays: 90,
    placementEveryDays: 30,
    starterQty: 5,
    incrementQty: 5,
    increaseAfterCycles: 2,
    targetMarginCheck: true,
  },
  pondeuses: {
    label: 'Pondeuses',
    tabletPrice: 2200,
    eggPerTablet: 30,
    annualRevenueTarget: 36630000,
    layingRateTarget: 0.85,
    pointOfLayStartDays: 20,
    dayOldStartDays: 150,
    bandIntervalDays: 120,
    defaultBandSize: 750,
    reformThresholdRate: 0.75,
    reformCheckDays: 14,
  },
};

function activeCount(row = {}) {
  return num(row.current_count ?? row.effectif_actuel ?? row.count ?? row.initial_count) - num(row.sold_count ?? row.vendus ?? row.sorties) - num(row.mortality ?? row.morts ?? row.dead_count);
}

function isChairLot(lot = {}) {
  const text = `${lot.type || ''} ${lot.name || ''} ${lot.nom || ''}`.toLowerCase();
  return text.includes('chair') || text.includes('poulet');
}

function isLayerLot(lot = {}) {
  const text = `${lot.type || ''} ${lot.name || ''} ${lot.nom || ''}`.toLowerCase();
  return text.includes('pondeuse') || text.includes('ponte') || text.includes('œuf') || text.includes('oeuf');
}

function isBovine(animal = {}) {
  const text = `${animal.type || ''} ${animal.espece || ''} ${animal.name || ''}`.toLowerCase();
  return text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf') || text.includes('taureau') || text.includes('veau');
}

function buildChairCyclePlan(strategy = defaultCycleStrategy.chair, startDate = today()) {
  const recommendedPlacementQty = roundTo(strategy.targetSellEveryPeriod / (1 - strategy.mortalityBufferRate), 10);
  const ramp = strategy.rampPlacements.map((offset, index) => {
    const launchDate = addDays(startDate, offset);
    const saleDate = addDays(launchDate, strategy.cycleDays);
    return {
      id: `chair-band-${index + 1}`,
      label: `Bande chair ${index + 1}`,
      launchDate: iso(launchDate),
      expectedSaleDate: iso(saleDate),
      placementQty: index === 0 ? strategy.starterPlacementQty : strategy.targetSellEveryPeriod,
      recommendedPlacementQty,
      expectedSellableQty: Math.round((index === 0 ? strategy.starterPlacementQty : strategy.targetSellEveryPeriod) * (1 - strategy.mortalityBufferRate)),
      action: index === 0 ? 'Démarrer prudemment avec 500 sujets.' : 'Lancer la bande suivante pour créer le rythme de vente tous les 15 jours.',
    };
  });
  return {
    activity: 'poulets_chair',
    title: 'Poulets de chair · 500 vendables tous les 15 jours',
    firstSaleDate: ramp[0]?.expectedSaleDate,
    steadySaleStartDate: ramp[ramp.length - 1]?.expectedSaleDate,
    saleEveryDays: strategy.saleEveryDays,
    cycleDays: strategy.cycleDays,
    recommendedPlacementQty,
    ramp,
    summary: `Premier lot vendable vers J+${strategy.cycleDays}. Rythme stable tous les ${strategy.saleEveryDays} jours à partir de J+${strategy.cycleDays + strategy.saleEveryDays * 2}.`,
  };
}

function buildBovineCyclePlan(strategy = defaultCycleStrategy.bovins, startDate = today()) {
  const cycles = Array.from({ length: 6 }).map((_, index) => {
    const launchDate = addDays(startDate, index * strategy.placementEveryDays);
    const saleDate = addDays(launchDate, strategy.cycleDays);
    const qty = strategy.starterQty + Math.max(0, Math.floor(index / strategy.increaseAfterCycles)) * strategy.incrementQty;
    return {
      id: `bovine-cycle-${index + 1}`,
      label: `Cycle embouche ${index + 1}`,
      launchDate: iso(launchDate),
      expectedSaleDate: iso(saleDate),
      qty,
      action: index === 0 ? 'Démarrer avec 5 bœufs.' : `Relancer ${qty} bœuf(s) si marge et trésorerie du cycle précédent sont bonnes.`,
    };
  });
  return {
    activity: 'bovins',
    title: 'Bœufs · embouche progressive',
    firstSaleDate: cycles[0]?.expectedSaleDate,
    cycleDays: strategy.cycleDays,
    placementEveryDays: strategy.placementEveryDays,
    cycles,
    summary: 'Démarrage à 5 bœufs, puis augmentation par paliers après validation de la marge réelle et de la trésorerie.',
  };
}

function buildLayerCyclePlan(strategy = defaultCycleStrategy.pondeuses, lots = [], productionLogs = [], startDate = today()) {
  const targetTabletsYear = strategy.annualRevenueTarget / strategy.tabletPrice;
  const targetEggsDay = (targetTabletsYear * strategy.eggPerTablet) / 365;
  const requiredActiveLayers = roundTo(targetEggsDay / strategy.layingRateTarget, 50);
  const currentLayers = arr(lots).filter(isLayerLot).reduce((sum, lot) => sum + Math.max(0, activeCount(lot)), 0);
  const recentEggs = arr(productionLogs).slice(-14).reduce((sum, log) => sum + num(log.quantite || log.eggs || log.oeufs || log.total_oeufs), 0);
  const recentDays = Math.max(1, Math.min(14, arr(productionLogs).slice(-14).length || 1));
  const observedRate = currentLayers > 0 ? recentEggs / recentDays / currentLayers : strategy.layingRateTarget;
  const reliableRate = Math.max(0.55, Math.min(0.9, observedRate || strategy.layingRateTarget));
  const effectiveRequiredLayers = roundTo(targetEggsDay / reliableRate, 50);
  const deficit = Math.max(0, effectiveRequiredLayers - currentLayers);
  const recommendedNextBandSize = Math.max(strategy.defaultBandSize, roundTo(deficit || strategy.defaultBandSize, 50));
  const bands = [0, strategy.bandIntervalDays, strategy.bandIntervalDays * 2, strategy.bandIntervalDays * 3].map((offset, index) => {
    const launchDate = addDays(startDate, offset);
    return {
      id: `layer-band-${index + 1}`,
      label: `Bande pondeuse ${index + 1}`,
      launchDate: iso(launchDate),
      firstEggDatePointOfLay: iso(addDays(launchDate, strategy.pointOfLayStartDays)),
      firstEggDateDayOld: iso(addDays(launchDate, strategy.dayOldStartDays)),
      recommendedQty: index === 0 ? recommendedNextBandSize : strategy.defaultBandSize,
      action: index === 0 ? 'Sécuriser une bande pour éviter toute rupture d’œufs.' : 'Chevaucher les bandes pour garder des œufs toute l’année.',
    };
  });
  return {
    activity: 'oeufs',
    title: 'Pondeuses · œufs toute l’année',
    targetTabletsYear: Math.round(targetTabletsYear),
    targetEggsDay: Math.round(targetEggsDay),
    requiredActiveLayers,
    effectiveRequiredLayers,
    currentLayers,
    observedLayingRate: Math.round(reliableRate * 100),
    recommendedNextBandSize,
    reformRule: `Réformer progressivement si le taux de ponte reste sous ${Math.round(strategy.reformThresholdRate * 100)}% pendant ${strategy.reformCheckDays} jours, sans attendre 17 mois fixes.`,
    bands,
    summary: 'Le nombre de nouvelles pondeuses doit être calculé selon le taux de ponte réel, pas seulement selon l’âge.',
  };
}

export function buildProductionCyclePlan(dataMap = {}, options = {}) {
  const startDate = options.startDate ? new Date(options.startDate) : today();
  const lots = arr(dataMap.lots || dataMap.avicole);
  const animaux = arr(dataMap.animaux);
  const productionLogs = arr(dataMap.productionLogs || dataMap.production_oeufs_logs);
  const activeChair = lots.filter(isChairLot).reduce((sum, lot) => sum + Math.max(0, activeCount(lot)), 0);
  const activeBovines = animaux.filter(isBovine).filter((animal) => !['vendu', 'sorti', 'archive'].includes(String(animal.status || animal.statut || '').toLowerCase())).length;
  const chair = buildChairCyclePlan(defaultCycleStrategy.chair, startDate);
  const bovins = buildBovineCyclePlan(defaultCycleStrategy.bovins, startDate);
  const pondeuses = buildLayerCyclePlan(defaultCycleStrategy.pondeuses, lots, productionLogs, startDate);
  const decisions = [
    { id: 'cycle-chair', activity: 'poulets_chair', priority: activeChair < defaultCycleStrategy.chair.starterPlacementQty ? 'haute' : 'moyenne', title: 'Lancer les bandes chair cadencées', recommendation: chair.summary, targetDate: chair.ramp[0]?.launchDate, impact: `Objectif : ${defaultCycleStrategy.chair.targetSellEveryPeriod} poulets vendables tous les ${defaultCycleStrategy.chair.saleEveryDays} jours.` },
    { id: 'cycle-bovins', activity: 'bovins', priority: activeBovines < defaultCycleStrategy.bovins.starterQty ? 'haute' : 'moyenne', title: 'Structurer les cycles d’embouche', recommendation: bovins.summary, targetDate: bovins.cycles[0]?.launchDate, impact: 'Démarrer à 5 bœufs puis augmenter uniquement après validation marge/cash.' },
    { id: 'cycle-pondeuses', activity: 'oeufs', priority: pondeuses.currentLayers < pondeuses.effectiveRequiredLayers ? 'haute' : 'moyenne', title: 'Garantir des œufs toute l’année', recommendation: `Prévoir une prochaine bande de ${pondeuses.recommendedNextBandSize} pondeuses. ${pondeuses.reformRule}`, targetDate: pondeuses.bands[0]?.launchDate, impact: `${pondeuses.targetEggsDay} œufs/jour visés, soit ${pondeuses.targetTabletsYear} tablettes/an.` },
  ];
  return { chair, bovins, pondeuses, decisions };
}

export default buildProductionCyclePlan;
