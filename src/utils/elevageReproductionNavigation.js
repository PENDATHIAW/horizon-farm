/** Canal officiel reproduction : Élevage > Reproduction */

export const REPRODUCTION_WORKFLOW_FORM_ID = 'elevage-reproduction-workflow-form';

export const REPRODUCTION_TERRAIN_BANNER =
  'Saisie terrain — reproduction officielle. Validez saillie, gestation ou mise bas avant enregistrement.';

const today = () => new Date().toISOString().slice(0, 10);

export function buildReproductionWorkflowDraft({
  workflow = 'gestation',
  animalId,
  maleId,
  date,
  notes,
  mode_acquisition,
  porteeSize,
} = {}) {
  const form_type =
    workflow === 'saillie'
      ? 'reproduction_saillie'
      : workflow === 'mise_bas'
        ? 'reproduction_mise_bas'
        : 'reproduction_gestation';
  return {
    primary_module: 'elevage',
    form_type,
    intent_label:
      workflow === 'saillie'
        ? 'Saillie'
        : workflow === 'mise_bas'
          ? 'Mise bas / naissance'
          : 'Déclaration gestation',
    status: 'draft_ready',
    draft_fields: {
      workflow,
      animal_id: animalId || '',
      target_id: animalId || '',
      male_id: maleId || '',
      date: date || today(),
      notes: notes || '',
      mode_acquisition: mode_acquisition || 'naissance_ferme',
      portee_size: porteeSize || 1,
    },
  };
}

export function openElevageReproductionForm({
  setTab,
  setReproductionDraft,
  workflow = 'gestation',
  context = {},
  onAfterOpen,
} = {}) {
  const draft = buildReproductionWorkflowDraft({
    workflow,
    animalId: context.animalId || context.animal_id || context.target_id,
    maleId: context.maleId || context.male_id,
    date: context.date,
    notes: context.notes,
    mode_acquisition: context.mode_acquisition,
    porteeSize: context.portee_size || context.porteeSize,
  });
  setReproductionDraft?.(draft);
  setTab?.('Reproduction');
  if (typeof onAfterOpen === 'function') {
    window.setTimeout(() => onAfterOpen(draft), 320);
  }
}

export function scrollToReproductionWorkflowForm() {
  document.getElementById(REPRODUCTION_WORKFLOW_FORM_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
