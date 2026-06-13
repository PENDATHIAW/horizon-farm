/**
 * Client Wave / Orange Money — création lien, statut, finalisation encaissement ERP.
 */

import { recordSalePayment } from '../utils/recordSalePayment.js';

const API_BASE = '/api/mobile-money';

async function callApi(action, { method = 'POST', body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const url = `${API_BASE}/${action}${qs}`;
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
 * Après confirmation mobile money → encaissement canonique ERP.
 */
export async function finalizeMobileMoneyPayment({
  sale,
  statusResult = {},
  payments = [],
  transactions = [],
  clients = [],
  salesOrders = [],
  handlers = {},
  farmScope = {},
  accessibleFarms = [],
  activeFarm = null,
} = {}) {
  const provider = statusResult.provider || 'wave';
  const amount = Number(statusResult.amount || 0);
  const paymentId = statusResult.payment_id || '';

  const result = await recordSalePayment({
    sale,
    requestedAmount: amount,
    payments,
    transactions,
    clients,
    salesOrders,
    paymentMethod: provider,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentId,
    handlers,
    farmScope,
    accessibleFarms,
    activeFarm,
  });

  return { ...result, mobileMoneyRef: statusResult.ref, provider };
}

export function isMobileMoneyProvider(method = '') {
  const m = String(method || '').toLowerCase();
  return m === 'wave' || m === 'orange_money' || m === 'om' || m === 'orange money';
}
