import { createClient } from '@supabase/supabase-js';

const clean = (value = '') => String(value || '').trim();

function publicConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  };
}

export class MobileMoneyRequestError extends Error {
  constructor(message, statusCode = 400, code = 'mobile_money_error') {
    super(message);
    this.name = 'MobileMoneyRequestError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function extractBearerToken(req = {}) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  return String(header).match(/^Bearer\s+(.+)$/i)?.[1] || '';
}

export async function requireMobileMoneyUser(req = {}) {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    throw new MobileMoneyRequestError('Votre session a expiré. Reconnectez-vous pour continuer.', 401, 'session_required');
  }

  const { url, anonKey } = publicConfig();
  if (!url || !anonKey) {
    throw new MobileMoneyRequestError('Le paiement mobile n’est pas disponible pour le moment.', 503, 'service_unavailable');
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw new MobileMoneyRequestError('Votre session a expiré. Reconnectez-vous pour continuer.', 401, 'session_invalid');
  }

  return { user: data.user, supabase };
}

export async function requireAccessibleOrder(supabase, orderId) {
  const id = clean(orderId);
  if (!supabase || !id) {
    throw new MobileMoneyRequestError('La vente est introuvable.', 404, 'order_not_found');
  }

  const { data, error } = await supabase
    .from('sales_orders')
    .select('id,farm_id,client_id,montant_total,montant_paye,reste_a_payer,statut_commande,statut_paiement')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    throw new MobileMoneyRequestError('Cette vente n’est pas accessible.', 403, 'order_forbidden');
  }
  return data;
}
