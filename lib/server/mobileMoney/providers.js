import { mobileMoneySandbox, orangeMoneyConfig, waveConfig } from './config.js';

const clean = (v) => String(v || '').trim();

function makeRef(provider, orderId) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${provider.toUpperCase()}-${String(orderId || 'ORD').slice(-8)}-${stamp}`;
}

/** Wave Checkout Session (API Business) — sandbox si pas de clé. */
export async function createWavePaymentLink({ amount, orderId, clientPhone, description, currency = 'XOF' }) {
  const cfg = waveConfig();
  const ref = makeRef('WAVE', orderId);
  const sandbox = mobileMoneySandbox() || !cfg.apiKey;

  if (sandbox) {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.VITE_APP_URL || 'http://localhost:5173');
    return {
      ok: true,
      sandbox: true,
      provider: 'wave',
      ref,
      paymentId: `PAY-MM-${ref}`,
      paymentUrl: `${base}/#/commercial?tab=Ventes&mobile_money_sim=${ref}&provider=wave`,
      amount: Number(amount),
      currency,
      message: 'Mode simulation Wave — confirmez depuis l’ERP ou via simulate-confirm.',
    };
  }

  const payload = {
    amount: Math.round(Number(amount)),
    currency,
    client_reference: ref,
    description: clean(description) || `Vente ${orderId}`,
    success_url: `${process.env.VITE_APP_URL || ''}/#/commercial?tab=Ventes&mm_ok=${ref}`,
    cancel_url: `${process.env.VITE_APP_URL || ''}/#/commercial?tab=Ventes&mm_cancel=${ref}`,
  };
  if (clientPhone) payload.customer_phone = clientPhone;

  const response = await fetch(`${cfg.baseUrl}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Wave API ${response.status}`);
  }
  return {
    ok: true,
    sandbox: false,
    provider: 'wave',
    ref: data.client_reference || ref,
    paymentId: `PAY-MM-${ref}`,
    paymentUrl: data.wave_launch_url || data.payment_url || data.url,
    amount: Number(amount),
    currency,
    externalId: data.id || '',
  };
}

/** Orange Money Web Payment — sandbox si pas de clé. */
export async function createOrangeMoneyPaymentLink({ amount, orderId, clientPhone, description, currency = 'XOF' }) {
  const cfg = orangeMoneyConfig();
  const ref = makeRef('OM', orderId);
  const sandbox = mobileMoneySandbox() || !cfg.apiKey;

  if (sandbox) {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.VITE_APP_URL || 'http://localhost:5173');
    return {
      ok: true,
      sandbox: true,
      provider: 'orange_money',
      ref,
      paymentId: `PAY-MM-${ref}`,
      paymentUrl: `${base}/#/commercial?tab=Ventes&mobile_money_sim=${ref}&provider=orange_money`,
      amount: Number(amount),
      currency,
      message: 'Mode simulation Orange Money — confirmez depuis l’ERP.',
    };
  }

  const payload = {
    merchant_code: cfg.merchantCode,
    amount: Math.round(Number(amount)),
    currency,
    order_id: ref,
    reference: ref,
    description: clean(description) || `Vente ${orderId}`,
    customer_phone: clean(clientPhone),
    return_url: `${process.env.VITE_APP_URL || ''}/#/commercial?tab=Ventes&mm_ok=${ref}`,
    cancel_url: `${process.env.VITE_APP_URL || ''}/#/commercial?tab=Ventes&mm_cancel=${ref}`,
  };

  const response = await fetch(`${cfg.baseUrl}/v1/webpayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Orange Money API ${response.status}`);
  }
  return {
    ok: true,
    sandbox: false,
    provider: 'orange_money',
    ref,
    paymentId: `PAY-MM-${ref}`,
    paymentUrl: data.payment_url || data.pay_url || data.url,
    amount: Number(amount),
    currency,
    externalId: data.transaction_id || data.payment_token || '',
  };
}

export async function createProviderPaymentLink(input = {}) {
  const provider = clean(input.provider).toLowerCase();
  if (provider === 'wave') return createWavePaymentLink(input);
  if (provider === 'orange_money' || provider === 'om' || provider === 'orange') {
    return createOrangeMoneyPaymentLink(input);
  }
  throw new Error('Fournisseur mobile money non supporté (wave | orange_money).');
}
