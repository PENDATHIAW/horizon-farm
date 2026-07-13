/** Canal officiel transformation : Élevage > Transformation → TransformationOfficialForm. */

export const TRANSFORMATION_FORM_ID = 'elevage-transformation-official-form';

export const TRANSFORMATION_TERRAIN_BANNER =
  'Préparation terrain - complétez le formulaire officiel Transformation. Le stock viande n’est créé qu’après validation explicite.';

const today = () => new Date().toISOString().slice(0, 10);

export function buildTransformationDraft({
  animalId,
  lotId,
  transformType,
  date,
  notes,
  activity,
} = {}) {
  const draft = {
    date: date || today(),
    transform_type: transformType || (animalId ? 'abattage' : lotId ? 'abattage' : 'transformation_viande'),
    source_type: animalId ? 'animal' : lotId ? 'lot_avicole' : '',
    statut: 'a_valider',
    source: 'elevage_terrain',
    notes: notes || '',
  };
  if (animalId) {
    draft.animal_id = animalId;
    draft.source_type = 'animal';
  }
  if (lotId) {
    draft.lot_id = lotId;
    draft.source_type = 'lot_avicole';
    if (activity) draft.activity = activity;
  }
  return draft;
}

export function openElevageTransformationForm({
  setTab,
  setTransformationDraft,
  context = {},
  onAfterOpen,
} = {}) {
  const draft = buildTransformationDraft(context);
  setTransformationDraft?.(draft);
  setTab?.('Transformation');
  if (typeof onAfterOpen === 'function') {
    window.setTimeout(() => onAfterOpen(draft), 320);
  }
}

export function scrollToTransformationForm() {
  document.getElementById(TRANSFORMATION_FORM_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

/** Préparer vente Commercial après transformation validée (sans créer la vente). */
export function navigateToCommercialAfterTransform(onNavigate, context = {}) {
  onNavigate?.('commercial', {
    tab: 'Ventes',
    stockContext: 'viande',
    contextMessage: 'Produit fini issu transformation - confirmer la vente.',
    productId: context.stockId || context.produit_fini_id || '',
    productName: context.produit_fini_nom || context.produit || '',
    quantity: context.quantite_produit || context.quantite,
    costPerKg: context.cout_revient_kg,
    floorPrice: context.prix_plancher,
    farmId: context.farm_id,
    transformationId: context.transformation_id,
    prepareOnly: true,
  });
}
