const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export function hasSupabase() {
  return Boolean(URL && KEY);
}

export async function db(table, options = {}) {
  if (!hasSupabase()) throw new Error('Variables Supabase serveur manquantes.');
  const headers = {
    apikey: KEY,
    'Content-Type': 'application/json',
    Prefer: options.prefer || 'return=representation',
    Authorization: `Bearer ${KEY}`,
  };
  const response = await fetch(`${URL}/rest/v1/${table}${options.query || ''}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Database request failed: ${response.status}`);
  }
  return data;
}
