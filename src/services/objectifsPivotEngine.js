import { daysBetween } from './avicoleLivingTargets.js';
import { resolveSoucheCode, SOUCHE_REFERENTIAL, theoreticalGmq, theoreticalLayingPct } from '../config/soucheReferential.js';

const arr = (v) => (Array.isArray(v) ? v : []);

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Date pivot J-0 : mise en place du lot ou entrée ferme. */
export function getPivotDate(entity = {}) {
  return entity.date_mise_en_place
    || entity.date_debut
    || entity.date_entree
    || entity.entry_date
    || entity.date_entree_ferme
    || entity.date_achat
    || entity.created_at?.slice?.(0, 10)
    || null;
}

export function getAgeDays(entity = {}, refDate = todayIso()) {
  const pivot = getPivotDate(entity);
  if (!pivot) return 0;
  return daysBetween(pivot, refDate);
}

export function getAgeWeeks(entity = {}, refDate = todayIso()) {
  return Math.floor(getAgeDays(entity, refDate) / 7);
}

export function buildPivotContext(entity = {}, refDate = todayIso()) {
  const code = resolveSoucheCode(entity);
  const ref = code ? SOUCHE_REFERENTIAL[code] : null;
  const ageDays = getAgeDays(entity, refDate);
  const ageWeeks = Math.floor(ageDays / 7);
  const activity = ref?.activity || (String(entity.type || '').toLowerCase().includes('ponde') ? 'pondeuse' : 'chair');
  const standard = activity === 'pondeuse'
    ? theoreticalLayingPct(code, ageWeeks)
    : theoreticalGmq(code, ageDays);
  return {
    entityId: entity.id,
    codeSouche: code,
    soucheLabel: ref?.label || 'Souche non renseignée',
    pivotDate: getPivotDate(entity),
    ageDays,
    ageWeeks,
    activity,
    standardValue: standard,
    standardUnit: activity === 'pondeuse' ? '%' : 'g/j',
  };
}

export function buildLotsPivotContexts(lots = [], refDate = todayIso()) {
  return arr(lots).map((lot) => ({ ...buildPivotContext(lot, refDate), label: lot.name || lot.nom || lot.id, kind: 'lot' }));
}

export function buildAnimauxPivotContexts(animaux = [], refDate = todayIso()) {
  return arr(animaux).map((animal) => ({ ...buildPivotContext(animal, refDate), label: animal.name || animal.nom || animal.id, kind: 'animal' }));
}
