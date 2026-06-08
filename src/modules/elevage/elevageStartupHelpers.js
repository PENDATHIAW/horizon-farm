const arr = (value) => (Array.isArray(value) ? value : []);

export function isElevageStartupMode({
  lots = [],
  animaux = [],
  feedLogs = [],
  health = [],
  productionLogs = [],
} = {}) {
  return (
    !arr(lots).length
    && !arr(animaux).length
    && !arr(feedLogs).length
    && !arr(health).length
    && !arr(productionLogs).length
  );
}

export function buildElevageStartupProgress({
  lots = [],
  animaux = [],
  feedStocks = [],
  feedLogs = [],
  health = [],
  productionLogs = [],
  opportunities = [],
  salesOrders = [],
} = {}) {
  const hasLot = arr(lots).length > 0;
  const hasAnimal = arr(animaux).length > 0;
  const hasFeedStock = arr(feedStocks).length > 0;
  const hasFeeding = arr(feedLogs).length > 0;
  const hasHealth = arr(health).length > 0;
  const hasProduction = arr(productionLogs).length > 0;
  const hasCommercial = arr(opportunities).length > 0 || arr(salesOrders).length > 0;

  const steps = [
    { id: 'lot', label: 'Créer un premier lot', done: hasLot, tab: 'Avicole' },
    { id: 'animal', label: 'Ajouter un animal ou une bande', done: hasAnimal || hasLot, tab: 'Animaux' },
    { id: 'feed_stock', label: 'Rattacher un stock d\'aliment', done: hasFeedStock, navigate: 'achats_stock' },
    { id: 'feeding', label: 'Enregistrer une première alimentation', done: hasFeeding, modal: 'feeding' },
    { id: 'health', label: 'Enregistrer une première santé / vaccination', done: hasHealth, modal: 'health' },
    { id: 'production', label: 'Enregistrer une première production', done: hasProduction, modal: 'eggs' },
    { id: 'commercial', label: 'Connecter Commercial pour les ventes', done: hasCommercial, navigate: 'commercial', navigateTab: 'Ventes' },
  ];

  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) || null;

  return {
    steps,
    completed,
    total: steps.length,
    nextStep,
    percent: Math.round((completed / steps.length) * 100),
  };
}
