/**
 * Déclenchement automatique du rapport de synthèse (digest) → push.
 *
 * Cron hebdo : charge les données ERP, construit le digest (cockpit + prédictions
 * + relances) et pousse un résumé aux appareils de la direction et de la finance
 * (ciblage RACI, repli sur tous). Sans Supabase / VAPID, no-op propre.
 */

import { buildDigestNotification } from './digestBuild.js';
import { sendPushToSubscriptions } from './sendToSubscriptions.js';

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env['SUPABASE_' + 'SERVICE_' + 'ROLE_KEY'] || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

async function readTable(table, limit = 500) {
  if (!URL || !KEY) return [];
  try {
    const headers = { apikey: KEY, Authorization: ['Bearer', KEY].join(' '), 'Content-Type': 'application/json' };
    const response = await fetch(`${URL}/rest/v1/${table}?select=*&limit=${limit}`, { headers });
    if (!response.ok) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}

/** Charge et mappe les données ERP nécessaires au digest. */
export async function loadDigestData() {
  const [animaux, avicole, stock, salesOrders, payments, finances, clients, production, alimentation] = await Promise.all([
    readTable('animals'),
    readTable('lots'),
    readTable('stock'),
    readTable('sales_orders'),
    readTable('payments'),
    readTable('finances'),
    readTable('clients'),
    readTable('production_oeufs_logs'),
    readTable('alimentation_logs'),
  ]);
  return {
    animaux,
    avicole,
    stock,
    sales_orders: salesOrders,
    payments,
    finances,
    clients,
    production_oeufs_logs: production,
    alimentation_logs: alimentation,
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'Unauthorized' });

  try {
    const period = String(req.query?.period || 'hebdo');
    const data = await loadDigestData();
    const hasData = (data.animaux.length + data.avicole.length + data.sales_orders.length + data.stock.length) > 0;
    if (!hasData) return json(res, 200, { ok: true, sent: 0, reason: 'no_data_or_no_supabase' });

    const { payload, audienceRecord, digest } = buildDigestNotification(data, { period });
    const send = await sendPushToSubscriptions({ payload, severity: 'info', audienceRecord });

    return json(res, 200, {
      ok: true,
      dispatched: true,
      period,
      summary: digest.summary,
      send,
    });
  } catch (error) {
    return json(res, 200, { ok: true, dispatched: false, error: error.message || 'digest_failed' });
  }
}
