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

const lower = (value) => String(value || '').toLowerCase().trim();

/**
 * Brouillon SanteV6 depuis scan ordonnance (fusion matrice — pas d’auto-commit).
 */
export function buildHealthInterventionDraftFromScan(fields = {}, proofMeta = {}) {
  const typeMap = {
    vaccin: 'vaccination',
    vaccination: 'vaccination',
    curatif: 'curatif',
    traitement: 'curatif',
    antibiotic: 'curatif',
    antibiotique: 'curatif',
    deparasitage: 'deparasitage',
    vermifuge: 'deparasitage',
    urgence: 'urgence',
  };
  const rawType = lower(fields.type_soin || fields.type_intervention || 'curatif');
  const typeIntervention = typeMap[rawType] || 'curatif';

  const draft = buildHealthInterventionDraft({
    animalId: fields.animal_id,
    lotId: fields.lot_id,
    typeIntervention,
    date: fields.date || fields.effectuee,
    nom: fields.nom || fields.vaccin || fields.medicament,
    notes: fields.notes || fields.preuve_texte || '',
  });

  draft.source = 'ordonnance_scan';
  draft.medicament = fields.vaccin || fields.medicament || draft.nom || '';
  draft.dosage = fields.dose || fields.dosage || '';
  if (fields.cout != null) draft.cout = fields.cout;
  if (fields.delai_sanitaire_fin || fields.withdrawal_until) {
    draft.delai_sanitaire_fin = fields.delai_sanitaire_fin || fields.withdrawal_until;
  }
  if (fields.duree_traitement) draft.duree_traitement = fields.duree_traitement;
  if (fields.rappel_jours) {
    draft.periodicite = 'personnalisee';
    draft.frequence_valeur = String(fields.rappel_jours);
    draft.frequence_unite = 'jours';
  }

  const proofUrl = proofMeta.proof_url || proofMeta.file_url || '';
  if (proofUrl) {
    draft.preuve_url = proofUrl;
    draft.preuve_type = 'ordonnance_photo';
  }

  return draft;
}
