/** Gestionnaire centralisé de modals/formulaires — remplace window.dispatchEvent('horizon-open-form'). */

import { trackFormModalOpen } from './erpRules/surveillanceUxRules.js';

const listeners = new Set();

export function subscribeFormModal(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function openFormModal({ module, draft = {} } = {}) {
  trackFormModalOpen(module, draft?.form_type || draft?.intent_label || '');
  const detail = { module, draft, timestamp: Date.now() };
  listeners.forEach((handler) => {
    try { handler(detail); } catch { /* ignore */ }
  });
  window.dispatchEvent(new CustomEvent('horizon-open-form', { detail }));
  return detail;
}

/** Compatibilité avec l'ancien emitHorizonForm. */
export function emitHorizonForm(module, form_type, intent_label, draft_fields = {}) {
  return openFormModal({
    module,
    draft: {
      primary_module: module,
      form_type,
      intent_label,
      status: 'draft_ready',
      draft_fields,
    },
  });
}

export function initFormModalBridge() {
  if (typeof window === 'undefined') return;
  if (window.__horizonFormModalBridge) return;
  window.__horizonFormModalBridge = true;
  window.horizonOpenForm = emitHorizonForm;
}
