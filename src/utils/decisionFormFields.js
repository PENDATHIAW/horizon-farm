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

export function enrichAnimalFieldsForDecision(fields = []) {
  let next = insertAfter(fields, 'id', [
    { key: 'section_identification_physique', label: 'Identification physique & QR', type: 'section' },
    { key: 'boucle_numero', label: 'N° boucle terrain (ex: BOV001)', type: 'text' },
    { key: 'qr_code', label: 'Code QR / identifiant scan', type: 'text' },
    { key: 'photo_url', label: 'Photo principale animal', type: 'text' },
    { key: 'photo_gauche_url', label: 'Photo profil gauche', type: 'text' },
    { key: 'photo_droite_url', label: 'Photo profil droit', type: 'text' },
    { key: 'signes_distinctifs', label: 'Signes distinctifs', type: 'textarea' },
    { key: 'emplacement_actuel', label: 'Emplacement actuel', type: 'text' },
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

export function enrichAvicoleFieldsForDecision(fields = []) {
  let next = insertAfter(fields, 'weight_avg', [
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
