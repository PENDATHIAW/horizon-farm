import { parseWeightHistory } from './animalGrowth';
import { toNumber } from './format';

export const WEIGHING_INTERVAL_DAYS = 15;

const today = () => new Date().toISOString().slice(0, 10);

export const addDaysIso = (date, days) => {
  const base = new Date(date || today());
  if (Number.isNaN(base.getTime())) return today();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

export function isAnimalLocked(animal = {}) {
  const status = String(animal.status || animal.statut || '').trim().toLowerCase();
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'sorti'].includes(status);
}

export function targetWeightOf(animal = {}) {
  return toNumber(animal.poids_cible ?? animal.poids_objectif ?? animal.target_weight ?? animal.objectif_poids);
}

export function buildAnimalWeighingProfile(animal = {}) {
  const history = parseWeightHistory(animal);
  const entryDate = animal.date_poids_entree || animal.date_entree_ferme || animal.date_achat || today();
  const lastDate = animal.date_derniere_pesee || animal.last_weighing_date || history[history.length - 1]?.date || today();
  const entryWeight = toNumber(animal.poids_entree ?? animal.weight_entry ?? animal.poids_initial ?? animal.initial_weight);
  const currentWeight = toNumber(animal.poids_actuel ?? animal.poids ?? animal.weight ?? animal.current_weight ?? animal.last_weight);

  if (entryWeight > 0 && !history.some((row) => row.date === entryDate)) {
    history.unshift({ date: entryDate, poids: entryWeight, note: 'Entrée ferme' });
  }
  if (currentWeight > 0 && !history.some((row) => row.date === lastDate && Math.round(row.poids * 10) === Math.round(currentWeight * 10))) {
    history.push({ date: lastDate, poids: currentWeight, note: 'Dernière pesée' });
  }

  history.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const first = history[0];
  const last = history[history.length - 1];
  const current = toNumber(last?.poids || currentWeight);
  const target = targetWeightOf(animal);
  const progress = target > 0 ? Math.round((current / target) * 100) : 0;
  const gain = first && last ? last.poids - first.poids : 0;
  const days = Math.max(
    1,
    Math.round((new Date(last?.date || today()) - new Date(first?.date || today())) / 86400000) || 1,
  );
  const gainPerDay = first && last ? gain / days : 0;
  const locked = isAnimalLocked(animal);
  const nextWeighing = locked ? '' : addDaysIso(lastDate, WEIGHING_INTERVAL_DAYS);
  const reminderDate = nextWeighing ? addDaysIso(nextWeighing, -1) : '';
  const weighingStatus = locked
    ? 'verrouille'
    : nextWeighing < today()
      ? 'retard'
      : reminderDate <= today()
        ? 'j-1'
        : 'planifie';

  const statusRaw = String(animal.status || animal.statut || '').trim().toLowerCase();
  const saleStatus = statusRaw === 'vendu'
    ? 'vendu'
    : progress >= 100 || animal.ready_to_sell || statusRaw === 'pret_a_la_vente'
      ? 'pret'
      : progress >= 90
        ? 'presque'
        : progress > 0 && progress < 75
          ? 'retard'
          : 'normal';

  const decision = saleStatus === 'vendu'
    ? 'Animal vendu : fiche verrouillée'
    : saleStatus === 'pret'
      ? 'Créer / exécuter opportunité de vente'
      : saleStatus === 'presque'
        ? 'Peser puis vendre si marge OK'
        : saleStatus === 'retard'
          ? 'Revoir ration, santé et coût journalier'
          : weighingStatus === 'j-1'
            ? 'Pesée à préparer demain (rappel J-1)'
            : weighingStatus === 'retard'
              ? 'Pesée en retard - enregistrer une nouvelle pesée'
              : 'Continuer le suivi normal (cycle J+15)';

  return {
    history,
    current,
    target,
    progress,
    gain,
    gainPerDay,
    saleStatus,
    decision,
    lastDate,
    nextWeighing,
    reminderDate,
    weighingStatus,
    locked,
    intervalDays: WEIGHING_INTERVAL_DAYS,
  };
}

export function weighingStatusLabel(status = '') {
  if (status === 'verrouille') return 'Fiche verrouillée';
  if (status === 'retard') return 'Pesée en retard';
  if (status === 'j-1') return 'Rappel J-1 actif';
  if (status === 'planifie') return 'Pesée planifiée';
  return status || 'Suivi actif';
}
