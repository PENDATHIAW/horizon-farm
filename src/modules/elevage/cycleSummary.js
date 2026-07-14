import { buildCalculatedCycleDates, CYCLE_DAYS } from '../../services/productionCycleDates';
import { buildProductionCyclePlan } from '../../services/productionCyclePlanService';
import { avicoleHasActiveBirds } from '../../utils/avicoleMetrics';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const lower = (value = '') => String(value || '').trim().toLowerCase();

export const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => lower(row.status || row.statut).includes(word));

const lotText = (lot = {}) => lower(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.name || ''} ${lot.nom || ''}`);
export const isLayerLot = (lot = {}) => ['pondeuse', 'ponte', 'oeuf', 'œuf'].some((word) => lotText(lot).includes(word));
export const isBroilerLot = (lot = {}) => ['chair', 'broiler'].some((word) => lotText(lot).includes(word));

export const mortalityRate = (lot = {}) => {
  const initial = Number(lot.initial_count ?? lot.effectif_initial ?? 0) || 0;
  const dead = Number(lot.mortality ?? lot.morts ?? 0) || 0;
  return initial > 0 ? Math.round((dead / initial) * 100) : 0;
};

export const daysUntil = (targetDate = '') => {
  if (!targetDate) return null;
  const diff = Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000);
  return Number.isFinite(diff) ? diff : null;
};

export function buildCycleOverview({ lots = [], animaux = [], productionLogs = [], dataMap = {} } = {}) {
  const activeAnimals = arr(animaux).filter((row) => !isClosedAnimal(row));
  const activeLots = arr(lots).filter(avicoleHasActiveBirds);
  const layers = activeLots.filter(isLayerLot);
  const broilers = activeLots.filter(isBroilerLot);

  const cycles = buildCalculatedCycleDates({ lots: activeLots, animaux: activeAnimals });
  const plan = buildProductionCyclePlan({
    ...dataMap,
    lots: activeLots,
    animaux: activeAnimals,
    productionLogs,
  });

  const lateRows = cycles.all.filter((row) => row.targetDate && row.targetDate < today());
  const dueSoonRows = cycles.all.filter((row) => row.targetDate && row.targetDate >= today() && row.targetDate <= addDays(10));
  const priorityRows = cycles.all
    .filter((row) => row.targetDate && row.targetDate <= addDays(30))
    .sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate)))
    .slice(0, 12);
  const mortalityAlerts = activeLots.filter((lot) => mortalityRate(lot) >= 4);
  const nextTarget = cycles.all.find((row) => row.targetDate && row.targetDate >= today())?.targetDate || '-';
  const lateCount = lateRows.length;
  const dueSoonCount = dueSoonRows.length;
  const warningCount = lateCount + dueSoonCount + mortalityAlerts.length;
  const decisions = arr(plan.decisions);

  return {
    activeAnimals,
    activeLots,
    layers,
    broilers,
    cycles,
    plan,
    priorityRows: priorityRows.length ? priorityRows : cycles.all.slice(0, 8),
    mortalityAlerts,
    nextTarget,
    lateCount,
    dueSoonCount,
    warningCount,
    decisions,
    cycleDays: CYCLE_DAYS,
  };
}
