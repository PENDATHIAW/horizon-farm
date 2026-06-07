import { addDays } from '../utils/decisionFormFields';

const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

function daysSince(dateValue) {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function speciesProfile(species = '') {
  const key = norm(species);
  if (key.includes('bovin')) return { targetDelay: 90, normalFrequency: 30, closeFrequency: 15, sickFrequency: 10, dailyGain: 0.45, defaultTargetGain: 40 };
  if (key.includes('caprin')) return { targetDelay: 90, normalFrequency: 21, closeFrequency: 14, sickFrequency: 10, dailyGain: 0.08, defaultTargetGain: 7 };
  return { targetDelay: 90, normalFrequency: 21, closeFrequency: 14, sickFrequency: 10, dailyGain: 0.1, defaultTargetGain: 9 };
}

function animalStatus(animal = {}) {
  return norm(animal.status || animal.statut || animal.sale_readiness_status || '');
}

function isClosedAnimal(animal = {}) {
  const status = animalStatus(animal);
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => status.includes(norm(word)));
}

function closedAnimalTexts(animal = {}) {
  const status = animalStatus(animal);
  if (status.includes('vendu')) return {
    reason: 'Animal vendu : suivi actif, pesée et alimentation arrêtés. Conserver la fiche pour traçabilité commerciale.',
    decision: 'Animal vendu : fiche verrouillée, vérifier commande, paiement et marge.',
    readiness: 'vendu',
  };
  if (status.includes('mort') || status.includes('perdu')) return {
    reason: 'Animal clôturé en perte : suivi actif, vente, pesée et alimentation arrêtés. Conserver la fiche pour traçabilité et analyse.',
    decision: 'Historisé comme perte animal.',
    readiness: 'non_pret',
  };
  if (status.includes('vole') || status.includes('volé')) return {
    reason: 'Animal volé : suivi actif et pesées arrêtés. Conserver la fiche pour traçabilité et déclaration.',
    decision: 'Historisé comme sortie anormale.',
    readiness: 'non_pret',
  };
  if (status.includes('abattu')) return {
    reason: 'Animal abattu/transformé : suivi de croissance arrêté. Suivre le stock viande et les ventes.',
    decision: 'Suivre stock, ventes, paiements et marge après abattage.',
    readiness: 'sorti',
  };
  return {
    reason: 'Animal clôturé/sorti : suivi actif et rappels de pesée arrêtés. Conserver l’historique.',
    decision: 'Fiche clôturée : aucune nouvelle pesée à planifier.',
    readiness: 'sorti',
  };
}

