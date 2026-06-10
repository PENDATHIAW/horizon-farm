/**
 * Rattachement farm_id aux logs Élevage (alimentation, production œufs, santé).
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();

export function resolveFarmIdFromElevageContext({
  form = {},
  lot = null,
  animal = null,
  context = {},
} = {}) {
  return (
    clean(form.farm_id)
    || clean(lot?.farm_id)
    || clean(animal?.farm_id)
    || clean(context.activeFarmId)
    || clean(context.farmId)
    || null
  );
}

export function findLotById(lots = [], lotId = '') {
  const id = clean(lotId);
  if (!id) return null;
  return arr(lots).find((row) => clean(row.id) === id) || null;
}

export function findAnimalById(animals = [], animalId = '') {
  const id = clean(animalId);
  if (!id) return null;
  return arr(animals).find((row) => clean(row.id) === id) || null;
}

export function resolveElevageLogFarmId({ form = {}, context = {} } = {}) {
  const lot = findLotById(context.lots, form.lot_id);
  const animal = findAnimalById(context.animaux, form.animal_id);
  return resolveFarmIdFromElevageContext({ form, lot, animal, context });
}

export function stampElevageLogFarmId(log = {}, farmId = null) {
  if (!farmId) return { ...log };
  return { ...log, farm_id: farmId };
}

/** Backfill prudente en mémoire (migration SQL complète côté Supabase). */
export function backfillElevageLogFarmId(log = {}, { lots = [], animaux = [] } = {}) {
  if (clean(log.farm_id)) return log;
  const lot = findLotById(lots, log.lot_id);
  const animal = findAnimalById(animaux, log.animal_id);
  const farmId = resolveFarmIdFromElevageContext({ form: log, lot, animal });
  return farmId ? stampElevageLogFarmId(log, farmId) : log;
}
