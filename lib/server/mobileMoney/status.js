import { MobileMoneyRequestError, requireAccessibleOrder } from './auth.js';
import { db, hasSupabase, rpc } from './db.js';
import { orangeMoneyConfig, waveConfig } from './config.js';
import { verifySharedWebhookSecret, verifyWaveWebhookSignature } from './webhookSecurity.js';

const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();

export function extractMobileMoneyReference(body = {}) {
  return clean(
    body.client_reference
    || body.reference
    || body.order_id
    || body.data?.client_reference
    || body.data?.reference
    || body.data?.order_id,
  );
}

export function classifyMobileMoneyStatus(body = {}) {
  const statuses = [
    body.status,
    body.payment_status,
    body.checkout_status,
    body.data?.status,
    body.data?.payment_status,
    body.data?.checkout_status,
  ].map(lower).filter(Boolean);
  const eventType = lower(body.type || body.event_type);
  const failed = /(^|[._\s-])(failed|failure|cancelled|canceled|expired|rejected|declined|unpaid)([._\s-]|$)/;
  const completed = /(^|[._\s-])(completed|complete|success|successful|paid|succeeded)([._\s-]|$)/;

  if (statuses.some((value) => failed.test(value))) return 'failed';
  if (statuses.some((value) => completed.test(value))) return 'completed';
  if (failed.test(eventType)) return 'failed';
  if (completed.test(eventType)) return 'completed';
  return 'pending';
}

