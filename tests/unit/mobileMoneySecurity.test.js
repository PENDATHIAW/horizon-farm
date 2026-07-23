import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  verifySharedWebhookSecret,
  verifyWaveWebhookSignature,
} from '../../lib/server/mobileMoney/webhookSecurity.js';
import {
  assertProviderPayloadMatchesIntent,
  classifyMobileMoneyStatus,
  extractMobileMoneyReference,
} from '../../lib/server/mobileMoney/status.js';
import { createWavePaymentLink } from '../../lib/server/mobileMoney/providers.js';

test('une confirmation Wave valide doit correspondre au contenu exact et à la date', () => {
  const secret = 'wave-test-secret';
  const timestamp = 1_800_000_000;
  const rawBody = '{"type":"checkout.session.completed","data":{"client_reference":"WAVE-42"}}';
  const digest = createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('hex');
  const signature = `t=${timestamp},v1=${digest}`;

  assert.equal(verifyWaveWebhookSignature({ rawBody, signature, secret, nowSeconds: timestamp }), true);
  assert.equal(verifyWaveWebhookSignature({ rawBody: `${rawBody} `, signature, secret, nowSeconds: timestamp }), false);
  assert.equal(verifyWaveWebhookSignature({ rawBody, signature, secret, nowSeconds: timestamp + 301 }), false);
});

test('une confirmation ne peut pas changer le montant, la devise ou le lien', () => {
  const intent = { provider: 'wave', amount: 50000, currency: 'XOF', external_id: 'cos-123' };
  assert.doesNotThrow(() => assertProviderPayloadMatchesIntent(intent, {
    data: { amount: '50000', currency: 'XOF', id: 'cos-123' },
  }));
  assert.throws(
    () => assertProviderPayloadMatchesIntent(intent, { data: { amount: '40000' } }),
    /montant confirmé/i,
  );
  assert.throws(
    () => assertProviderPayloadMatchesIntent(intent, { data: { currency: 'EUR' } }),
    /devise confirmée/i,
  );
  assert.throws(
    () => assertProviderPayloadMatchesIntent(intent, { data: { id: 'cos-autre' } }),
    /lien attendu/i,
  );
});

test('la demande Wave utilise le format attendu et peut être signée', async () => {
  const previous = {
    apiKey: process.env.WAVE_API_KEY,
    signingSecret: process.env.WAVE_API_SIGNING_SECRET,
    appUrl: process.env.VITE_APP_URL,
    sandbox: process.env.MOBILE_MONEY_SANDBOX,
    fetch: globalThis.fetch,
  };
  let request;
  process.env.WAVE_API_KEY = 'wave-test-key';
  process.env.WAVE_API_SIGNING_SECRET = 'wave-signing-secret';
  process.env.VITE_APP_URL = 'https://horizon.example';
  process.env.MOBILE_MONEY_SANDBOX = 'false';
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ id: 'cos-123', client_reference: 'WAVE-CMD-1', wave_launch_url: 'https://pay.wave.com/test' }),
    };
  };

  try {
    const result = await createWavePaymentLink({ amount: 50000, orderId: 'CMD-1', reference: 'WAVE-CMD-1' });
    const body = JSON.parse(request.options.body);
    assert.equal(result.externalId, 'cos-123');
    assert.equal(body.amount, '50000');
    assert.equal(body.error_url, 'https://horizon.example/#/commercial?tab=Ventes&mm_error=WAVE-CMD-1');
    assert.equal('cancel_url' in body, false);
    assert.match(request.options.headers['Wave-Signature'], /^t=\d+,v1=[a-f0-9]{64}$/);
  } finally {
    if (previous.apiKey === undefined) delete process.env.WAVE_API_KEY; else process.env.WAVE_API_KEY = previous.apiKey;
    if (previous.signingSecret === undefined) delete process.env.WAVE_API_SIGNING_SECRET; else process.env.WAVE_API_SIGNING_SECRET = previous.signingSecret;
    if (previous.appUrl === undefined) delete process.env.VITE_APP_URL; else process.env.VITE_APP_URL = previous.appUrl;
    if (previous.sandbox === undefined) delete process.env.MOBILE_MONEY_SANDBOX; else process.env.MOBILE_MONEY_SANDBOX = previous.sandbox;
    globalThis.fetch = previous.fetch;
  }
});

test('le secret Orange Money est obligatoire et comparé exactement', () => {
  assert.equal(verifySharedWebhookSecret({ authorization: 'Bearer orange-secret' }, 'orange-secret'), true);
  assert.equal(verifySharedWebhookSecret({ authorization: 'Bearer autre' }, 'orange-secret'), false);
  assert.equal(verifySharedWebhookSecret({}, ''), false);
});

test('la confirmation et la référence sont lues dans le message du fournisseur', () => {
  const body = {
    type: 'checkout.session.completed',
    data: { client_reference: 'WAVE-42', payment_status: 'succeeded' },
  };
  assert.equal(extractMobileMoneyReference(body), 'WAVE-42');
  assert.equal(classifyMobileMoneyStatus(body), 'completed');
  assert.equal(classifyMobileMoneyStatus({ status: 'failed' }), 'failed');
  assert.equal(classifyMobileMoneyStatus({ status: 'unpaid' }), 'failed');
  assert.equal(classifyMobileMoneyStatus({ type: 'checkout.session.completed', data: { payment_status: 'failed' } }), 'failed');
  assert.equal(classifyMobileMoneyStatus({ status: 'processing' }), 'pending');
});