export function buildAnimalDecisionProfile(animal = {}) {
  const profile = speciesProfile(animal.type || animal.espece || animal.categorie);
  const health = norm(animal.health_status || animal.sante || 'sain');
  const currentWeight = num(animal.poids_actuel ?? animal.poids ?? animal.weight);
  const entryWeight = num(animal.poids_entree ?? animal.weight_entry ?? animal.poids_initial) || currentWeight;
  const acquisition = animal.mode_acquisition || 'achat';
  const isBirth = ['naissance_ferme', 'reproduction_interne'].includes(acquisition);
  const entryDate = isBirth
    ? (animal.date_naissance || animal.birth_date || animal.date_poids_entree || animal.date_entree_ferme || today())
    : (animal.date_poids_entree || animal.date_entree_ferme || animal.date_achat || animal.created_at || today());
  const lastWeighingDate = animal.date_derniere_pesee || animal.date_poids_entree || entryDate;
  const ageDays = daysSince(entryDate);
  const targetDelay = num(animal.delai_cible_vente_jours) || profile.targetDelay;
  const manualTarget = num(animal.poids_objectif ?? animal.target_weight ?? animal.objectif_poids);
  const targetWeight = manualTarget || Number((entryWeight + profile.defaultTargetGain).toFixed(2));
  const progress = targetWeight > entryWeight ? Math.max(0, Math.min(1, (currentWeight - entryWeight) / (targetWeight - entryWeight))) : 0;

  if (isClosedAnimal(animal)) {
    const closed = closedAnimalTexts(animal);
    return {
      entryWeight,
      currentWeight,
      targetWeight,
      entryDate,
      lastWeighingDate,
      nextWeighingDate: '',
      expectedWeight: '',
      frequency: 0,
      reason: closed.reason,
      decision: closed.decision,
      ageDays,
      targetDelay,
      progressPercent: Math.round(progress * 100),
      closed: true,
      readiness: closed.readiness,
      lossValue: num(animal.valeur_perte_estimee ?? animal.purchase_cost ?? animal.cout_achat ?? animal.prix_achat),
    };
  }

  const isSick = ['malade', 'blesse', 'blesse', 'sous_traitement', 'a_surveiller'].some((status) => health.includes(status));
  const closeToSale = progress >= 0.8 || ageDays >= Math.max(0, targetDelay - 20);
  const frequency = isSick ? profile.sickFrequency : closeToSale ? profile.closeFrequency : profile.normalFrequency;
  const nextWeighingDate = animal.date_prochaine_pesee_recommandee || addDays(lastWeighingDate, frequency);
  const daysUntilNext = Math.max(0, daysSince(lastWeighingDate) >= frequency ? 0 : frequency - daysSince(lastWeighingDate));
  const expectedWeight = Number((currentWeight + profile.dailyGain * Math.max(daysUntilNext, frequency)).toFixed(2));
  const cappedExpectedWeight = targetWeight ? Math.min(targetWeight, expectedWeight) : expectedWeight;

  let reason = 'Pesée espacée pour suivre la croissance sans fatiguer l’équipe.';
  if (isSick) reason = 'Contrôle plus rapproché car l’animal est malade, blessé ou à surveiller.';
  else if (closeToSale) reason = 'Pesée rapprochée car l’animal approche de la vente ou du poids objectif.';

  let decision = 'Continuer le suivi normal.';
  if (currentWeight >= targetWeight && targetWeight > 0) decision = 'Préparer vente ou précommande.';
  else if (ageDays > targetDelay) decision = 'Cash immobilisé : décider vente, précommande ou prolongation justifiée.';
  else if (isSick) decision = 'Prioriser santé et alimentation avant décision commerciale.';

  return {
    entryWeight,
    currentWeight,
    targetWeight,
    entryDate,
    lastWeighingDate,
    nextWeighingDate,
    expectedWeight: cappedExpectedWeight,
    frequency,
    reason,
    decision,
    ageDays,
    targetDelay,
    progressPercent: Math.round(progress * 100),
    closed: false,
  };
}

export function applyAnimalDecisionDefaults(payload = {}, existing = {}) {
  const base = { ...existing, ...payload };
  const profile = buildAnimalDecisionProfile(base);
  const closed = profile.closed;
  const status = animalStatus(base);
  const lossClosed = status.includes('mort') || status.includes('perdu') || status.includes('vole') || status.includes('volé');
  return {
    ...payload,
    poids_entree: profile.entryWeight,
    weight_entry: profile.entryWeight,
    poids_actuel: profile.currentWeight,
    poids: profile.currentWeight,
    weight: profile.currentWeight,
    poids_objectif: profile.targetWeight,
    target_weight: profile.targetWeight,
    frequence_pesee_jours: profile.frequency,
    date_derniere_pesee: profile.lastWeighingDate,
    date_prochaine_pesee_recommandee: profile.nextWeighingDate,
    prochaine_pesee: profile.nextWeighingDate,
    rappel_pesee: profile.nextWeighingDate ? addDays(profile.nextWeighingDate, -1) : '',
    date_rappel_pesee: profile.nextWeighingDate ? addDays(profile.nextWeighingDate, -1) : '',
    poids_attendu_prochaine_pesee: profile.expectedWeight,
    raison_pesee_recommandee: profile.reason,
    decision_apres_pesee_view: profile.decision,
    delai_cible_vente_jours: profile.targetDelay,
    pret_vente_recommande: closed ? false : payload.pret_vente_recommande,
    pret_vente_confirme: closed ? false : (payload.pret_vente_confirme ?? existing.pret_vente_confirme ?? false),
    sale_readiness_status: closed ? profile.readiness : payload.sale_readiness_status,
    valeur_perte_estimee: lossClosed ? num(payload.valeur_perte_estimee ?? existing.valeur_perte_estimee ?? profile.lossValue) : payload.valeur_perte_estimee,
    alerte_cash_immobilise_view: closed ? 'Suivi clôturé' : profile.ageDays > profile.targetDelay ? `Alerte: ${profile.ageDays} jours en ferme, objectif ${profile.targetDelay} jours` : 'OK',
  };
}
