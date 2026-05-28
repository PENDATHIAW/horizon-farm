const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const TABLES = {
  stock: 'stock',
  lots: 'avicole',
  animals: 'animaux',
  eggProduction: 'production_oeufs_logs',
  feedLogs: 'alimentation_logs',
  salesOrders: 'sales_orders',
  salesOrderItems: 'sales_order_items',
  clients: 'clients',
  tasks: 'taches',
  alerts: 'alertes_center',
};

function send(res, status, payload) {
  return res.status(status).json(payload);
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
    throw new Error('Supabase server variables are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  }

  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase request failed: ${response.status}`);
  }
  return data;
}

function contains(value = '', needle = '') {
  return String(value || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

async function verifierStock({ produit = '' } = {}) {
  const fields = 'id,nom,produit,designation,categorie,quantite,unite,seuil,updated_at';
  const rows = await supabaseRequest(`${TABLES.stock}?select=${fields}&limit=200`);
  const filtered = produit
    ? rows.filter((row) => contains(row.nom, produit) || contains(row.produit, produit) || contains(row.designation, produit) || contains(row.categorie, produit))
    : rows;

  return {
    tool: 'verifier_stock',
    produit: produit || 'tous',
    found: filtered.length > 0,
    count: filtered.length,
    rows: filtered.slice(0, 20),
    warning: filtered.length === 0 ? 'Aucun stock correspondant enregistré dans l’ERP.' : null,
  };
}

async function consulterProductionOeufs({ date_debut = '', date_fin = '' } = {}) {
  let path = `${TABLES.eggProduction}?select=*&order=created_at.desc&limit=100`;
  if (date_debut) path += `&created_at=gte.${encodeURIComponent(date_debut)}`;
  if (date_fin) path += `&created_at=lte.${encodeURIComponent(date_fin)}`;
  const rows = await supabaseRequest(path);
  const total = rows.reduce((sum, row) => sum + Number(row.quantite || row.nombre || row.total || row.oeufs || 0), 0);
  return { tool: 'consulter_production_oeufs', found: rows.length > 0, total, rows: rows.slice(0, 30), warning: rows.length === 0 ? 'Aucune production d’œufs enregistrée pour cette période.' : null };
}

async function consulterVentes({ produit = '', date_debut = '', date_fin = '' } = {}) {
  let path = `${TABLES.salesOrders}?select=*&order=created_at.desc&limit=100`;
  if (date_debut) path += `&created_at=gte.${encodeURIComponent(date_debut)}`;
  if (date_fin) path += `&created_at=lte.${encodeURIComponent(date_fin)}`;
  const rows = await supabaseRequest(path);
  const filtered = produit ? rows.filter((row) => contains(JSON.stringify(row), produit)) : rows;
  const total = filtered.reduce((sum, row) => sum + Number(row.total || row.montant || row.amount || 0), 0);
  return { tool: 'consulter_ventes', produit: produit || 'tous', found: filtered.length > 0, total, rows: filtered.slice(0, 30), warning: filtered.length === 0 ? 'Aucune vente correspondante enregistrée dans l’ERP.' : null };
}

async function consulterLotsAvicoles({ statut = '' } = {}) {
  let path = `${TABLES.lots}?select=*&order=created_at.desc&limit=100`;
  const rows = await supabaseRequest(path);
  const filtered = statut ? rows.filter((row) => contains(row.status || row.statut, statut)) : rows;
  return { tool: 'consulter_lots_avicoles', found: filtered.length > 0, count: filtered.length, rows: filtered.slice(0, 30), warning: filtered.length === 0 ? 'Aucun lot correspondant enregistré.' : null };
}

async function creerAlerte({ title = '', message = '', priority = 'normale' } = {}) {
  if (!title && !message) return { tool: 'creer_alerte', created: false, warning: 'Titre ou message d’alerte manquant.' };
  const payload = [{
    title: title || 'Alerte Horizon Chat',
    message: message || title,
    priority,
    status: 'nouvelle',
    source: 'horizon_chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }];
  const rows = await supabaseRequest(TABLES.alerts, { method: 'POST', body: JSON.stringify(payload) });
  return { tool: 'creer_alerte', created: true, rows };
}

const toolHandlers = {
  verifier_stock: verifierStock,
  consulter_production_oeufs: consulterProductionOeufs,
  consulter_ventes: consulterVentes,
  consulter_lots_avicoles: consulterLotsAvicoles,
  creer_alerte: creerAlerte,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { tool, args = {} } = body;
    if (!tool || !toolHandlers[tool]) {
      return send(res, 400, { error: 'Unknown ERP tool.', availableTools: Object.keys(toolHandlers) });
    }

    const result = await toolHandlers[tool](args);
    return send(res, 200, result);
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP tool failed.' });
  }
}
