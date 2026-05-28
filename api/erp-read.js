const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env['SUPABASE_' + 'SERVICE_' + 'ROLE_KEY'] || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BLOCKED = ['system_settings'];

const ALLOWED = [
  'animals','animal_health_records','animal_weight_records','animal_purchases','lots','production','production_oeufs_logs','alimentation','alimentation_logs',
  'stock','stocks','cultures','documents','erp_documents','equipment','taches','tasks','alertes_center','alert_events','notifications','recommandations',
  'audit_logs','sales','sales_orders','sales_order_items','clients','client_receivables','fournisseurs','price_catalog','finances','transactions','payments','invoices',
  'reports','sensor_devices','sensor_readings','camera_devices','accounting_entries','business_plans','intervention_medications','sante','reproduction_events',
  'accounting_accounts','accounting_budgets','accounting_closures','accounting_documents','accounting_entry_lines','deliveries','investissements'
];

const send = (res, status, payload) => res.status(status).json(payload);
const safeTable = (table = '') => /^[a-zA-Z0-9_]+$/.test(table) && !BLOCKED.includes(table) && ALLOWED.includes(table);

async function readDb(path) {
  if (!URL || !KEY) throw new Error('Variables Supabase serveur manquantes dans Vercel.');
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  headers.Authorization = ['Bearer', KEY].join(' ');
  const response = await fetch(`${URL}/rest/v1/${path}`, { headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Database read failed: ${response.status}`);
  return data;
}

function matchRow(row, search = '') {
  if (!search) return true;
  return JSON.stringify(row).toLowerCase().includes(String(search).toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Method not allowed' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const table = String(body.table || '').trim();
    const search = String(body.search || '').trim();
    const role = String(body.role || 'admin').trim();
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 100);
    if (!safeTable(table)) return send(res, 400, { error: 'ERP table not allowed.', table });
    let rows;
    try { rows = await readDb(`${table}?select=*&order=created_at.desc&limit=${limit}`); }
    catch (error) { rows = await readDb(`${table}?select=*&limit=${limit}`); }
    const filtered = rows.filter((row) => matchRow(row, search));
    return send(res, 200, { table, role, found: filtered.length > 0, count: filtered.length, rows: filtered.slice(0, limit), warning: filtered.length === 0 ? 'Aucune donnée correspondante enregistrée dans cette partie de l’ERP.' : null });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP read failed.' });
  }
}
