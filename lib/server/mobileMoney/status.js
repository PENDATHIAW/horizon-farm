import { getRequest, markRequest } from './requestStore.js';
import { db, hasSupabase } from './db.js';

const clean = (v) => String(v || '').trim();

async function findPaymentByRef(ref) {
  if (!hasSupabase() || !ref) return null;
  try {
    const rows = await db('payments', { query: `?reference=eq.${encodeURIComponent(ref)}&select=*` });
    return Array.isArray(rows) ? rows[0] : null;
  } catch {
    return null;
  }
}

export async function handlePaymentStatus(ref) {
  const key = clean(ref);
  if (!key) throw new Error('ref obligatoire.');

  const mem = getRequest(key);
  const payment = await findPaymentByRef(key);

  let status = mem?.status || 'unknown';
  let notes = {};
  if (payment?.notes) {
    try { notes = JSON.parse(payment.notes); } catch { notes = {}; }
  }
  if (notes.mobile_money_status === 'completed') status = 'completed';
  if (notes.mobile_money_status === 'failed') status = 'failed';

  return {
    ok: true,
    ref: key,
    status,
    order_id: mem?.order_id || payment?.order_id || '',
    amount: mem?.amount || payment?.montant || 0,
    provider: mem?.provider || payment?.moyen_paiement || '',
    payment_id: mem?.payment_id || payment?.id || '',
    payment_url: mem?.payment_url || notes.payment_link_url || '',
    sandbox: mem?.sandbox ?? notes.sandbox ?? false,
  };
}

export async function handleSimulateConfirm(ref) {
  const key = clean(ref);
  const mem = markRequest(key, 'completed', { confirmed_at: new Date().toISOString() });
  if (!mem) throw new Error('Demande introuvable — créez le lien d’abord.');

  if (hasSupabase()) {
    const payment = await findPaymentByRef(key);
    if (payment?.id) {
      const notes = JSON.stringify({
        mobile_money_status: 'completed',
        mobile_money_provider: mem.provider,
        mobile_money_ref: key,
        payment_link_url: mem.payment_url,
        sandbox: mem.sandbox,
        confirmed_at: new Date().toISOString(),
      });
      await db('payments', {
        method: 'PATCH',
        query: `?id=eq.${encodeURIComponent(payment.id)}`,
        body: { notes, reference: key },
      });
    }
  }

  return {
    ok: true,
    ref: key,
    status: 'completed',
    order_id: mem.order_id,
    amount: mem.amount,
    provider: mem.provider,
    payment_id: mem.payment_id,
    message: 'Paiement mobile money confirmé (simulation ou webhook).',
  };
}

export async function handleWebhook(body = {}, headers = {}) {
  const ref = clean(
    body.client_reference
    || body.reference
    || body.order_id
    || body.data?.client_reference
    || body.data?.reference,
  );
  const statusRaw = clean(body.status || body.payment_status || body.data?.status).toLowerCase();
  const completed = ['completed', 'success', 'paid', 'succeeded', 'ok'].some((s) => statusRaw.includes(s));

  if (!ref) {
    return { ok: false, error: 'reference manquante dans webhook' };
  }

  if (completed) {
    await handleSimulateConfirm(ref);
    return { ok: true, ref, status: 'completed' };
  }

  markRequest(ref, 'failed', { webhook_status: statusRaw });
  return { ok: true, ref, status: 'failed' };
}
