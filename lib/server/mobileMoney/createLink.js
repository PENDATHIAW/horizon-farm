import { MobileMoneyRequestError, requireAccessibleOrder } from './auth.js';
import { db, hasSupabase } from './db.js';
import { createProviderPaymentLink, makeMobileMoneyReference, normalizeMobileMoneyProvider } from './providers.js';

const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();
const INACTIVE_PAYMENT_STATUSES = new Set([
  'pending', 'failed', 'cancelled', 'canceled', 'annule', 'annulé',
  'rejete', 'rejeté', 'refunded', 'rembourse', 'remboursé',
]);

function publicIntent(intent = {}) {
  return {
    ok: true,
    sandbox: Boolean(intent.sandbox),
    provider: intent.provider,
    ref: intent.provider_ref,
    paymentId: intent.payment_id,
    paymentUrl: intent.payment_url,
    amount: Number(intent.amount || 0),
    currency: intent.currency || 'XOF',
    reused: true,
    message: 'Un lien est déjà en attente pour cette vente.',
  };
}

async function findOpenIntent({ farmId, orderId }) {
  const query = `?farm_id=eq.${encodeURIComponent(farmId)}`
    + `&order_id=eq.${encodeURIComponent(orderId)}`
    + '&status=in.(created,pending)'
    + '&is_deleted=eq.false&order=created_at.desc&limit=1&select=*';
  const rows = await db('payment_intents', { query });
  const intent = Array.isArray(rows) ? rows[0] : null;
  if (!intent) return null;
  if (intent.expires_at && new Date(intent.expires_at).getTime() <= Date.now()) {
    await db('payment_intents', {
      method: 'PATCH',
      query: `?id=eq.${encodeURIComponent(intent.id)}`,
      body: { status: 'expired', updated_at: new Date().toISOString() },
    });
    return null;
  }
  return intent;
}

function reuseOrRejectOpenIntent(intent, { provider, amount }) {
  if (!intent) return null;
  const sameRequest = intent.provider === provider && Number(intent.amount || 0) === Number(amount);
  if (sameRequest && intent.status === 'pending' && intent.payment_url) return publicIntent(intent);
  throw new MobileMoneyRequestError(
    'Un lien de paiement est déjà en attente pour cette vente.',
    409,
    'payment_link_pending',
  );
}

async function confirmedPaidAmount(order = {}) {
  const query = `?farm_id=eq.${encodeURIComponent(order.farm_id)}`
    + `&order_id=eq.${encodeURIComponent(order.id)}`
    + '&is_deleted=eq.false&select=montant,montant_paye,amount,status,statut';
  const rows = await db('payments', { query });
  const total = (Array.isArray(rows) ? rows : [])
    .filter((payment) => !INACTIVE_PAYMENT_STATUSES.has(lower(payment.status || payment.statut || 'confirmed')))
    .reduce((sum, payment) => sum + Number(payment.montant_paye ?? payment.montant ?? payment.amount ?? 0), 0);
  return Math.max(Number(order.montant_paye || 0), total);
}

export async function handleCreateLink(body = {}, context = {}) {
  const orderId = clean(body.order_id || body.orderId || body.sale_id);
  const amount = Math.round(Number(body.amount || body.montant || 0));
  const provider = normalizeMobileMoneyProvider(body.provider || body.moyen_paiement || 'wave');
  const clientPhone = clean(body.client_phone || body.phone || body.telephone);
  const description = clean(body.description) || `Encaissement vente ${orderId}`;

  if (!orderId) throw new MobileMoneyRequestError('Choisissez une vente avant de continuer.');
  if (amount <= 0) throw new MobileMoneyRequestError('Saisissez un montant supérieur à zéro.');
  if (!provider) throw new MobileMoneyRequestError('Choisissez Wave ou Orange Money.');
  if (!hasSupabase()) {
    throw new MobileMoneyRequestError('Le paiement mobile n’est pas disponible pour le moment.', 503, 'service_unavailable');
  }

  const order = await requireAccessibleOrder(context.supabase, orderId);
  const orderStatus = clean(order.statut_commande).toLowerCase();
  if (['annule', 'annulée', 'annulee'].includes(orderStatus)) {
    throw new MobileMoneyRequestError('Cette vente est annulée et ne peut pas être encaissée.');
  }
  const total = Number(order.montant_total || 0);
  const paid = await confirmedPaidAmount(order);
  const remaining = Math.max(0, total - paid);
  if (remaining <= 0) throw new MobileMoneyRequestError('Cette vente est déjà entièrement payée.');
  if (amount > remaining + 0.5) {
    throw new MobileMoneyRequestError('Le montant dépasse le reste à payer.');
  }

  const openIntent = await findOpenIntent({
    farmId: order.farm_id,
    orderId,
  });
  const reusable = reuseOrRejectOpenIntent(openIntent, { provider, amount });
  if (reusable) return reusable;

  const now = new Date();
  const providerRef = makeMobileMoneyReference(provider === 'wave' ? 'WAVE' : 'OM', orderId);
  const paymentId = `PAY-MM-${providerRef}`;
  try {
    await db('payment_intents', {
      method: 'POST',
      body: {
        id: paymentId,
        farm_id: order.farm_id,
        order_id: orderId,
        client_id: clean(order.client_id),
        provider,
        provider_ref: providerRef,
        amount,
        currency: body.currency || 'XOF',
        status: 'created',
        payment_id: paymentId,
        client_phone: clientPhone,
        sandbox: false,
        provider_payload: { request_saved: true },
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        created_by: context.user?.id || null,
      },
    });
  } catch (error) {
    const concurrentIntent = await findOpenIntent({ farmId: order.farm_id, orderId }).catch(() => null);
    if (concurrentIntent) return reuseOrRejectOpenIntent(concurrentIntent, { provider, amount });
    throw error;
  }

  let link;
  try {
    link = await createProviderPaymentLink({
      provider,
      amount,
      orderId,
      clientPhone,
      description,
      currency: body.currency || 'XOF',
      reference: providerRef,
    });
  } catch (error) {
    await db('payment_intents', {
      method: 'PATCH',
      query: `?id=eq.${encodeURIComponent(paymentId)}`,
      body: {
        status: 'failed',
        failed_at: new Date().toISOString(),
        provider_payload: { link_created: false },
        updated_at: new Date().toISOString(),
      },
    }).catch(() => {});
    throw error;
  }

  await db('payment_intents', {
    method: 'PATCH',
    query: `?id=eq.${encodeURIComponent(paymentId)}`,
    body: {
      provider_ref: link.ref,
      external_id: link.externalId || '',
      status: 'pending',
      payment_url: link.paymentUrl,
      sandbox: Boolean(link.sandbox),
      provider_payload: {
        link_created: true,
        external_id_kind: link.externalIdKind || '',
      },
      updated_at: new Date().toISOString(),
    },
  });

  return link;
}
