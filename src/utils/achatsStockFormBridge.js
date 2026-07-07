import { emitHorizonForm } from '../services/formModalManager.js';

export const STOCK_PENDING_FORM_KEY = 'horizon_stock_pending_form';
const RETRY_DELAYS_MS = [80, 350, 800];

export function stashStockPendingForm(intent_label, draft_fields = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STOCK_PENDING_FORM_KEY, JSON.stringify({
      module: 'stock',
      form_type: 'stock_purchase',
      intent_label,
      draft_fields,
      ts: Date.now(),
    }));
  } catch {
    /* ignore */
  }
}

export function readStockPendingForm() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STOCK_PENDING_FORM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - Number(parsed.ts || 0) > 1000 * 60 * 30) {
      window.sessionStorage.removeItem(STOCK_PENDING_FORM_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStockPendingForm() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STOCK_PENDING_FORM_KEY);
}

/** Ouvre la réception stock depuis n'importe quel onglet (file d'attente + bascule Inventaire). */
export function openStockPurchaseForm({ setTab, intent_label = 'Réception stock', draft_fields = {} } = {}) {
  stashStockPendingForm(intent_label, draft_fields);
  setTab?.('Inventaire');
  RETRY_DELAYS_MS.forEach((delay) => {
    window.setTimeout(() => {
      emitHorizonForm('stock', 'stock_purchase', intent_label, draft_fields);
    }, delay);
  });
}
