import { openFormModal } from '../services/formModalManager.js';
import { buildQuickEntryFields } from './formContract20sPrefill.js';

export const DAILY_FORM_TYPES = Object.freeze({
  distribution: 'daily_feeding',
  ponte: 'daily_eggs',
  mortalite: 'daily_mortality',
  pesee: 'daily_weighing',
  irrigation: 'daily_irrigation',
  recolte: 'daily_harvest',
  vente: 'sale_record',
});

export function openDailyQuickEntry(entry, onNavigate, { data = {}, user = '' } = {}) {
  if (!entry?.module || !DAILY_FORM_TYPES[entry.id]) return false;
  onNavigate?.(entry.module, { tab: entry.onglet || entry.tab });
  // Applique le contrat de préremplissage déclaré (lot unique, dernier client,
  // date, utilisateur…) sur les données vivantes : rien de resaisi si connu.
  const { fields, provenance, appliedStrategies } = buildQuickEntryFields({
    formId: entry.id,
    data,
    context: { user },
    base: { source: 'saisie_rapide_globale' },
  });
  openFormModal({
    module: entry.module,
    draft: {
      primary_module: entry.module,
      form_type: DAILY_FORM_TYPES[entry.id],
      intent_label: entry.libelleBouton || entry.libelle,
      status: 'draft_ready',
      draft_fields: fields,
      prefill_provenance: provenance,
      prefill_applied: appliedStrategies,
    },
  });
  return true;
}
