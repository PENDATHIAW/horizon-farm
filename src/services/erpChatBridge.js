function inferAction(text = '') {
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(alerte|alert|rappel|reminder|notification|fattali|fàttali)/i.test(text)) return 'create_alert';
  if (/(crée|cree|créer|creer|ajoute|ajouter|create|add|defal|fais).*?(tache|tâche|task|mission|travail|liggéey|liggeey)/i.test(text)) return 'create_task';
  return '';
}

const MODULE_TO_TABLE = {
  equipements: 'equipment',
  taches: 'tasks',
  anciennes_taches: 'taches',
  alertes: 'alertes_center',
  clients: 'clients',
  creances: 'client_receivables',
  ventes: 'sales_orders',
  ventes_lignes: 'sales_order_items',
  finances: 'transactions',
  transactions: 'transactions',
  paiements: 'payments',
  factures: 'invoices',
  fournisseurs: 'fournisseurs',
  cultures: 'cultures',
  sante: 'animal_health_records',
  animaux: 'animals',
  avicole: 'lots',
  oeufs: 'production_oeufs_logs',
  alimentation: 'alimentation_logs',
  stock: 'stocks',
  documents: 'documents',
  rapports: 'reports',
  smartfarm: 'sensor_readings',
  capteurs: 'sensor_devices',
  camera: 'camera_devices',
  comptabilite: 'accounting_entries',
  business_plan: 'business_plans',
  audit: 'audit_logs',
};

function inferModule(text = '') {
  const entries = [
    ['equipements', /equip|équip|materiel|matériel|tracteur|panne|maintenance|machine/i],
    ['taches', /tache|tâche|task|mission|travail|liggéey|liggeey|retard/i],
    ['alertes', /alerte|alert|rappel|notification|urgence|fattali|fàttali/i],
    ['creances', /creance|créance|reste.?a.?payer|remaining|dette client|impay/i],
    ['clients', /client|customer|acheteur/i],
    ['paiements', /paiement|payment|payé|paye|moyen.?paiement/i],
    ['factures', /facture|invoice|numero.?facture/i],
    ['ventes_lignes', /article|ligne|produit vendu|sales.?item/i],
    ['ventes', /vente|commande|livraison|sale|order|jaay/i],
    ['transactions', /transaction|mouvement financier|tresorerie|trésorerie/i],
    ['finances', /finance|depense|dépense|revenu|montant|xaalis/i],
    ['fournisseurs', /fournisseur|supplier|achat|dette fournisseur/i],
    ['cultures', /culture|champ|parcelle|recolte|récolte|semis|rendement/i],
    ['sante', /sante|santé|vaccin|malade|traitement|diagnostic|symptome|symptôme|feebar/i],
    ['animaux', /animal|animaux|mouton|vache|bovin|ovin|poids|gestation/i],
    ['oeufs', /oeuf|œuf|egg|ponte|taux.?ponte/i],
    ['alimentation', /aliment|alimentation|feed|dund|dundale|provende/i],
    ['avicole', /avicole|poule|poulet|ganaar|lot|mortalite|mortalité/i],
    ['stock', /stock|inventaire|rupture|maïs|mais|mboq|intrant/i],
    ['documents', /document|fichier|preuve|file|pdf/i],
    ['rapports', /rapport|report|bilan|synthese|synthèse/i],
    ['smartfarm', /lecture capteur|sensor.?reading|mesure|temperature|humidité|humidite|météo|meteo/i],
    ['capteurs', /capteur|sensor|iot|battery|batterie/i],
    ['camera', /camera|caméra|video|stream|snapshot/i],
    ['comptabilite', /compta|comptabilite|comptabilité|journal|debit|débit|credit|crédit|ecriture|écriture/i],
    ['business_plan', /business.?plan|prévision|prevision|projection|investissement|roi/i],
    ['audit', /audit|log|journal systeme|historique action|security/i],
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
  const preview = rows.slice(0, 3).map((r, i) => [
    r.title || r.description || r.nom || r.name || r.produit || r.product_name || r.reference || r.numero_facture || r.email || r.id || `élément ${i + 1}`,
    r.status || r.statut || r.severity || r.priority || r.priorite || r.health_status || r.payment_status || r.order_status || '',
    r.total || r.montant || r.montant_total || r.total_amount || r.remaining_amount || r.quantite || r.quantity || r.oeufs_produits || '',
  ].filter(Boolean).join(' - ')).join(' ; ');
  if (language === 'wo') return `Ci ERP bi, gis naa ${rows.length} résultat ci module ${module}. Yu njëkk yi: ${preview}.`;
  if (language === 'en') return `I found ${rows.length} ERP record(s) in ${module}. First results: ${preview}.`;
  return `J’ai trouvé ${rows.length} donnée(s) ERP dans ${module}. Premiers résultats : ${preview}.`;
}

function safeRole(role = '') {
  const value = String(role || '').toLowerCase().trim();
  if (['admin', 'manager', 'employe', 'veterinaire', 'comptable'].includes(value)) return value;
  return 'admin';
}

export async function askErpFromChat({ text = '', language = 'fr', role = 'admin', actor = {} } = {}) {
  const effectiveRole = safeRole(role);
  const action = inferAction(text);
  if (action) {
    const response = await fetch('/api/erp-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role: effectiveRole, language, actor, args: { title: cleanTitle(text, action), description: text, message: text } }),
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, role: effectiveRole, language, search: text, limit: 50 }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) return { side: 'assistant', language, text: data.message || 'Accès non autorisé.', displayMode: 'text', erp: { module, accessDenied: true } };
  if (!response.ok) throw new Error(data.error || 'Lecture ERP indisponible.');
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return { side: 'assistant', language, text: summarize(language, module, rows), displayMode: 'text', erp: { module, table, count: rows.length } };
}
