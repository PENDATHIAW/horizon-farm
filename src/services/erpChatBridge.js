const MODULE_TO_TABLE = {
  animaux: 'animaux',
  avicole: 'avicole',
  sante: 'sante',
  stock: 'stock',
  cultures: 'cultures',
  equipements: 'equipements',
  taches: 'taches',
  alertes: 'alertes_center',
  clients: 'clients',
  ventes: 'sales_orders',
  finances: 'finances',
  comptabilite: 'invoices',
  fournisseurs: 'fournisseurs',
  investissements: 'investissements',
  documents: 'documents',
  rapports: 'rapports',
  smartfarm: 'sensor_devices',
  tracabilite: 'tracabilite',
  rh: 'profiles',
  audit: 'audit_logs',
};

const MODULE_PATTERNS = [
  ['equipements', /(equipement|équipement|materiel|matériel|tracteur|panne|maintenance|machine|outil|repair|equipment)/i],
  ['taches', /(tache|tâche|task|retard|echeance|échéance|todo|assign|devoir|crée une tâche|creer une tache|create a task|defal.*liggéey|defal.*liggeey)/i],
  ['alertes', /(alerte|alert|rappel|reminder|notification|urgence|fattali|fàttali|crée une alerte|creer une alerte|create an alert|defal.*alert)/i],
  ['clients', /(client|customer|creance|créance|doit|dette client)/i],
  ['ventes', /(vente|vendu|commande|livraison|facture|sale|order|delivery|invoice|jaay)/i],
  ['finances', /(finance|paiement|depense|dépense|revenu|montant|transaction|payment|expense|income)/i],
  ['fournisseurs', /(fournisseur|supplier|achat|dette fournisseur|provider)/i],
  ['cultures', /(culture|champ|parcelle|recolte|récolte|semis|rendement|crop|field)/i],
  ['sante', /(sante|santé|vaccin|malade|traitement|veterinaire|vétérinaire|health|feebar)/i],
  ['animaux', /(animal|animaux|betail|bétail|mouton|vache|ovin|bovin|animal)/i],
  ['avicole', /(avicole|poule|poulet|ganaar|oeuf|œuf|egg|ponte|mortalite|mortalité|lot)/i],
  ['stock', /(stock|inventaire|quantite|quantité|rupture|aliment|maïs|mais|mboq|intrant)/i],
  ['documents', /(document|fichier|piece|pièce|preuve|paper|file)/i],
  ['rapports', /(rapport|report|synthese|synthèse|export|bilan)/i],
  ['smartfarm', /(capteur|sensor|camera|caméra|meteo|météo|iot|smartfarm)/i],
  ['tracabilite', /(tracabilite|traçabilité|trace|historique|operation|opération)/i],
  ['rh', /(rh|employe|employé|ouvrier|equipe|équipe|role|rôle|user|utilisateur)/i],
  ['audit', /(audit|log|journal|sync|synchronisation|erreur systeme)/i],
];

