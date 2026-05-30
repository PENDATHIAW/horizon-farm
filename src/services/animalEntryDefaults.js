const num = (value = 0) => Number(value || 0);
const dayMs = 86400000;

const SPECIES_DEFAULTS = {
  Bovin: { prefix: 'BOV', targetDays: 90, weighingFrequencyDays: 15, gainMin: 0.7, gainTarget: 0.85, gainMax: 1, defaultSex: 'F', defaultHealth: 'sain', defaultAcquisition: 'achat' },
  Ovin: { prefix: 'OVI', targetDays: 90, weighingFrequencyDays: 15, gainMin: 0.12, gainTarget: 0.18, gainMax: 0.25, defaultSex: 'F', defaultHealth: 'sain', defaultAcquisition: 'achat' },
  Caprin: { prefix: 'CAP', targetDays: 90, weighingFrequencyDays: 15, gainMin: 0.08, gainTarget: 0.13, gainMax: 0.18, defaultSex: 'F', defaultHealth: 'sain', defaultAcquisition: 'achat' },
};

export function getAnimalSpeciesDefaults(type = 'Bovin') {
  return SPECIES_DEFAULTS[type] || SPECIES_DEFAULTS.Bovin;
}

export function addDays(date, days) {
  const base = date ? new Date(date) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / dayMs));
}

export function suggestAnimalTargetWeight({ type = 'Bovin', poidsEntree = 0, targetDays, gainTarget } = {}) {
  const defaults = getAnimalSpeciesDefaults(type);
  const entry = num(poidsEntree);
  if (!entry) return 0;
  const days = num(targetDays) || defaults.targetDays;
  const gain = num(gainTarget) || defaults.gainTarget;
  return Math.round((entry + gain * days) * 10) / 10;
}

