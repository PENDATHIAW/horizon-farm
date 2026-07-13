import { createProviderPaymentLink } from './providers.js';
import { saveRequest } from './requestStore.js';
import { db, hasSupabase } from './db.js';

const clean = (v) => String(v || '').trim();

export async function handleCreateLink(body = {}) {
  const orderId = clean(body.order_id || body.orderId || body.sale_id);
  const amount = Number(body.amount || body.montant || 0);
  const provider = clean(body.provider || body.moyen_paiement || 'wave');
  const clientPhone = clean(body.client_phone || body.phone || body.telephone);
  const clientId = clean(body.client_id);
  const description = clean(body.description) || `Encaissement vente ${orderId}`;

  if (!orderId) throw new Error('order_id obligatoire.');
  if (amount <= 0) throw new Error('Montant invalide.');

  const link = await createProviderPaymentLink({
    provider,
    amount,
    orderId,
    clientPhone,
    description,
    currency: body.currency || 'XOF',
  });

  saveRequest(link.ref, {
    order_id: orderId,
    client_id: clientId,
    amount,
    provider: link.provider,
    payment_id: link.paymentId,
    payment_url: link.paymentUrl,
    sandbox: link.sandbox,
    external_id: link.externalId || '',
  });

  if (hasSupabase()) {
    try {
      const notes = JSON.stringify({
        mobile_money_status: 'pending',
        mobile_money_provider: link.provider,
        mobile_money_ref: link.ref,
        payment_link_url: link.paymentUrl,
        sandbox: link.sandbox,
      });
      await db('payments', {
        method: 'POST',
        body: {
          id: link.paymentId,
          order_id: orderId,
          date_paiement: new Date().toISOString().slice(0, 10),
          montant: amount,
          moyen_paiement: link.provider,
          reference: link.ref,
          notes,
        },
      });
    } catch (err) {
      console.warn('mobile-money create-link supabase', err?.message);
    }
  }

  return link;
}
