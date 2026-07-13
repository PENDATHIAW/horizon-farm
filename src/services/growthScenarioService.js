const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ratio = (value, capacity) => {
  const denominator = number(capacity);
  if (denominator <= 0) return null;
  return Math.round((number(value) / denominator) * 1000) / 10;
};

export function calculateGrowthScenario(assumptions = {}, context = {}) {
  const targetSubjects = Math.max(0, number(assumptions.targetSubjects));
  const durationDays = Math.max(1, number(assumptions.durationDays));
  const feedPerSubjectDayKg = Math.max(0, number(assumptions.feedPerSubjectDayKg));
  const salePricePerSubject = Math.max(0, number(assumptions.salePricePerSubject));
  const otherCostPerSubject = Math.max(0, number(assumptions.otherCostPerSubject));
  const feedPriceKg = Math.max(0, number(context.feedPriceKg));

  const feedNeedKg = targetSubjects * durationDays * feedPerSubjectDayKg;
  const feedCost = feedNeedKg * feedPriceKg;
  const otherCosts = targetSubjects * otherCostPerSubject;
  const projectedRevenue = targetSubjects * salePricePerSubject;
  const projectedProfit = projectedRevenue - feedCost - otherCosts;
  const projectedCash = number(context.availableCash) - feedCost - otherCosts + projectedRevenue;
  const minimumCash = Math.max(0, number(context.minimumCash));

  const capacities = {
    buildings: { required: targetSubjects, available: number(context.buildingCapacity), usagePercent: ratio(targetSubjects, context.buildingCapacity) },
    team: { required: targetSubjects, available: number(context.teamCapacity), usagePercent: ratio(targetSubjects, context.teamCapacity) },
    equipment: { required: targetSubjects, available: number(context.equipmentCapacity), usagePercent: ratio(targetSubjects, context.equipmentCapacity) },
  };
  const capacitySustainable = Object.values(capacities).every((entry) => entry.available > 0 && entry.required <= entry.available);
  const cashSustainable = projectedCash >= minimumCash;

  return {
    feedNeedKg: Math.round(feedNeedKg * 100) / 100,
    projectedCash: Math.round(projectedCash),
    projectedRevenue: Math.round(projectedRevenue),
    projectedProfit: Math.round(projectedProfit),
    profitabilityPercent: projectedRevenue > 0 ? Math.round((projectedProfit / projectedRevenue) * 1000) / 10 : 0,
    capacities,
    sustainabilityThreshold: minimumCash,
    sustainable: capacitySustainable && cashSustainable && projectedProfit >= 0,
    checks: { capacitySustainable, cashSustainable, profitable: projectedProfit >= 0 },
  };
}

export function nextScenarioVersion(existingRows = [], scenarioKey = 'croissance') {
  const versions = existingRows
    .filter((row) => String(row.scenario_key || '') === String(scenarioKey))
    .map((row) => number(row.version));
  return (versions.length ? Math.max(...versions) : 0) + 1;
}

export function buildGrowthScenarioRecord({
  assumptions,
  context,
  existingRows = [],
  farmId,
  userId,
  scenarioKey = 'croissance',
  name = 'Scénario de croissance',
} = {}) {
  return {
    farm_id: farmId,
    scenario_key: scenarioKey,
    name,
    version: nextScenarioVersion(existingRows, scenarioKey),
    assumptions,
    results: calculateGrowthScenario(assumptions, context),
    status: 'draft',
    created_by: userId || null,
  };
}
