const TABLE_BY_MODULE = {
  animaux: 'animaux', avicole: 'avicole', sante: 'sante', stock: 'stock', cultures: 'cultures', equipements: 'equipements',
  taches: 'taches', alertes: 'alertes_center', clients: 'clients', ventes: 'sales_orders', finances: 'finances', comptabilite: 'invoices',
  fournisseurs: 'fournisseurs', investissements: 'investissements', documents: 'documents', rapports: 'rapports', smartfarm: 'sensor_devices',
  tracabilite: 'tracabilite', rh: 'profiles', audit: 'audit_logs'
};

const READ_PATTERNS = [
  ['equipements', /equip|équip|materiel|matériel|tracteur|panne|maintenance|machine/i],
  ['taches', /tache|tâche|task|retard|echeance|échéance|assign/i],
  ['alertes', /alerte|alert|rappel|reminder|notification|urgence|fattali|fàttali/i],
  ['clients', /client|customer|creance|créance/i],
  ['ventes', /vente|vendu|commande|livraison|facture|sale|order|invoice/i],
  ['finances', /finance|paiement|depense|dépense|revenu|montant|transaction/i],
  ['fournisseurs', /fournisseur|supplier|achat/i],
  ['cultures', /culture|champ|parcelle|recolte|récolte|semis|rendement/i],
  ['sante', /sante|santé|vaccin|malade|traitement|veterinaire|vétérinaire|feebar/i],
  ['animaux', /animal|animaux|betail|bétail|mouton|vache/i],
  ['avicole', /avicole|poule|poulet|ganaar|oeuf|œuf|egg|ponte|lot/i],
  ['stock', /stock|inventaire|quantite|quantité|rupture|aliment|maïs|mais|mboq/i],
  ['documents', /document|fichier|piece|pièce|preuve/i],
  ['rapports', /rapport|report|synthese|synthèse|export|bilan/i],
  ['smartfarm', /capteur|sensor|camera|caméra|meteo|météo|iot/i],
  ['tracabilite', /tracabilite|traçabilité|trace|historique/i],
  ['rh', /rh|employe|employé|ouvrier|equipe|équipe|role|rôle/i],
  ['audit', /audit|log|journal|sync/i]
];

function send(res, status, payload) { return res.status(status).json(payload); }
function baseUrl(req) { return `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`; }
function detectAction(text = '') {
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(alerte|alert|rappel|reminder|notification|fattali|fàttali)/i.test(text)) return 'create_alert';
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(tache|tâche|task|mission|travail|liggéey|liggeey)/i.test(text)) return 'create_task';
  return '';
}
function detectModule(text = '') { return READ_PATTERNS.find(([, rx]) => rx.test(text))?.[0] || ''; }
function cleanTitle(text = '', action = '') {
  return String(text).replace(/^(stp|svp|please)[, ]*/i, '').replace(/^(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais)\s*/i, '').replace(/^(une?|an?)?\s*(tache|tâche|task|alerte|alert|rappel|reminder)\s*(pour|sur|de|to|for)?\s*/i, '').trim() || (action === 'create_alert' ? 'Alerte Horizon Chat' : 'Tâche Horizon Chat');
}
function dueDate(text = '') { const d = new Date(); if (/(demain|tomorrow|suba)/i.test(text)) { d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10); } if (/(aujourd'hui|aujourdhui|today|tey)/i.test(text)) return d.toISOString().slice(0,10); return null; }
function priority(text = '') { if (/(urgent|critique|critical|urgence|leegi|léegi)/i.test(text)) return 'haute'; if (/(faible|low|pas urgent)/i.test(text)) return 'basse'; return 'normale'; }
function noModuleText(language) {
  if (language === 'wo') return 'Laajal ma lu jëm ci ERP bi walla waxal ma module bi.';
  if (language === 'en') return 'Ask me about any ERP area, or specify the module.';
  return 'Pose-moi une question sur une partie de l’ERP, ou précise le module.';
}
function finalText(language, data, fallback) {
  if (data?.message) return data.message;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  if (rows.length) {
    const preview = rows.slice(0,3).map((r,i)=>[r.title||r.nom||r.name||r.reference||r.email||r.id||`élément ${i+1}`, r.status||r.statut||r.priority||r.priorite||'', r.total||r.montant||r.quantite||''].filter(Boolean).join(' — ')).join(' ; ');
    if (language === 'wo') return `Ci ERP bi, gis naa ${data.count || rows.length} résultat. Yu njëkk yi: ${preview}.`;
    if (language === 'en') return `I found ${data.count || rows.length} ERP record(s). First results: ${preview}.`;
    return `J’ai trouvé ${data.count || rows.length} donnée(s) ERP. Premiers résultats : ${preview}.`;
  }
  return data?.warning || fallback;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Method not allowed' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const text = String(body.text || '').trim();
    const language = body.language || 'fr';
    const role = body.role || 'visiteur';
    const actor = body.actor || {};
    if (!text) return send(res, 400, { error: 'Missing text.' });

    const action = detectAction(text);
    if (action) {
      const response = await fetch(`${baseUrl(req)}/api/erp-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, role, language, actor, args: { title: cleanTitle(text, action), description: text, message: text, priority: priority(text), due_date: dueDate(text) } }) });
      const data = await response.json().catch(() => ({}));
      return send(res, response.status, { side: 'assistant', language, text: finalText(language, data, 'Action ERP traitée.'), displayMode: 'text', erp: { mode: 'action', action, created: data.created, duplicate: data.duplicate, accessDenied: response.status === 403 }, raw: data });
    }

    const module = detectModule(text);
    const table = TABLE_BY_MODULE[module];
    if (!table) return send(res, 200, { side: 'assistant', language, text: noModuleText(language), displayMode: 'text', erp: { mode: 'none' } });

    const response = await fetch(`${baseUrl(req)}/api/erp-read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, role, language, search: text, limit: 50 }) });
    const data = await response.json().catch(() => ({}));
    const fallback = language === 'en' ? 'No matching ERP data found.' : language === 'wo' ? 'Amul donnée bu leer léegi.' : 'Aucune donnée ERP correspondante trouvée.';
    return send(res, response.status, { side: 'assistant', language, text: finalText(language, data, fallback), displayMode: 'text', erp: { mode: 'read', module, table, count: data.count, accessDenied: response.status === 403 }, raw: data });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP assistant failed.' });
  }
}
