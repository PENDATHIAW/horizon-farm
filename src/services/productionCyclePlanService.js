const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0) || 0;
const today = () => new Date();
const iso = (date) => new Date(date).toISOString().slice(0, 10);
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d; };
const roundTo = (value, step = 50) => Math.ceil(Number(value || 0) / step) * step;

export const defaultCycleStrategy = {
  chair: {
    label: 'Poulets de chair',
    cycleDays: 40,
    saleEveryDays: 15,
    starterPlacementQty: 500,
    targetSellEveryPeriod: 500,
    mortalityBufferRate: 0,
    rampPlacements: [0, 40, 55, 70, 85, 100],
    notes: 'Démarrer par 500 poussins, vendre après 40 jours, relancer 500, puis ajouter 500 autres 15 jours après et maintenir le roulement.',
  },
  bovins: {
    label: 'Bœufs / embouche',
    cycleDays: 90,
    placementEveryDays: 30,
    starterQty: 5,
    monthlyPlacementQty: 5,
    targetSaleQtyPerMonth: 5,
    pipelineMonths: 3,
    targetMarginCheck: true,
    notes: 'M1 : 5 bovins. M2 : 5 bovins. M3 : 5 bovins. À partir de M4, vendre le lot M1 et racheter 5. M5 vend le lot M2. M6 vend le lot M3. Ensuite vendre/racheter 5 chaque mois.',
  },
  pondeuses: {
    label: 'Pondeuses',
    initialBandSize: 3000,
    tabletPrice: 2200,
    eggPerTablet: 30,
    annualRevenueTarget: 36630000,
    layingRateTarget: 0.85,
    pointOfLayStartDays: 20,
    dayOldStartDays: 150,
    bandIntervalDays: 120,
    defaultFutureBandSize: 750,
    reformThresholdRate: 0.75,
    reformCheckDays: 14,
    notes: 'Démarrer avec 3 000 pondeuses. La deuxième bande n’est pas figée : elle sera décidée selon la ponte réelle, la demande clients et le risque de rupture.',
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
  const recommendedPlacementQty = strategy.starterPlacementQty;
  const ramp = strategy.rampPlacements.map((offset, index) => {
    const launchDate = addDays(startDate, offset);
    const saleDate = addDays(launchDate, strategy.cycleDays);
    return {
      id: `chair-band-${index + 1}`,
      label: `Bande chair ${index + 1}`,
      launchDate: iso(launchDate),
      expectedSaleDate: iso(saleDate),
      placementQty: strategy.starterPlacementQty,
      recommendedPlacementQty,
      expectedSellableQty: Math.round(strategy.starterPlacementQty * (1 - strategy.mortalityBufferRate)),
      action: index === 0
        ? 'Acheter 500 poussins, attendre 40 jours, puis écouler la bande.'
        : index === 1
          ? 'Après l’écoulement du premier lot, racheter 500 poussins.'
          : 'Ajouter une bande de 500 pour installer le rythme de vente tous les 15 jours.',
    };
  });
  return {
    activity: 'poulets_chair',
    title: 'Poulets de chair · bandes de 500 en roulement',
    firstSaleDate: ramp[0]?.expectedSaleDate,
    steadySaleStartDate: ramp[1]?.expectedSaleDate,
    saleEveryDays: strategy.saleEveryDays,
    cycleDays: strategy.cycleDays,
    recommendedPlacementQty,
    ramp,
    summary: `Démarrer avec 500 poussins. Première vente vers J+${strategy.cycleDays}. Ensuite racheter 500, ajouter 500 autres 15 jours après, puis maintenir des bandes de 500 pour vendre régulièrement.`,
  };
}

function buildBovineCyclePlan(strategy = defaultCycleStrategy.bovins, startDate = today()) {
  const cycles = Array.from({ length: 8 }).map((_, index) => {
    const purchaseMonth = index + 1;
    const saleMonth = purchaseMonth + strategy.pipelineMonths;
    const launchDate = addDays(startDate, index * strategy.placementEveryDays);
    const saleDate = addDays(launchDate, strategy.cycleDays);
    const qty = strategy.monthlyPlacementQty;
    return {
      id: `bovine-cycle-${purchaseMonth}`,
      label: `Lot bovins M${purchaseMonth}`,
      purchaseMonth,
      saleMonth,
      launchDate: iso(launchDate),
      expectedSaleDate: iso(saleDate),
      qty,
      action: purchaseMonth <= 3
        ? `M${purchaseMonth} : acheter 5 bovins pour constituer le pipeline. Vente prévue en M${saleMonth}.`
        : `M${purchaseMonth} : vendre les 5 bovins achetés en M${purchaseMonth - 3}, puis racheter 5 bovins.`,
    };
  });
  return {
    activity: 'bovins',
    title: 'Bœufs · pipeline de 5 têtes par mois',
    firstSaleDate: cycles[0]?.expectedSaleDate,
    cycleDays: strategy.cycleDays,
    placementEveryDays: strategy.placementEveryDays,
    cycles,
    summary: 'Acheter 5 bovins en M1, M2 et M3. En M4, vendre le lot acheté en M1 et racheter 5. En M5, vendre M2. En M6, vendre M3. Ensuite vendre et racheter 5 bovins chaque mois.',
  };
}

function buildLayerCyclePlan(strategy = defaultCycleStrategy.pondeuses, lots = [], productionLogs = [], startDate = today()) {
  const targetTabletsYear = strategy.annualRevenueTarget / strategy.tabletPrice;
  const targetEggsDay = (targetTabletsYear * strategy.eggPerTablet) / 365;
  const requiredActiveLayers = roundTo(targetEggsDay / strategy.layingRateTarget, 50);
  const currentLayers = arr(lots).filter(isLayerLot).reduce((sum, lot) => sum + Math.max(0, activeCount(lot)), 0);
  const plannedOrCurrentLayers = currentLayers || strategy.initialBandSize;
  const recentLogs = arr(productionLogs).slice(-14);
  const recentEggs = recentLogs.reduce((sum, log) => sum + num(log.quantite || log.eggs || log.oeufs || log.total_oeufs), 0);
  const recentDays = Math.max(1, Math.min(14, recentLogs.length || 1));
  const observedRate = currentLayers > 0 && recentLogs.length ? recentEggs / recentDays / currentLayers : strategy.layingRateTarget;
  const reliableRate = Math.max(0.55, Math.min(0.9, observedRate || strategy.layingRateTarget));
  const effectiveRequiredLayers = roundTo(targetEggsDay / reliableRate, 50);
  const deficit = Math.max(0, effectiveRequiredLayers - plannedOrCurrentLayers);
  const recommendedNextBandSize = currentLayers > 0 && deficit > 0 ? roundTo(deficit, 50) : 0;
  const bands = [0, strategy.bandIntervalDays, strategy.bandIntervalDays * 2, strategy.bandIntervalDays * 3].map((offset, index) => {
    const launchDate = addDays(startDate, offset);
    const firstBandQty = currentLayers > 0 ? recommendedNextBandSize : strategy.initialBandSize;
    return {
      id: `layer-band-${index + 1}`,
      label: index === 0 && !currentLayers ? 'Bande pondeuse initiale' : `Bande pondeuse ${index + 1}`,
      launchDate: iso(launchDate),
      firstEggDatePointOfLay: iso(addDays(launchDate, strategy.pointOfLayStartDays)),
      firstEggDateDayOld: iso(addDays(launchDate, strategy.dayOldStartDays)),
      recommendedQty: index === 0 ? firstBandQty : strategy.defaultFutureBandSize,
      action: index === 0 && !currentLayers
        ? 'Démarrer avec 3 000 pondeuses.'
        : index === 0 && recommendedNextBandSize > 0
          ? `Prévoir une bande complémentaire de ${recommendedNextBandSize} pondeuses si la ponte réelle ne couvre pas l’objectif.`
          : 'Ne pas figer maintenant : décider selon taux de ponte réel, demande clients et risque de rupture.',
    };
  });
  return {
    activity: 'oeufs',
    title: 'Pondeuses · démarrage 3 000 puis décision sur données réelles',
    targetTabletsYear: Math.round(targetTabletsYear),
    targetEggsDay: Math.round(targetEggsDay),
    requiredActiveLayers,
    effectiveRequiredLayers,
    currentLayers,
    plannedOrCurrentLayers,
    initialBandSize: strategy.initialBandSize,
    observedLayingRate: Math.round(reliableRate * 100),
    recommendedNextBandSize,
    reformRule: `Réformer progressivement si le taux de ponte reste sous ${Math.round(strategy.reformThresholdRate * 100)}% pendant ${strategy.reformCheckDays} jours, sans attendre 17 mois fixes.`,
    bands,
    summary: 'Démarrer avec 3 000 pondeuses. La deuxième bande sera décidée plus tard selon le taux de ponte réel et la continuité des œufs toute l’année.',
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
    { id: 'cycle-chair', activity: 'poulets_chair', priority: activeChair < defaultCycleStrategy.chair.starterPlacementQty ? 'haute' : 'moyenne', title: 'Lancer les bandes chair de 500', recommendation: chair.summary, targetDate: chair.ramp[0]?.launchDate, impact: `Objectif : bandes de ${defaultCycleStrategy.chair.targetSellEveryPeriod} poussins, avec ventes régulières après installation du roulement.` },
    { id: 'cycle-bovins', activity: 'bovins', priority: activeBovines < defaultCycleStrategy.bovins.starterQty ? 'haute' : 'moyenne', title: 'Structurer l’embouche 5 têtes/mois', recommendation: bovins.summary, targetDate: bovins.cycles[0]?.launchDate, impact: 'M4 vend M1, M5 vend M2, M6 vend M3, puis vente/rachat de 5 bovins chaque mois.' },
    { id: 'cycle-pondeuses', activity: 'oeufs', priority: pondeuses.currentLayers ? 'moyenne' : 'haute', title: 'Démarrer 3 000 pondeuses et sécuriser les œufs', recommendation: `${pondeuses.summary} ${pondeuses.reformRule}`, targetDate: pondeuses.bands[0]?.launchDate, impact: `${pondeuses.targetEggsDay} œufs/jour visés, soit ${pondeuses.targetTabletsYear} tablettes/an.` },
  ];
  return { chair, bovins, pondeuses, decisions };
}

export default buildProductionCyclePlan;
