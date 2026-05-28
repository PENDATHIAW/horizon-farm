function inferAction(text = '') {
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(alerte|alert|rappel|reminder|notification|fattali|fàttali)/i.test(text)) return 'create_alert';
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(tache|tâche|task|mission|travail|liggéey|liggeey)/i.test(text)) return 'create_task';
  return '';
}

const MODULE_TO_TABLE = {
  equipements: 'equipements', taches: 'taches', alertes: 'alertes_center', clients: 'clients', ventes: 'sales_orders', finances: 'finances',
  fournisseurs: 'fournisseurs', cultures: 'cultures', sante: 'sante', animaux: 'animaux', avicole: 'avicole', stock: 'stock', documents: 'documents', rapports: 'rapports'
};

function inferModule(text = '') {
  const entries = [
    ['equipements', /equip|équip|materiel|matériel|tracteur|panne|maintenance/i], ['taches', /tache|tâche|task|retard/i], ['alertes', /alerte|alert|rappel/i],
    ['clients', /client|customer|creance|créance/i], ['ventes', /vente|commande|facture|sale|order|invoice/i], ['finances', /finance|paiement|depense|revenu/i],
    ['fournisseurs', /fournisseur|supplier|achat/i], ['cultures', /culture|champ|parcelle|recolte|récolte/i], ['sante', /sante|santé|vaccin|malade|feebar/i],
    ['animaux', /animal|animaux|mouton|vache/i], ['avicole', /avicole|poule|ganaar|oeuf|œuf|egg|lot/i], ['stock', /stock|inventaire|aliment|maïs|mais|mboq/i],
    ['documents', /document|fichier|preuve/i], ['rapports', /rapport|report|bilan/i]
  ];
  return entries.find(([, rx]) => rx.test(text))?.[0] || '';
}

function cleanTitle(text = '', action = '') {
  return String(text).replace(/^(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais)\s*/i, '').trim() || (action === 'create_alert' ? 'Alerte Horizon Chat' : 'Tâche Horizon Chat');
}

function summarize(language, module, rows = []) {
  if (!rows.length) {
    if (language === 'wo') return `Amul donnée bu leer ci module ${module} léegi.`;
    if (language === 'en') return `I did not find matching ERP data in the ${module} module yet.`;
    return `Je n’ai pas trouvé de donnée ERP correspondante dans le module ${module} pour l’instant.`;
  }
  const preview = rows.slice(0, 3).map((r, i) => [r.title || r.nom || r.name || r.reference || r.email || r.id || `élément ${i + 1}`, r.status || r.statut || r.priority || r.priorite || '', r.total || r.montant || r.quantite || ''].filter(Boolean).join(' — ')).join(' ; ');
  if (language === 'wo') return `Ci ERP bi, gis naa ${rows.length} résultat ci module ${module}. Yu njëkk yi: ${preview}.`;
  if (language === 'en') return `I found ${rows.length} ERP record(s) in ${module}. First results: ${preview}.`;
  return `J’ai trouvé ${rows.length} donnée(s) ERP dans ${module}. Premiers résultats : ${preview}.`;
}

export async function askErpFromChat({ text = '', language = 'fr', role = 'visiteur', actor = {} } = {}) {
  const action = inferAction(text);
  if (action) {
    const response = await fetch('/api/erp-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role, language, actor, args: { title: cleanTitle(text, action), description: text, message: text } }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 403) return { side: 'assistant', language, text: data.message || 'Action non autorisée.', displayMode: 'text', erp: { action, accessDenied: true } };
    if (!response.ok) throw new Error(data.error || 'Action ERP indisponible.');
    return { side: 'assistant', language, text: data.message || 'Action ERP traitée.', displayMode: 'text', erp: { action, created: data.created, duplicate: data.duplicate } };
  }

  const module = inferModule(text);
  const table = MODULE_TO_TABLE[module];
  if (!table) return null;
  const response = await fetch('/api/erp-read', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, role, language, search: text, limit: 50 }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) return { side: 'assistant', language, text: data.message || 'Accès non autorisé.', displayMode: 'text', erp: { module, accessDenied: true } };
  if (!response.ok) throw new Error(data.error || 'Lecture ERP indisponible.');
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return { side: 'assistant', language, text: summarize(language, module, rows), displayMode: 'text', erp: { module, table, count: rows.length } };
}
