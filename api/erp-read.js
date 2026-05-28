const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ALLOWED_TABLES = [
  'animaux', 'avicole', 'sante', 'veterinaires', 'stock', 'cultures', 'equipements', 'taches', 'alertes_center',
  'clients', 'sales_orders', 'sales_order_items', 'deliveries', 'invoices', 'payments', 'finances', 'fournisseurs',
  'investissements', 'business_plans', 'documents', 'rapports', 'sensor_devices', 'camera_devices', 'smartfarm_events',
  'tracabilite', 'business_events', 'profiles', 'audit_logs', 'production_oeufs_logs', 'alimentation_logs'
];

const ROLE_TABLES = {
  admin: ['*'],
  manager: ['*'],
  employe: ['animaux', 'avicole', 'sante', 'stock', 'cultures', 'documents', 'taches', 'equipements', 'alertes_center', 'audit_logs', 'production_oeufs_logs', 'alimentation_logs'],
  veterinaire: ['animaux', 'avicole', 'sante', 'veterinaires', 'tracabilite', 'alertes_center', 'documents', 'taches', 'audit_logs'],
  comptable: ['sante', 'finances', 'invoices', 'payments', 'investissements', 'business_plans', 'clients', 'sales_orders', 'sales_order_items', 'fournisseurs', 'documents', 'rapports', 'audit_logs', 'alertes_center'],
  visiteur: [],
};

function send(res, status, payload) {
  return res.status(status).json(payload);
}

function canRead(role, table) {
  const allowed = ROLE_TABLES[role] || ROLE_TABLES.visiteur;
  return allowed.includes('*') || allowed.includes(table);
}

function denyMessage(language = 'fr') {
  if (language === 'wo') return 'Mënuma jangale la donnée boobu ak sa ndigal léegi. Laajal responsable bi mu jox la accès bu gën a yaatu.';
  if (language === 'en') return 'I cannot access this ERP data with your current access level. Please ask a manager for the required permission.';
  return 'Je ne peux pas accéder à ces données ERP avec votre niveau d’accès actuel. Demandez à un responsable de vous accorder l’autorisation nécessaire.';
}

async function supabaseRead(path) {
  if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
    throw new Error('Supabase server variables are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  }
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase read failed: ${response.status}`);
  return data;
}

function rowMatches(row, search = '') {
  if (!search) return true;
  return JSON.stringify(row).toLowerCase().includes(String(search).toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const table = String(body.table || '').trim();
    const role = String(body.role || 'visiteur').trim();
    const language = String(body.language || 'fr').trim();
    const search = String(body.search || '').trim();
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 100);

    if (!ALLOWED_TABLES.includes(table)) return send(res, 400, { error: 'ERP table not allowed.', allowedTables: ALLOWED_TABLES });
    if (!canRead(role, table)) return send(res, 403, { error: 'access_denied', message: denyMessage(language), role, table });

    let rows;
    try {
      rows = await supabaseRead(`${table}?select=*&order=created_at.desc&limit=${limit}`);
    } catch (error) {
      if (!String(error.message || '').includes('created_at')) throw error;
      rows = await supabaseRead(`${table}?select=*&limit=${limit}`);
    }

    const filtered = rows.filter((row) => rowMatches(row, search));
    return send(res, 200, {
      table,
      role,
      found: filtered.length > 0,
      count: filtered.length,
      rows: filtered.slice(0, limit),
      warning: filtered.length === 0 ? 'Aucune donnée correspondante enregistrée dans cette partie de l’ERP.' : null,
    });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP read failed.' });
  }
}
