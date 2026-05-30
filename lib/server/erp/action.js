const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env['SUPABASE_' + 'SERVICE_' + 'ROLE_KEY'] || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ACTIONS = {
  create_task: { table: 'tasks', module: 'taches' },
  create_alert: { table: 'alertes_center', module: 'alertes' },
};

const send = (res, status, payload) => res.status(status).json(payload);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const closed = (row = {}) => ['termine','terminee','done','closed','archive','archived','annule','cancelled'].some((s) => norm(row.status || row.statut || '').includes(s));

async function db(table, options = {}) {
  if (!URL || !KEY) throw new Error('Variables Supabase serveur manquantes dans Vercel.');
  const headers = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  headers.Authorization = ['Bearer', KEY].join(' ');
  const response = await fetch(`${URL}/rest/v1/${table}${options.query || ''}`, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Database request failed: ${response.status}`);
  return data;
}

function build(action, args = {}, actor = {}) {
  if (action === 'create_alert') return {
    title: args.title || args.titre || 'Alerte Horizon Chat',
    message: args.message || args.description || args.title || 'Alerte Horizon Chat',
    module: args.module || 'horizon_chat',
    severity: args.severity || args.priority || 'normale',
    status: args.status || 'nouvelle',
    source: 'horizon_chat',
    send_whatsapp: false,
    owner_user_id: actor.userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    title: args.title || args.titre || 'Tâche Horizon Chat',
    module_lie: args.module_lie || 'horizon_chat',
    assigned_to: args.assigned_to || null,
    due_date: args.due_date || args.date || null,
    priority: args.priority || 'normale',
    status: args.status || 'a_faire',
    checklist: args.checklist || args.description || args.message || '',
    owner_user_id: actor.userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function duplicate(table, payload) {
  const rows = await db(table, { query: '?select=*&limit=100' });
  const title = norm(payload.title || payload.message || payload.checklist || '');
  const due = payload.due_date || null;
  return rows.find((row) => {
    if (closed(row)) return false;
    const rowText = norm(row.title || row.message || row.checklist || '');
    const rowDue = row.due_date || null;
    return title && rowText && (rowText.includes(title) || title.includes(rowText)) && (!due || !rowDue || String(due) === String(rowDue));
  });
}

function message(language = 'fr', action = '', kind = 'success') {
  if (kind === 'duplicate') {
    if (language === 'en') return action === 'create_alert' ? 'A similar open alert already exists.' : 'A similar open task already exists.';
    if (language === 'wo') return action === 'create_alert' ? 'Alert bu ni mel amoon na ba pare.' : 'Liggéey bu ni mel amoon na ba pare.';
    return action === 'create_alert' ? 'Une alerte similaire existe déjà, donc je n’ai pas créé de doublon.' : 'Une tâche similaire existe déjà, donc je n’ai pas créé de doublon.';
  }
  if (language === 'en') return action === 'create_alert' ? 'The alert has been created in the ERP.' : 'The task has been created in the ERP.';
  if (language === 'wo') return action === 'create_alert' ? 'Alert bi am na, def naa ko ci ERP bi.' : 'Liggéey bi am na, def naa ko ci ERP bi.';
  return action === 'create_alert' ? 'L’alerte a été créée dans l’ERP.' : 'La tâche a été créée dans l’ERP.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Method not allowed' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || '').trim();
    const language = String(body.language || 'fr').trim();
    const config = ACTIONS[action];
    if (!config) return send(res, 400, { error: 'Unknown ERP action.', availableActions: Object.keys(ACTIONS) });
    const payload = build(action, body.args || {}, body.actor || {});
    const existing = await duplicate(config.table, payload);
    if (existing) return send(res, 200, { action, module: config.module, created: false, duplicate: true, message: message(language, action, 'duplicate'), existing });
    const rows = await db(config.table, { method: 'POST', body: [payload] });
    return send(res, 200, { action, module: config.module, created: true, duplicate: false, message: message(language, action), rows });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP action failed.' });
  }
}