export function normalizeWeightHistory(history = []) {
  if (typeof history === 'string') {
    try { return normalizeWeightHistory(JSON.parse(history)); } catch { return []; }
  }
  if (!Array.isArray(history)) return [];
  return history
    .map((item) => ({ date: item.date || item.date_pesee, poids: num(item.poids || item.weight), note: item.note || item.commentaire || '' }))
    .filter((item) => item.date && item.poids > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function computeLivingAnimalGrowthTarget(animal = {}) {
  const type = animal.type || 'Bovin';
  const defaults = getAnimalSpeciesDefaults(type);
  const entryDate = animal.date_poids_entree || animal.date_entree_ferme || animal.date_achat || new Date().toISOString().slice(0, 10);
  const entryWeight = num(animal.poids_entree || animal.weight_entry || animal.poids);
  const frequency = num(animal.frequence_pesee_jours) || defaults.weighingFrequencyDays;
  const targetDays = num(animal.delai_cible_jours) || defaults.targetDays;
  const defaultGain = num(animal.objectif_croissance_jour) || defaults.gainTarget;
  const history = normalizeWeightHistory(animal.poids_history || animal.weight_history || animal.historique_poids);
  const ensuredHistory = entryWeight > 0 && !history.some((item) => item.date === entryDate && item.poids === entryWeight)
    ? [{ date: entryDate, poids: entryWeight, note: 'Poids entrée ferme' }, ...history]
    : history;
  const sorted = normalizeWeightHistory(ensuredHistory);
  const first = sorted[0] || (entryWeight > 0 ? { date: entryDate, poids: entryWeight } : null);
  const last = sorted[sorted.length - 1] || first;
  const elapsedDays = first && last ? Math.max(1, daysBetween(first.date, last.date)) : 1;
  const realGainPerDay = first && last && sorted.length >= 2 ? (last.poids - first.poids) / elapsedDays : 0;
  const adaptiveGain = realGainPerDay > 0 ? Math.max(defaults.gainMin, Math.min(defaults.gainMax, realGainPerDay)) : defaultGain;
  const initialTarget = suggestAnimalTargetWeight({ type, poidsEntree: first?.poids || entryWeight, targetDays, gainTarget: defaultGain });
  const livingTarget = first?.poids ? Math.round((first.poids + adaptiveGain * targetDays) * 10) / 10 : 0;
  const projectedWeight = last?.poids ? Math.round((last.poids + adaptiveGain * Math.max(0, targetDays - daysBetween(first?.date || entryDate, new Date().toISOString().slice(0, 10)))) * 10) / 10 : 0;
  const nextWeighingDate = addDays(last?.date || entryDate, frequency);
  const today = new Date().toISOString().slice(0, 10);
  const weighingDue = nextWeighingDate <= today;
  const progress = livingTarget > 0 && last?.poids ? Math.round((last.poids / livingTarget) * 100) : 0;
  const status = (() => {
    if (!last?.poids) return 'poids_a_renseigner';
    if (progress >= 100) return 'pret_vente';
    if (realGainPerDay > 0 && realGainPerDay < defaults.gainMin) return 'retard_croissance';
    if (realGainPerDay > defaults.gainMax) return 'croissance_rapide';
    if (weighingDue) return 'pesee_due';
    return 'croissance_normale';
  })();
  const action = (() => {
    if (status === 'poids_a_renseigner') return 'Renseigner le poids d’entrée pour calculer l’objectif.';
    if (status === 'pret_vente') return 'Vérifier prix du marché puis confirmer l’opportunité de vente si rentable.';
    if (status === 'retard_croissance') return 'Agir : vérifier alimentation, eau, santé, stress, parasites et programmer contrôle vétérinaire si besoin.';
    if (status === 'croissance_rapide') return 'Croissance supérieure à l’objectif : surveiller coût alimentaire et préparer vente optimale.';
    if (status === 'pesee_due') return 'Pesée à faire : mettre à jour la fiche pour recalculer la projection.';
    return 'Croissance conforme : maintenir ration, eau et calendrier de pesée.';
  })();

  return {
    type,
    frequency,
    targetDays,
    entryDate: first?.date || entryDate,
    entryWeight: first?.poids || entryWeight,
    currentDate: last?.date || entryDate,
    currentWeight: last?.poids || entryWeight,
    initialTarget,
    livingTarget,
    projectedWeight,
    defaultGainPerDay: Number(defaultGain.toFixed(3)),
    realGainPerDay: Number(realGainPerDay.toFixed(3)),
    adaptiveGainPerDay: Number(adaptiveGain.toFixed(3)),
    nextWeighingDate,
    weighingDue,
    progress,
    status,
    action,
    history: sorted,
  };
}

export function buildInitialAnimalEntry({ id, type = 'Bovin', date, existing = {} } = {}) {
  const defaults = getAnimalSpeciesDefaults(type);
  const entryDate = date || new Date().toISOString().slice(0, 10);
  const animalId = id || `${defaults.prefix}${Date.now()}`;
  return {
    id: animalId,
    tag: animalId,
    boucle_numero: animalId,
    qr_code: animalId,
    type,
    status: 'actif',
    health_status: defaults.defaultHealth,
    mode_acquisition: defaults.defaultAcquisition,
    date_achat: entryDate,
    date_entree_ferme: entryDate,
    date_poids_entree: entryDate,
    date_derniere_pesee: entryDate,
    frequence_pesee_jours: defaults.weighingFrequencyDays,
    sexe: defaults.defaultSex,
    en_gestation: false,
    statut_reproduction: 'inconnu',
    delai_cible_jours: defaults.targetDays,
    objectif_croissance_jour: defaults.gainTarget,
    gain_cible_min_jour: defaults.gainMin,
    gain_cible_max_jour: defaults.gainMax,
    purchase_cost: 0,
    sale_price: 0,
    ...existing,
  };
}

export function enrichAnimalEntryPayload(payload = {}) {
  const type = payload.type || 'Bovin';
  const defaults = getAnimalSpeciesDefaults(type);
  const entryDate = payload.date_poids_entree || payload.date_entree_ferme || payload.date_achat || new Date().toISOString().slice(0, 10);
  const entryWeight = num(payload.poids_entree || payload.poids);
  const acquisition = payload.mode_acquisition || defaults.defaultAcquisition;
  const isBirth = ['naissance_ferme', 'reproduction_interne'].includes(acquisition);
  const baseHistory = normalizeWeightHistory(payload.poids_history);
  const weightHistory = entryWeight > 0 && !baseHistory.some((item) => item.date === entryDate && item.poids === entryWeight)
    ? [{ date: entryDate, poids: entryWeight, note: 'Poids entrée ferme' }, ...baseHistory]
    : baseHistory;
  const enriched = {
    ...payload,
    tag: payload.tag || payload.id,
    boucle_numero: payload.boucle_numero || payload.tag || payload.id,
    qr_code: payload.qr_code || payload.tag || payload.id,
    status: payload.status || 'actif',
    health_status: payload.health_status || defaults.defaultHealth,
    mode_acquisition: acquisition,
    date_entree_ferme: payload.date_entree_ferme || payload.date_achat || entryDate,
    date_achat: acquisition === 'achat' ? (payload.date_achat || payload.date_entree_ferme || entryDate) : '',
    poids: entryWeight || payload.poids || null,
    poids_entree: entryWeight || null,
    date_poids_entree: entryDate,
    date_derniere_pesee: payload.date_derniere_pesee || entryDate,
    frequence_pesee_jours: num(payload.frequence_pesee_jours) || defaults.weighingFrequencyDays,
    poids_history: weightHistory,
    delai_cible_jours: num(payload.delai_cible_jours) || defaults.targetDays,
    objectif_croissance_jour: num(payload.objectif_croissance_jour) || defaults.gainTarget,
    gain_cible_min_jour: defaults.gainMin,
    gain_cible_max_jour: defaults.gainMax,
    purchase_cost: isBirth ? 0 : num(payload.purchase_cost),
    sante: 0,
    frais_sante: 0,
  };
  const living = computeLivingAnimalGrowthTarget(enriched);
  return {
    ...enriched,
    poids_objectif_initial: living.initialTarget || null,
    poids_objectif_suggere: living.livingTarget || null,
    poids_objectif: payload.poids_objectif || living.livingTarget || null,
    date_prochaine_pesee_recommandee: living.nextWeighingDate,
    alerte_pesee_due: living.weighingDue,
    statut_croissance_ia: living.status,
    recommandation_croissance_ia: living.action,
  };
}

export function animalTargetWeightExplanation({ type = 'Bovin', poidsEntree = 0 } = {}) {
  const defaults = getAnimalSpeciesDefaults(type);
  const target = suggestAnimalTargetWeight({ type, poidsEntree, targetDays: defaults.targetDays, gainTarget: defaults.gainTarget });
  return {
    type,
    weighingFrequencyDays: defaults.weighingFrequencyDays,
    targetDays: defaults.targetDays,
    gainTarget: defaults.gainTarget,
    targetWeight: target,
    formula: `poids entrée + (${defaults.gainTarget} kg/jour × ${defaults.targetDays} jours)`,
  };
}
