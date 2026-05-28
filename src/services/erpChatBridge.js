const MAP = {
  equipements: 'equipment', taches: 'tasks', alertes: 'alertes_center', clients: 'clients', creances: 'client_receivables',
  ventes: 'sales_orders', finances: 'transactions', paiements: 'payments', factures: 'invoices', fournisseurs: 'fournisseurs',
  cultures: 'cultures', sante: 'animal_health_records', animaux: 'animals', avicole: 'lots', oeufs: 'production_oeufs_logs',
  alimentation: 'alimentation_logs', stock: 'stocks', documents: 'documents', rapports: 'reports', capteurs: 'sensor_devices',
  smartfarm: 'sensor_readings', comptabilite: 'accounting_entries', business_plan: 'business_plans', audit: 'audit_logs'
};

const ROUTES = [
  ['equipements', /equip|équip|materiel|matériel|tracteur|panne|maintenance|machine/i],
  ['taches', /tache|tâche|task|mission|travail|liggéey|retard/i],
  ['alertes', /alerte|alert|rappel|notification|urgence/i],
  ['creances', /creance|créance|reste.?a.?payer|impay|dette client/i],
  ['clients', /client|customer|acheteur/i],
  ['paiements', /paiement|payment|payé|paye/i],
  ['factures', /facture|invoice/i],
  ['ventes', /vente|commande|livraison|sale|order|jaay/i],
  ['finances', /finance|transaction|depense|dépense|revenu|montant/i],
  ['fournisseurs', /fournisseur|supplier|achat/i],
  ['cultures', /culture|champ|parcelle|recolte|récolte|semis|rendement/i],
  ['sante', /sante|santé|vaccin|malade|traitement|diagnostic|symptome|symptôme/i],
  ['animaux', /animal|animaux|mouton|vache|bovin|ovin|poids|gestation/i],
  ['oeufs', /oeuf|œuf|egg|ponte|production/i],
  ['alimentation', /aliment|alimentation|feed|provende/i],
  ['avicole', /avicole|poule|poulet|ganaar|lot|mortalite|mortalité/i],
  ['stock', /stock|inventaire|rupture|maïs|mais|mboq|intrant/i],
  ['documents', /document|fichier|preuve|file|pdf/i],
  ['rapports', /rapport|report|bilan|synthese|synthèse/i],
  ['smartfarm', /capteur|sensor|mesure|temperature|humidité|meteo|météo/i],
  ['comptabilite', /compta|comptabilite|comptabilité|journal|debit|débit|credit|crédit/i],
  ['business_plan', /business.?plan|prévision|prevision|projection|investissement|roi/i],
  ['audit', /audit|log|historique action|security/i]
];

function actionOf(text = '') {
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(alerte|alert|rappel|notification)/i.test(text)) return 'create_alert';
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(tache|tâche|task|mission|travail|liggéey)/i.test(text)) return 'create_task';
  return '';
}

function moduleOf(text = '') {
  return ROUTES.find(([, rx]) => rx.test(text))?.[0] || '';
}

function titleOf(text = '', action = '') {
  return String(text).replace(/^(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais)\s*/i, '').trim() || (action === 'create_alert' ? 'Alerte Horizon Chat' : 'Tâche Horizon Chat');
}

function summarize(language, module, rows = []) {
  if (!rows.length) {
    if (language === 'en') return `I did not find matching ERP data in ${module}.`;
    if (language === 'wo') return `Amul donnée bu leer ci ${module} léegi.`;
    return `Je n’ai pas trouvé de donnée ERP correspondante dans ${module}.`;
  }
  const preview = rows.slice(0, 3).map((r, i) => [
    r.title || r.description || r.nom || r.name || r.produit || r.product_name || r.reference || r.numero_facture || r.id || `élément ${i + 1}`,
    r.status || r.statut || r.severity || r.priority || r.health_status || r.payment_status || '',
    r.montant || r.montant_total || r.total_amount || r.remaining_amount || r.quantite || r.quantity || r.oeufs_produits || '',
  ].filter(Boolean).join(' — ')).join(' ; ');
  if (language === 'en') return `I found ${rows.length} ERP record(s) in ${module}. First results: ${preview}.`;
  if (language === 'wo') return `Ci ERP bi, gis naa ${rows.length} résultat ci ${module}. Yu njëkk yi: ${preview}.`;
  return `J’ai trouvé ${rows.length} donnée(s) ERP dans ${module}. Premiers résultats : ${preview}.`;
}

export async function askErpFromChat({ text = '', language = 'fr', role = 'admin', actor = {} } = {}) {
  const safeRole = ['admin', 'manager', 'employe', 'veterinaire', 'comptable'].includes(String(role).toLowerCase()) ? String(role).toLowerCase() : 'admin';
  const action = actionOf(text);
  if (action) {
    const response = await fetch('/api/erp-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role: safeRole, language, actor, args: { title: titleOf(text, action), description: text, message: text } }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data.message) throw new Error(data.error || 'Action ERP indisponible.');
    return { side: 'assistant', language, text: data.message || 'Action ERP traitée.', displayMode: 'text', erp: { action, created: data.created, duplicate: data.duplicate } };
  }
  const module = moduleOf(text);
  const table = MAP[module];
  if (!table) return null;
  const response = await fetch('/api/erp-read', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, role: safeRole, language, search: text, limit: 50 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.message) throw new Error(data.error || 'Lecture ERP indisponible.');
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return { side: 'assistant', language, text: data.message || summarize(language, module, rows), displayMode: 'text', erp: { module, table, count: rows.length } };
}
