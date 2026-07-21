/**
 * Pilote préremplissage - encaissement d'une commande (Commercial).
 *
 * Depuis une commande/vente, le formulaire d'encaissement hérite du client, de la
 * facture, de la ferme et du reste à payer (montant proposé par défaut). Le
 * moyen de paiement reprend la dernière valeur utilisée. On ne resaisit rien de
 * ce qui est déjà connu ; l'utilisateur confirme le montant reçu.
 */

import { buildFormPrefill, mergePrefillIntoForm } from './formPrefill.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Construit un brouillon d'encaissement. `subject` = la commande/vente ;
 * `remaining` = reste à payer calculé (prioritaire) ; `method`/`lastValues` pour
 * le moyen de paiement. Sans sujet, renvoie un brouillon minimal (rétrocompatible).
 */
export function buildPaymentDraft({
  subject = null,
  remaining,
  method,
  date,
  lastValues = {},
} = {}) {
  const draft = {
    date: date || today(),
    source: 'commercial_encaissement',
  };

  if (subject && subject.id) {
    const prefill = buildFormPrefill({
      formType: 'payment_record',
      subject,
      context: { remaining, method, date },
      lastValues,
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

export default buildPaymentDraft;
