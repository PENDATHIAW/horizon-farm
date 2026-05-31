const hasKey = (fields = [], key) => fields.some((field) => field.key === key);

function insertAfter(fields, anchorKey, additions) {
  const next = [...fields];
  const index = next.findIndex((field) => field.key === anchorKey);
  const clean = additions.filter((field) => !hasKey(next, field.key));
  if (!clean.length) return next;
  if (index >= 0) next.splice(index + 1, 0, ...clean);
  else next.push(...clean);
  return next;
}

export const BUILDING_OPTIONS = [
  { value: 'poulailler_1', label: 'Poulailler 1' },
  { value: 'poulailler_2', label: 'Poulailler 2' },
  { value: 'poulailler_3', label: 'Poulailler 3' },
  { value: 'salle_ponte', label: 'Salle de ponte' },
  { value: 'parc_bovins', label: 'Parc bovins' },
  { value: 'enclos_ovins', label: 'Enclos ovins' },
  { value: 'enclos_caprins', label: 'Enclos caprins' },
  { value: 'magasin_stock', label: 'Magasin / silo' },
  { value: 'zone_quarantaine', label: 'Zone quarantaine' },
  { value: 'autre', label: 'Autre bâtiment' },
];

export function buildingField(key = 'batiment', label = 'Bâtiment / zone') {
  return { key, label, type: 'select', options: BUILDING_OPTIONS };
}

export function supplierSelectField(fournisseurs = [], key = 'fournisseur_id', label = 'Fournisseur') {
  const options = (Array.isArray(fournisseurs) ? fournisseurs : []).map((f) => ({
    value: f.id,
    label: f.nom || f.name || f.id,
  }));
  return {
    key,
    label,
    type: 'select',
    options,
    emptyLabel: 'Aucun fournisseur enregistré',
  };
}

export function enrichAnimalFieldsForDecision(fields = [], fournisseurs = []) {
  let next = insertAfter(fields, 'id', [
    { key: 'section_identification_physique', label: 'Identification physique & QR', type: 'section' },
    { key: 'boucle_numero', label: 'N° boucle terrain (ex: BOV001)', type: 'text' },
    { key: 'qr_code', label: 'Code QR / identifiant scan', type: 'text' },
    { key: 'photo_gauche_url', label: 'Photo profil gauche', type: 'image' },
    { key: 'photo_droite_url', label: 'Photo profil droit', type: 'image' },
    { key: 'photo_face_url', label: 'Photo de face', type: 'image' },
    { key: 'signes_distinctifs', label: 'Signes distinctifs', type: 'textarea' },
    buildingField('batiment', 'Bâtiment / parc'),
    { key: 'emplacement_actuel', label: 'Emplacement actuel', type: 'text' },
  ]);

  next = insertAfter(next, 'fournisseur_vendeur', [
    supplierSelectField(fournisseurs, 'fournisseur_id', 'Fournisseur référencé'),
  ]);

  next = insertAfter(next, 'poids', [
    { key: 'section_pesee_ia', label: 'Pesée & suivi IA', type: 'section' },
    { key: 'poids_entree', label: 'Poids à l’entrée (kg)', type: 'number' },
    { key: 'date_poids_entree', label: 'Date poids entrée', type: 'date' },
    { key: 'poids_actuel', label: 'Poids actuel / dernière pesée (kg)', type: 'number' },
    { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date' },
    { key: 'frequence_pesee_jours', label: 'Fréquence pesée recommandée (jours)', type: 'number' },
    { key: 'date_prochaine_pesee_recommandee', label: 'Prochaine pesée recommandée', type: 'date' },
  ]);

  next = insertAfter(next, 'date_objectif_vente', [
    { key: 'delai_cible_vente_jours', label: 'Délai cible vente (jours)', type: 'number' },
    { key: 'alerte_cash_immobilise_view', label: 'Alerte cash immobilisé', type: 'readonly' },
  ]);

  return next;
}

export function enrichAvicoleFieldsForDecision(fields = [], fournisseurs = []) {
  let next = insertAfter(fields, 'date_debut', [
    buildingField('batiment', 'Bâtiment / poulailler'),
    { key: 'nom_batiment', label: 'Nom bâtiment (libre si autre)', type: 'text' },
  ]);

  next = insertAfter(next, 'weight_avg', [
    { key: 'poids_moyen_entree', label: 'Poids moyen entrée (kg)', type: 'number' },
    { key: 'date_pesee_entree', label: 'Date pesée entrée', type: 'date' },
    { key: 'poids_moyen_actuel', label: 'Poids moyen actuel / dernière pesée (kg)', type: 'number' },
    { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date' },
    { key: 'frequence_pesee_jours', label: 'Fréquence pesée recommandée (jours)', type: 'number' },
    { key: 'date_prochaine_pesee_recommandee', label: 'Prochaine pesée recommandée', type: 'date' },
  ]);

  next = insertAfter(next, 'duree_cycle_valeur', [
    { key: 'age_reforme_recommandee_mois', label: 'Début recommandation réforme (mois)', type: 'number' },
    { key: 'age_reforme_cible_mois', label: 'Réforme cible (mois)', type: 'number' },
    { key: 'date_debut_reforme_recommandee', label: 'Date début réforme recommandée', type: 'date' },
    { key: 'date_reforme_cible', label: 'Date réforme cible', type: 'date' },
  ]);

  if (fournisseurs?.length) {
    next = insertAfter(next, 'cout_poussins', [
      supplierSelectField(fournisseurs, 'fournisseur_id', 'Fournisseur poussins'),
    ]);
  }

  return next;
}

export function addDays(dateValue, days) {
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

export function addMonths(dateValue, months) {
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return '';
  base.setMonth(base.getMonth() + Number(months || 0));
  return base.toISOString().slice(0, 10);
}

export function resolveSupplierName(fournisseurId, fournisseurs = [], fallback = '') {
  const match = (Array.isArray(fournisseurs) ? fournisseurs : []).find((f) => String(f.id) === String(fournisseurId));
  return match?.nom || match?.name || fallback || '';
}

export function resolveBuildingLabel(batiment, nomBatiment = '') {
  const option = BUILDING_OPTIONS.find((item) => item.value === batiment);
  if (nomBatiment) return nomBatiment;
  return option?.label || batiment || '';
}
