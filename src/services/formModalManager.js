/** Gestionnaire centralisé de modals/formulaires - remplace window.dispatchEvent('horizon-open-form'). */

import { trackFormModalOpen } from './erpRules/surveillanceUxRules.js';

const listeners = new Set();
const pendingByModule = new Map();
const PENDING_TTL_MS = 60_000;

const normalizeModule = (value) => String(value || '').trim().toLowerCase();

function detailModule(detail = {}) {
  return normalizeModule(detail.module || detail.draft?.primary_module);
}

function prunePending(now = Date.now()) {
  pendingByModule.forEach((detail, module) => {
    if (now - Number(detail.timestamp || 0) > PENDING_TTL_MS) pendingByModule.delete(module);
  });
}

function matchesSubscription(subscription, detail) {
  if (!subscription.modules.size) return true;
  return subscription.modules.has(detailModule(detail));
}

function notify(subscription, detail) {
  if (!matchesSubscription(subscription, detail)) return false;
  try {
    return subscription.handler(detail) === true;
  } catch {
    return false;
  }
}

export function subscribeFormModal(handler, { modules = [], replayPending = true } = {}) {
  const subscription = {
    handler,
    modules: new Set([modules].flat().map(normalizeModule).filter(Boolean)),
  };
  listeners.add(subscription);

  if (replayPending) {
    queueMicrotask(() => {
      if (!listeners.has(subscription)) return;
      prunePending();
      for (const [module, detail] of pendingByModule) {
        if (notify(subscription, detail)) {
          pendingByModule.delete(module);
          break;
        }
      }
    });
  }

  return () => listeners.delete(subscription);
}

export function openFormModal({ module, draft = {} } = {}) {
  const normalizedModule = normalizeModule(module || draft?.primary_module);
  trackFormModalOpen(normalizedModule, draft?.form_type || draft?.intent_label || '');
  const detail = { module: normalizedModule, draft, timestamp: Date.now() };
  prunePending(detail.timestamp);
  if (normalizedModule) pendingByModule.set(normalizedModule, detail);

  let handled = false;
  listeners.forEach((subscription) => {
    if (notify(subscription, detail)) handled = true;
  });
  if (handled) pendingByModule.delete(normalizedModule);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('horizon-open-form', { detail }));
  }
  return detail;
}

export function clearPendingFormModals() {
  pendingByModule.clear();
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
