/** Canal officiel santé : Élevage > Santé → SanteV8/V7/V6 (InterventionPanel). */

export const HEALTH_INTERVENTION_FORM_ID = 'elevage-health-intervention-form';

export const HEALTH_TERRAIN_BANNER =
  'Saisie terrain — formulaire santé complet. Ajoutez une photo, ordonnance, facture ou carnet de vaccination si disponible.';

export const HEALTH_STOCK_CONTEXT_MESSAGE =
  'Médicaments et vaccins stockés — gérez les intrants sanitaires dans Achats & Stock.';

export const HEALTH_STOCK_SEARCH_TERMS = [
  'vaccin',
  'medicament',
  'médicament',
  'antibiotique',
  'vermifuge',
  'vitamine',
  'traitement',
  'vétérinaire',
  'veterinaire',
];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Construit un brouillon pour InterventionPanel (SanteV6) depuis un raccourci terrain.
 */
export function buildHealthInterventionDraft({
  animalId,
  lotId,
  typeIntervention,
  date,
  nom,
  notes,
} = {}) {
  const draft = {
    type_intervention: typeIntervention || 'vaccination',
    date: date || today(),
    statut: 'a_faire',
    source: 'elevage_terrain',
    notes: notes || '',
  };
  if (nom) draft.nom = nom;

  if (animalId) {
    draft.target_mode = 'detail:animal';
    draft.target_detail = `animal:${animalId}`;
  } else if (lotId) {
    draft.target_mode = 'detail:lot';
    draft.target_detail = `lot:${lotId}`;
  }

  return draft;
}

/** Ouvre le formulaire santé complet (onglet Santé + brouillon). */
export function openElevageHealthForm({
  setTab,
  setHealthDraft,
  context = {},
  onAfterOpen,
} = {}) {
  const draft = buildHealthInterventionDraft(context);
  setHealthDraft?.(draft);
  setTab?.('Santé');
  if (typeof onAfterOpen === 'function') {
    window.setTimeout(() => onAfterOpen(draft), 320);
  }
}

export function scrollToHealthInterventionForm() {
  document.getElementById(HEALTH_INTERVENTION_FORM_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

/** Navigation contextualisée vers Achats & Stock > Stock (médicaments/vaccins). */
export function navigateToHealthStock(onNavigate) {
  onNavigate?.('achats_stock', {
    tab: 'Stock',
    stockContext: 'sante',
    searchContext: HEALTH_STOCK_SEARCH_TERMS.join(' '),
    contextMessage: HEALTH_STOCK_CONTEXT_MESSAGE,
  });
}
