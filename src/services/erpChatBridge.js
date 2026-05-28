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
  ['taches', /(tache|tâche|task|retard|echeance|échéance|todo|assign|devoir)/i],
  ['alertes', /(alerte|alert|rappel|reminder|notification|urgence|fattali|fàttali)/i],
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

  if (language === 'wo') {
    return `Ci ERP bi, gis naa ${count} résultat ci module ${module}. ${preview.length ? `Yu njëkk yi: ${preview.join(' ; ')}.` : ''}`;
  }
  if (language === 'en') {
    return `I found ${count} matching ERP record(s) in the ${module} module. ${preview.length ? `First results: ${preview.join(' ; ')}.` : ''}`;
  }
  return `J’ai trouvé ${count} donnée(s) ERP dans le module ${module}. ${preview.length ? `Premiers résultats : ${preview.join(' ; ')}.` : ''}`;
}

export function inferErpModule(text = '') {
  const match = MODULE_PATTERNS.find(([, pattern]) => pattern.test(text));
  return match?.[0] || '';
}

export async function askErpFromChat({ text = '', language = 'fr', role = 'visiteur' } = {}) {
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

  if (response.status === 403) {
    return { side: 'assistant', language, text: data.message || getNoDataText(language, module), displayMode: 'text', erp: { module, table, accessDenied: true } };
  }
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
