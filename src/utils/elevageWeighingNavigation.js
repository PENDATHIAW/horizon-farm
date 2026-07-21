/**
 * Pilote préremplissage - pesée d'un sujet (Élevage).
 *
 * « Tant que l'info existe, on ne la resaisit pas » : depuis une fiche animal, le
 * formulaire de pesée hérite de l'espèce, de la boucle, du poids courant (qui
 * devient le poids précédent), de l'objectif et de la ferme. L'utilisateur ne
 * saisit que le nouveau poids.
 */

import { buildFormPrefill, mergePrefillIntoForm } from './formPrefill.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Construit un brouillon de pesée. Sans `subject`, reste un brouillon minimal
 * (rétrocompatible) ; avec `subject`, applique l'héritage sans écraser la saisie.
 */
export function buildWeighingDraft({
  animalId,
  lotId,
  date,
  subject = null,
  context = {},
} = {}) {
  const draft = {
    date: date || today(),
    source: 'elevage_terrain',
  };
  if (animalId) draft.animal_id = animalId;
  if (lotId) draft.lot_id = lotId;

  if (subject && (subject.id || subject.boucle_numero)) {
    const prefill = buildFormPrefill({
      formType: 'weighing',
      subject,
      context: { date, ...context },
    });
    const { form, applied } = mergePrefillIntoForm(prefill.values, draft);
    Object.assign(draft, form);
    if (applied.length) {
      draft.prefill_provenance = prefill.provenance;
      draft.prefill_applied = applied;
    }
  }

  return draft;
}

export default buildWeighingDraft;
