function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export function hasSupabase() {
  const { url, key } = config();
  return Boolean(url && key);
}

export async function db(table, options = {}) {
  if (!hasSupabase()) throw new Error('Variables Supabase serveur manquantes.');
  const { url, key } = config();
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
    Prefer: options.prefer || 'return=representation',
    Authorization: `Bearer ${key}`,
  };
  const response = await fetch(`${url}/rest/v1/${table}${options.query || ''}`, {
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

export async function rpc(functionName, body = {}) {
  if (!hasSupabase()) throw new Error('Variables Supabase serveur manquantes.');
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Database request failed: ${response.status}`);
  }
  return data;
}
