/**
 * Client Wave / Orange Money.
 */

import { supabase } from '../lib/supabase.js';

const API_BASE = '/api/mobile-money';

async function callApi(action, { method = 'POST', body, query } = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token || '';
  if (!accessToken) throw new Error('Votre session a expiré. Reconnectez-vous pour continuer.');
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const url = `${API_BASE}/${action}${qs}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Mobile money API ${response.status}`);
  }
  return data;
}

export async function createMobileMoneyPaymentLink({
  orderId,
  amount,
  provider = 'wave',
  clientPhone = '',
  clientId = '',
  description = '',
} = {}) {
  return callApi('create-link', {
    body: {
      order_id: orderId,
      amount,
      provider,
      client_phone: clientPhone,
      client_id: clientId,
      description,
    },
  });
}

export async function getMobileMoneyPaymentStatus(ref) {
  return callApi('status', { method: 'GET', query: { ref } });
}

export async function simulateMobileMoneyConfirm(ref) {
  return callApi('simulate-confirm', { body: { ref } });
}

/**
 * Le serveur a déjà enregistré l'encaissement lorsqu'il renvoie "completed".
 */
export async function finalizeMobileMoneyPayment({
  statusResult = {},
} = {}) {
  if (statusResult.status !== 'completed' || !statusResult.payment_id) {
    throw new Error('Le paiement n’est pas encore confirmé.');
  }
  return {
    skipped: Boolean(statusResult.already_posted),
    reason: statusResult.already_posted ? 'duplicate_payment' : '',
    paymentId: statusResult.payment_id,
    amount: Number(statusResult.amount || 0),
    mobileMoneyRef: statusResult.ref,
    provider: statusResult.provider || 'wave',
    serverFinalized: true,
  };
}

export function isMobileMoneyProvider(method = '') {
  const m = String(method || '').toLowerCase();
  return m === 'wave' || m === 'orange_money' || m === 'om' || m === 'orange money';
}
