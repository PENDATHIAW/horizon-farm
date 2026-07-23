import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { areServerAutomationsEnabled } from '../automationControl.js';

const clean = (value = '') => String(value || '').trim();

function secureEqual(left, right) {
  const a = Buffer.from(clean(left));
  const b = Buffer.from(clean(right));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function bearerToken(req = {}) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  return String(header).match(/^Bearer\s+(.+)$/i)?.[1] || '';
}

export function checkCronAuthorization(req = {}) {
  if (!areServerAutomationsEnabled()) {
    return { ok: false, status: 503, error: 'Les actions automatiques sont temporairement suspendues.' };
  }
  const secret = process.env.CRON_SECRET || '';
  if (!secret) {
    return { ok: false, status: 503, error: 'Les notifications automatiques ne sont pas encore configurées.' };
  }
  if (!secureEqual(bearerToken(req), secret)) {
    return { ok: false, status: 401, error: 'Accès refusé.' };
  }
  return { ok: true, status: 200 };
}

export async function getAuthenticatedPushUser(req = {}) {
  const token = bearerToken(req);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!token || !url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data?.user || null;
}
