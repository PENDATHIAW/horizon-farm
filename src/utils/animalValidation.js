import { toNumber } from './format.js';

const today = () => new Date().toISOString().slice(0, 10);
const cleanDate = (value) => String(value || '').slice(0, 10);
const isFuture = (value) => cleanDate(value) && cleanDate(value) > today();
const hasDate = (value) => Boolean(cleanDate(value));
const num = (value) => toNumber(value);

const fieldLabels = {
  poids_entree: 'Poids entrée',
  poids: 'Poids actuel',
  poids_cible: 'Poids cible',
  purchase_cost: 'Prix achat / valeur entrée',
  prix_vente_estime: 'Prix vente estimé',
  date_achat: 'Date achat',
  date_entree_ferme: 'Date entrée ferme',
  date_derniere_pesee: 'Date dernière pesée',
};

function addError(errors, field, message) {
  errors.push({ field, label: fieldLabels[field] || field, message });
}

function addWarning(warnings, field, message) {
  warnings.push({ field, label: fieldLabels[field] || field, message });
}

export function validateAnimalPayload(payload = {}) {
  const errors = [];
  const warnings = [];

  ['poids_entree', 'poids', 'poids_cible', 'purchase_cost', 'prix_vente_estime'].forEach((field) => {
    if (payload[field] !== undefined && payload[field] !== '' && num(payload[field]) < 0) {
      addError(errors, field, `${fieldLabels[field]} ne peut pas être négatif.`);
    }
  });

  ['date_achat', 'date_entree_ferme', 'date_derniere_pesee'].forEach((field) => {
    if (isFuture(payload[field])) addError(errors, field, `${fieldLabels[field]} ne peut pas être dans le futur.`);
  });

  if (hasDate(payload.date_achat) && hasDate(payload.date_entree_ferme) && cleanDate(payload.date_achat) > cleanDate(payload.date_entree_ferme)) {
    addError(errors, 'date_achat', 'La date achat ne peut pas être après la date entrée ferme.');
  }

  if (hasDate(payload.date_entree_ferme) && hasDate(payload.date_derniere_pesee) && cleanDate(payload.date_derniere_pesee) < cleanDate(payload.date_entree_ferme)) {
    addError(errors, 'date_derniere_pesee', 'La dernière pesée ne peut pas être avant l’entrée ferme.');
  }

  const entryWeight = num(payload.poids_entree);
  const currentWeight = num(payload.poids);
  const targetWeight = num(payload.poids_cible);
  const purchase = num(payload.purchase_cost);
  const sale = num(payload.prix_vente_estime);

  if (entryWeight > 0 && currentWeight > 0 && currentWeight < entryWeight) {
    addWarning(warnings, 'poids', 'Le poids actuel est inférieur au poids d’entrée : vérifier la pesée ou l’état sanitaire.');
  }

  if (currentWeight > 0 && targetWeight > 0 && targetWeight < currentWeight) {
    addWarning(warnings, 'poids_cible', 'Le poids cible est inférieur au poids actuel : vérifier l’objectif de vente.');
  }

  if (purchase > 0 && sale > 0 && sale < purchase) {
    addWarning(warnings, 'prix_vente_estime', 'Le prix de vente estimé est inférieur au prix d’achat : marge probablement négative.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    blockingMessage: errors.map((error) => error.message).join(' '),
    warningMessage: warnings.map((warning) => warning.message).join(' '),
  };
}

export function assertValidAnimalPayload(payload = {}) {
  const result = validateAnimalPayload(payload);
  if (!result.valid) throw new Error(result.blockingMessage || 'Données animal invalides.');
  return result;
}

export default validateAnimalPayload;