const ACTION_PATTERNS = [
  ['create_alert', /(crée|cree|créer|creer|ajoute|ajouter|mettre|mets|create|add|defal|fais).*?(alerte|alert|rappel|reminder|notification|fattali|fàttali)/i],
  ['create_task', /(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(tache|tâche|task|mission|travail|liggéey|liggeey)/i],
];

function getNoDataText(language, module) {
  if (language === 'wo') return `Amul donnée bu leer ci module ${module} léegi.`;
  if (language === 'en') return `I did not find matching ERP data in the ${module} module yet.`;
  return `Je n’ai pas trouvé de donnée ERP correspondante dans le module ${module} pour l’instant.`;
}

function summarizeRows(language, module, rows = []) {
  const count = rows.length;
  const preview = rows.slice(0, 3).map((row, index) => {
    const label = row.nom || row.name || row.title || row.label || row.designation || row.reference || row.email || row.id || `élément ${index + 1}`;
    const status = row.status || row.statut || row.priority || row.priorite || row.health_status || '';
    const amount = row.quantite || row.quantity || row.montant || row.total || row.amount || '';
    return [label, status, amount].filter(Boolean).join(' — ');
  });

  if (language === 'wo') return `Ci ERP bi, gis naa ${count} résultat ci module ${module}. ${preview.length ? `Yu njëkk yi: ${preview.join(' ; ')}.` : ''}`;
  if (language === 'en') return `I found ${count} matching ERP record(s) in the ${module} module. ${preview.length ? `First results: ${preview.join(' ; ')}.` : ''}`;
  return `J’ai trouvé ${count} donnée(s) ERP dans le module ${module}. ${preview.length ? `Premiers résultats : ${preview.join(' ; ')}.` : ''}`;
}

function cleanActionTitle(text = '') {
  return String(text)
    .replace(/^(stp|svp|s'il te plait|s’il te plaît|please|ngir yalla)[, ]*/i, '')
    .replace(/^(crée|cree|créer|creer|ajoute|ajouter|mettre|mets|create|add|defal|fais)\s+(une?|an?)?\s*/i, '')
    .replace(/^(tache|tâche|task|alerte|alert|rappel|reminder|notification)\s*(pour|sur|de|to|for)?\s*/i, '')
    .trim();
}

function inferPriority(text = '') {
  if (/(urgent|critique|critical|urgence|immédiat|immediat|leegi|léegi)/i.test(text)) return 'haute';
  if (/(faible|low|pas urgent)/i.test(text)) return 'basse';
  return 'normale';
}

function inferDueDate(text = '') {
  const now = new Date();
  if (/(demain|tomorrow|suba)/i.test(text)) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  }
  if (/(aujourd'hui|aujourdhui|today|tey)/i.test(text)) return now.toISOString().slice(0, 10);
  return null;
}

function inferAction(text = '') {
  const match = ACTION_PATTERNS.find(([, pattern]) => pattern.test(text));
  return match?.[0] || '';
}

function buildActionArgs(text = '', action = '') {
  const cleaned = cleanActionTitle(text) || (action === 'create_alert' ? 'Alerte créée depuis Horizon Chat' : 'Tâche créée depuis Horizon Chat');
  return {
    title: cleaned.length > 120 ? cleaned.slice(0, 117) + '...' : cleaned,
    description: text,
    message: text,
    priority: inferPriority(text),
    due_date: inferDueDate(text),
  };
}

export function inferErpModule(text = '') {
  const match = MODULE_PATTERNS.find(([, pattern]) => pattern.test(text));
  return match?.[0] || '';
}

export async function askErpFromChat({ text = '', language = 'fr', role = 'visiteur', actor = {} } = {}) {
  const action = inferAction(text);
  if (action) {
    const response = await fetch('/api/erp-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role, language, actor, args: buildActionArgs(text, action) }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 403) return { side: 'assistant', language, text: data.message || 'Action non autorisée.', displayMode: 'text', erp: { action, accessDenied: true } };
    if (!response.ok) throw new Error(data.error || 'Action ERP indisponible.');
    return {
      side: 'assistant',
      language,
      text: data.message || (data.created ? 'Action créée dans l’ERP.' : 'Action non créée.'),
      displayMode: 'text',
      erp: { action, module: data.module, created: data.created, duplicate: data.duplicate },
    };
  }

  const module = inferErpModule(text);
  if (!module) return null;
  const table = MODULE_TO_TABLE[module];
  if (!table) return null;

  const response = await fetch('/api/erp-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, role, language, search: text, limit: 50 }),
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 403) return { side: 'assistant', language, text: data.message || getNoDataText(language, module), displayMode: 'text', erp: { module, table, accessDenied: true } };
  if (!response.ok) throw new Error(data.error || 'Lecture ERP indisponible.');

  const rows = Array.isArray(data.rows) ? data.rows : [];
  return {
    side: 'assistant',
    language,
    text: rows.length ? summarizeRows(language, module, rows) : getNoDataText(language, module),
    displayMode: 'text',
    erp: { module, table, count: rows.length },
  };
}
