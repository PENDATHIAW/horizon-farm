import { createHmac, randomBytes } from 'node:crypto';
import { mobileMoneySandbox, orangeMoneyConfig, waveConfig } from './config.js';

const clean = (v) => String(v || '').trim();

function publicAppUrl() {
  const configured = clean(process.env.VITE_APP_URL);
  if (configured) return configured.replace(/\/$/, '');
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
}

function waveRequestHeaders(rawBody, cfg) {
  const headers = {
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
  };
  if (!cfg.apiSigningSecret) return headers;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', cfg.apiSigningSecret)
    .update(`${timestamp}${rawBody}`)
    .digest('hex');
  return { ...headers, 'Wave-Signature': `t=${timestamp},v1=${signature}` };
}

export function normalizeMobileMoneyProvider(value = '') {
  const provider = clean(value).toLowerCase();
  if (provider === 'wave') return 'wave';
  if (provider === 'orange_money' || provider === 'om' || provider === 'orange' || provider === 'orange money') {
    return 'orange_money';
  }
  return '';
}

export function makeMobileMoneyReference(provider, orderId) {
  const stamp = Date.now().toString(36).toUpperCase();
  const nonce = randomBytes(3).toString('hex').toUpperCase();
  return `${provider.toUpperCase()}-${String(orderId || 'ORD').slice(-8)}-${stamp}-${nonce}`;
}

/** Wave Checkout Session (API Business) — sandbox si pas de clé. */
export async function createWavePaymentLink({ amount, orderId, clientPhone, description, currency = 'XOF', reference = '' }) {
  const cfg = waveConfig();
  const ref = clean(reference) || makeMobileMoneyReference('WAVE', orderId);
  const sandbox = mobileMoneySandbox() || !cfg.apiKey;

  if (sandbox) {
    const base = publicAppUrl() || 'http://localhost:5173';
    return {
      ok: true,
      sandbox: true,
      provider: 'wave',
      ref,
      paymentId: `PAY-MM-${ref}`,
      paymentUrl: `${base}/#/commercial?tab=Ventes&mobile_money_sim=${ref}&provider=wave`,
      amount: Number(amount),
      currency,
      message: 'Lien Wave de test créé.',
    };
  }

  const appUrl = publicAppUrl();
  if (!appUrl) throw new Error('L’adresse de retour du paiement n’est pas configurée.');
  const payload = {
    amount: String(Math.round(Number(amount))),
    currency,
    client_reference: ref,
    description: clean(description) || `Vente ${orderId}`,
    success_url: `${appUrl}/#/commercial?tab=Ventes&mm_ok=${ref}`,
    error_url: `${appUrl}/#/commercial?tab=Ventes&mm_error=${ref}`,
  };
  if (clientPhone) payload.customer_phone = clientPhone;
  const rawBody = JSON.stringify(payload);

  const response = await fetch(`${cfg.baseUrl}/v1/checkout/sessions`, {
    method: 'POST',
    headers: waveRequestHeaders(rawBody, cfg),
    body: rawBody,
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
    externalIdKind: 'checkout_session_id',
  };
}

/** Orange Money Web Payment — sandbox si pas de clé. */
export async function createOrangeMoneyPaymentLink({ amount, orderId, clientPhone, description, currency = 'XOF', reference = '' }) {
  const cfg = orangeMoneyConfig();
  const ref = clean(reference) || makeMobileMoneyReference('OM', orderId);
  const sandbox = mobileMoneySandbox() || !cfg.apiKey;

  if (sandbox) {
    const base = publicAppUrl() || 'http://localhost:5173';
    return {
      ok: true,
      sandbox: true,
      provider: 'orange_money',
      ref,
      paymentId: `PAY-MM-${ref}`,
      paymentUrl: `${base}/#/commercial?tab=Ventes&mobile_money_sim=${ref}&provider=orange_money`,
      amount: Number(amount),
      currency,
      message: 'Lien Orange Money de test créé.',
    };
  }

  const appUrl = publicAppUrl();
  if (!appUrl) throw new Error('L’adresse de retour du paiement n’est pas configurée.');
  const payload = {
    merchant_code: cfg.merchantCode,
    amount: Math.round(Number(amount)),
    currency,
    order_id: ref,
    reference: ref,
    description: clean(description) || `Vente ${orderId}`,
    customer_phone: clean(clientPhone),
    return_url: `${appUrl}/#/commercial?tab=Ventes&mm_ok=${ref}`,
    cancel_url: `${appUrl}/#/commercial?tab=Ventes&mm_cancel=${ref}`,
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
    externalIdKind: data.transaction_id ? 'transaction_id' : 'payment_token',
  };
}

export async function createProviderPaymentLink(input = {}) {
  const provider = normalizeMobileMoneyProvider(input.provider);
  if (provider === 'wave') return createWavePaymentLink(input);
  if (provider === 'orange_money') {
    return createOrangeMoneyPaymentLink(input);
  }
  throw new Error('Choisissez Wave ou Orange Money.');
}
