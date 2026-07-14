/** Âge animaux / lots - date de référence selon mode acquisition (achat vs naissance). */

const norm = (value = '') => String(value || '').trim().toLowerCase();

export const BIRTH_ACQUISITION_MODES = new Set(['naissance_ferme', 'reproduction_interne', 'elevage_interne']);
export const PURCHASE_ACQUISITION_MODES = new Set(['achat', 'don', 'autre']);

export function isBornOnFarm(mode = '') {
  return BIRTH_ACQUISITION_MODES.has(norm(mode));
}

export function isPurchased(mode = '') {
  const key = norm(mode) || 'achat';
  return !isBornOnFarm(key);
}

export function daysSince(dateValue, endDate = new Date()) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  return Math.max(0, Math.floor((end.getTime() - date.getTime()) / 86400000));
}

function formatDurationDays(days) {
  if (days === null || days === undefined) return null;
  if (days < 30) return `${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} mois (${days} j)`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years} an${years > 1 ? 's' : ''}${rem ? ` ${rem} mois` : ''} (${days} j)`.trim();
}

export function animalAgeReferenceDate(animal = {}) {
  if (animal.age || animal.age_label) return null;
  const mode = animal.mode_acquisition || 'achat';
  if (isBornOnFarm(mode)) {
    return animal.date_naissance || animal.birth_date || animal.naissance || animal.date_entree_ferme || null;
  }
  return animal.date_entree_ferme || animal.date_achat || animal.date_poids_entree || null;
}

export function animalAgeDateLabel(animal = {}) {
  return isBornOnFarm(animal.mode_acquisition) ? 'Date de naissance' : 'Date entrée en ferme';
}

export function animalAgeDateValue(animal = {}) {
  const mode = animal.mode_acquisition || 'achat';
  if (isBornOnFarm(mode)) {
    return animal.date_naissance || animal.birth_date || animal.naissance || '';
  }
  return animal.date_entree_ferme || animal.date_achat || '';
}

/** Animal : âge depuis la date de référence (naissance ou entrée ferme). */
export function formatAnimalAge(animal = {}) {
  if (animal.age || animal.age_label) return String(animal.age || animal.age_label);
  const ref = animalAgeReferenceDate(animal);
  const days = ref ? daysSince(ref) : null;
  if (days === null) {
    return isBornOnFarm(animal.mode_acquisition)
      ? 'Non renseigné - date de naissance'
      : 'Non renseigné - date entrée en ferme';
  }
  const label = formatDurationDays(days);
  return isBornOnFarm(animal.mode_acquisition) ? label : `${label} en ferme`;
}

export function lotAgeReferenceDate(lot = {}) {
  const stored = lot.age_jours ?? lot.age_days;
  if (stored != null && stored !== '' && !Number.isNaN(Number(stored))) {
    return { days: Number(stored), fromStored: true };
  }
  const mode = lot.mode_acquisition || 'achat';
  const ref = isBornOnFarm(mode)
    ? (lot.date_naissance || lot.date_debut || lot.entry_date || lot.date_entree)
    : (lot.date_debut || lot.entry_date || lot.date_entree || lot.created_at);
  const days = ref ? daysSince(ref) : null;
  return { days, ref, fromStored: false };
}

export function lotAgeDateLabel(lot = {}) {
  return isBornOnFarm(lot.mode_acquisition) ? 'Date de naissance / éclosion' : 'Date entrée en ferme';
}

export function lotAgeDateValue(lot = {}) {
  const mode = lot.mode_acquisition || 'achat';
  if (isBornOnFarm(mode)) {
    return lot.date_naissance || lot.date_debut || lot.entry_date || '';
  }
  return lot.date_debut || lot.entry_date || lot.date_entree || '';
}

/** Lot avicole : J+X chair, mois + semaine pondeuses. */
export function formatLotAge(lot = {}, { layer = false } = {}) {
  const { days } = lotAgeReferenceDate(lot);
  if (days === null || Number.isNaN(days)) {
    return isBornOnFarm(lot.mode_acquisition)
      ? 'Non renseigné - date de naissance / éclosion'
      : 'Non renseigné - date entrée en ferme';
  }
  const weeks = Math.floor(days / 7);
  if (layer) {
    const months = Math.floor(days / 30.44);
    return `${months} mois · S${weeks} (${days} j)`;
  }
  return `J${days} · ${weeks} sem.`;
}