export async function findPaymentIntentByRef(ref) {
  const key = clean(ref);
  if (!key || !hasSupabase()) return null;
  const query = `?provider_ref=eq.${encodeURIComponent(key)}&is_deleted=eq.false&limit=1&select=*`;
  const rows = await db('payment_intents', { query });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function requireIntent(ref) {
  const intent = await findPaymentIntentByRef(ref);
  if (!intent) throw new MobileMoneyRequestError('Ce paiement est introuvable.', 404, 'payment_not_found');
  return intent;
}

async function assertIntentAccess(intent, supabase) {
  const order = await requireAccessibleOrder(supabase, intent.order_id);
  if (String(order.farm_id || '') !== String(intent.farm_id || '')) {
    throw new MobileMoneyRequestError('Ce paiement n’est pas accessible.', 403, 'payment_forbidden');
  }
  return order;
}

function toPublicResult(intent = {}) {
  const posted = intent.status === 'posted';
  return {
    ok: true,
    ref: intent.provider_ref,
    status: posted ? 'completed' : (intent.status === 'failed' ? 'failed' : 'pending'),
    order_id: intent.order_id,
    amount: Number(intent.amount || 0),
    provider: intent.provider,
    payment_id: posted ? intent.payment_id : '',
    payment_url: intent.payment_url || '',
    sandbox: Boolean(intent.sandbox),
    confirmed_at: intent.confirmed_at || null,
  };
}

async function finalizePaymentIntent(intent, providerPayload = {}, { signatureVerified = false } = {}) {
  let result;
  try {
    result = await rpc('finalize_mobile_money_payment', {
      p_provider_ref: intent.provider_ref,
      p_provider_payload: providerPayload,
      p_signature_verified: signatureVerified,
    });
  } catch (error) {
    await rpc('record_workflow_failure', {
      p_farm_id: intent.farm_id,
      p_workflow_type: 'customer_payment',
      p_idempotency_key: `mobile_money:${intent.provider_ref}`,
      p_payload: {
        payment_intent_id: intent.id,
        provider: intent.provider,
        provider_ref: intent.provider_ref,
        order_id: intent.order_id,
        amount: Number(intent.amount || 0),
        signature_verified: signatureVerified,
      },
      p_actor_id: intent.created_by || null,
      p_source: signatureVerified ? 'provider_webhook' : 'test_confirmation',
      p_error_code: 'payment_confirmation_failed',
      p_error_message: clean(error?.message || 'payment confirmation failed').slice(0, 1000),
    }).catch(() => {});
    throw error;
  }
  return {
    ...toPublicResult({
      ...intent,
      status: 'posted',
      confirmed_at: result?.confirmed_at || intent.confirmed_at || new Date().toISOString(),
      payment_id: result?.payment_id || intent.payment_id,
    }),
    already_posted: Boolean(result?.already_posted),
    operation_id: result?.workflow_run_id || '',
    transaction_id: result?.transaction_id || '',
    treasury_movement_id: result?.treasury_movement_id || '',
  };
}

export async function handlePaymentStatus(ref, context = {}) {
  const key = clean(ref);
  if (!key) throw new MobileMoneyRequestError('La référence du paiement est manquante.');
  const intent = await requireIntent(key);
  await assertIntentAccess(intent, context.supabase);
  return toPublicResult(intent);
}

export async function handleSimulateConfirm(ref, context = {}) {
  const key = clean(ref);
  if (!key) throw new MobileMoneyRequestError('La référence du paiement est manquante.');
  const intent = await requireIntent(key);
  await assertIntentAccess(intent, context.supabase);
  if (!intent.sandbox) {
    throw new MobileMoneyRequestError('Ce paiement doit être confirmé par Wave ou Orange Money.', 403, 'provider_confirmation_required');
  }
  return finalizePaymentIntent(intent, {
    source: 'test_confirmation',
    confirmed_by: context.user?.id || null,
    confirmed_at: new Date().toISOString(),
  });
}

function verifyProviderRequest(intent, rawBody, headers) {
  if (intent.provider === 'wave') {
    const signature = headers['wave-signature'] || headers['Wave-Signature'] || '';
    return verifyWaveWebhookSignature({
      rawBody,
      signature,
      secret: waveConfig().webhookSecret,
    });
  }
  if (intent.provider === 'orange_money') {
    return verifySharedWebhookSecret(headers, orangeMoneyConfig().webhookSecret);
  }
  return false;
}

export function assertProviderPayloadMatchesIntent(intent, body = {}) {
  const providerAmount = Number(body.amount ?? body.data?.amount);
  if (Number.isFinite(providerAmount) && Math.abs(providerAmount - Number(intent.amount || 0)) > 0.5) {
    throw new MobileMoneyRequestError('Le montant confirmé ne correspond pas au paiement attendu.', 409, 'payment_amount_mismatch');
  }

  const providerCurrency = clean(body.currency || body.data?.currency);
  if (providerCurrency && providerCurrency.toUpperCase() !== clean(intent.currency || 'XOF').toUpperCase()) {
    throw new MobileMoneyRequestError('La devise confirmée ne correspond pas au paiement attendu.', 409, 'payment_currency_mismatch');
  }

  const externalIdKind = clean(intent.provider_payload?.external_id_kind);
  const providerExternalId = intent.provider === 'wave'
    ? clean(body.data?.id || body.checkout_session_id)
    : clean(externalIdKind === 'payment_token'
      ? (body.payment_token || body.data?.payment_token)
      : (body.transaction_id || body.data?.transaction_id));
  if (intent.external_id && providerExternalId && clean(intent.external_id) !== providerExternalId) {
    throw new MobileMoneyRequestError('Cette confirmation ne correspond pas au lien attendu.', 409, 'payment_link_mismatch');
  }
}

export async function handleWebhook(body = {}, headers = {}, rawBody = '') {
  const ref = extractMobileMoneyReference(body);
  if (!ref) throw new MobileMoneyRequestError('La référence du paiement est manquante.');

  const intent = await requireIntent(ref);
  if (!verifyProviderRequest(intent, rawBody, headers)) {
    throw new MobileMoneyRequestError('Confirmation refusée.', 401, 'invalid_confirmation');
  }

  const nextStatus = classifyMobileMoneyStatus(body);
  if (nextStatus === 'completed') {
    assertProviderPayloadMatchesIntent(intent, body);
    return finalizePaymentIntent(intent, body, { signatureVerified: true });
  }

  if (nextStatus === 'failed' && intent.status !== 'posted') {
    await db('payment_intents', {
      method: 'PATCH',
      query: `?id=eq.${encodeURIComponent(intent.id)}`,
      body: {
        status: 'failed',
        failed_at: new Date().toISOString(),
        provider_payload: body,
        signature_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    return { ...toPublicResult({ ...intent, status: 'failed' }), accepted: true };
  }

  await db('payment_intents', {
    method: 'PATCH',
    query: `?id=eq.${encodeURIComponent(intent.id)}`,
    body: {
      provider_payload: body,
      signature_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  return { ...toPublicResult(intent), accepted: true };
}
