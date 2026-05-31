/** Affichage cohérent de l'âge animaux / lots — aligné sur animalDecisionEngine et avicoleLivingTargets. */

export function daysSince(dateValue, endDate = new Date()) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  return Math.max(0, Math.floor((end.getTime() - date.getTime()) / 86400000));
}

function formatBirthAge(days) {
  if (days < 30) return `${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years} an${years > 1 ? 's' : ''}${rem ? ` ${rem} mois` : ''}`.trim();
}

/** Animal : âge depuis naissance (si connue) + durée en ferme depuis entrée. */
export function formatAnimalAge(animal = {}) {
  if (animal.age || animal.age_label) return String(animal.age || animal.age_label);

  const birth = animal.date_naissance || animal.birth_date;
  const entry = animal.date_entree_ferme || animal.date_achat || animal.date_poids_entree;
  const birthDays = birth ? daysSince(birth) : null;
  const farmDays = entry ? daysSince(entry) : null;

  const parts = [];
  if (birthDays !== null) parts.push(formatBirthAge(birthDays));
  if (farmDays !== null) parts.push(`${farmDays} j en ferme`);
  return parts.length ? parts.join(' · ') : 'Non renseigné — date naissance ou entrée';
}

/** Lot avicole : jours depuis date_debut (ou age_jours stocké). Chair en J+X, pondeuses en mois + semaine. */
export function formatLotAge(lot = {}, { layer = false } = {}) {
  const stored = lot.age_jours ?? lot.age_days;
  const start = lot.date_debut || lot.entry_date || lot.date_entree || lot.created_at;
  const days = stored != null && stored !== '' ? Number(stored) : (start ? daysSince(start) : null);
  if (days === null || Number.isNaN(days)) return 'Non renseigné — date début du lot';

  const weeks = Math.floor(days / 7);
  if (layer) {
    const months = Math.floor(days / 30.44);
    return `${months} mois · S${weeks} (${days} j)`;
  }
  return `J${days} · ${weeks} sem.`;
}
