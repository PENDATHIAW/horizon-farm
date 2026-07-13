import { openFormModal } from '../services/formModalManager.js';

export const DAILY_FORM_TYPES = Object.freeze({
  distribution: 'daily_feeding',
  ponte: 'daily_eggs',
  mortalite: 'daily_mortality',
  pesee: 'daily_weighing',
  irrigation: 'daily_irrigation',
  recolte: 'daily_harvest',
  vente: 'sale_record',
});

export function openDailyQuickEntry(entry, onNavigate, delayMs = 180) {
  if (!entry?.module || !DAILY_FORM_TYPES[entry.id]) return false;
  onNavigate?.(entry.module, { tab: entry.onglet || entry.tab });
  window.setTimeout(() => {
    openFormModal({
      module: entry.module,
      draft: {
        primary_module: entry.module,
        form_type: DAILY_FORM_TYPES[entry.id],
        intent_label: entry.libelleBouton || entry.libelle,
        status: 'draft_ready',
        draft_fields: {
          date: new Date().toISOString().slice(0, 10),
          source: 'saisie_rapide_globale',
        },
      },
    });
  }, delayMs);
  return true;
}
