const MODULE_LABELS = {
  animaux: 'Animaux',
  avicole: 'Avicole',
  bovins: 'Bovins',
  cultures: 'Cultures',
  clients: 'Clients',
  fournisseurs: 'Fournisseurs',
  stock: 'Stock',
  ventes: 'Ventes',
  sales_orders: 'Ventes',
  payments: 'Paiements',
  invoices: 'Factures',
  finances: 'Finances',
  sante: 'Santé',
  documents: 'Documents',
  taches: 'Tâches',
  alertes_center: 'Alertes',
  sensor_devices: 'Capteurs',
  camera_devices: 'Caméras',
  equipements: 'Équipements',
  objectifs: 'Objectifs',
  production_oeufs_logs: 'Ponte',
  business_events: 'Activité ferme',
};

const MODULE_HINTS = {
  health: ['sante', 'animaux', 'bovins', 'avicole', 'alertes_center', 'business_events'],
  money: ['clients', 'sales_orders', 'ventes', 'payments', 'invoices', 'finances'],
  stock: ['stock', 'fournisseurs', 'business_events'],
  eggs: ['production_oeufs_logs', 'avicole', 'stock', 'sales_orders', 'ventes'],
  sensors: ['sensor_devices', 'camera_devices', 'alertes_center', 'taches'],
  sellable: ['animaux', 'bovins', 'avicole', 'sales_orders', 'ventes'],
  documents: ['documents', 'invoices'],
  tasks: ['taches', 'alertes_center', 'business_events'],
};

const STOP_WORDS = new Set(['comment', 'pourquoi', 'quelle', 'quels', 'quelles', 'dans', 'avec', 'sans', 'pour', 'quoi', 'est', 'sont', 'les', 'des', 'une', 'un', 'qui', 'que', 'naka', 'ndax', 'moo', 'mo', 'kan', 'kaan', 'kou', 'ku', 'bi', 'yi', 'the', 'and', 'what', 'which', 'show', 'give', 'today']);

const SYNONYMS = {
  feebar: ['sante', 'malade', 'maladie', 'soin', 'vaccin', 'mortalite', 'animal'],
  febar: ['sante', 'malade', 'maladie', 'soin', 'vaccin', 'mortalite', 'animal'],
  malade: ['sante', 'soin', 'vaccin', 'animal'],
  xaalis: ['paiement', 'payer', 'creance', 'dette', 'client', 'vente', 'finance', 'caisse'],
  bor: ['creance', 'dette', 'client', 'payer', 'paiement'],
  aliment: ['stock', 'sac', 'provende', 'feed'],
  ponte: ['oeuf', 'oeufs', 'tablette', 'production'],
  nen: ['oeuf', 'oeufs', 'ponte', 'tablette'],
  vendre: ['vente', 'client', 'prix', 'pret', 'vendable', 'animal', 'lot'],
  jaay: ['vente', 'client', 'prix', 'pret', 'vendable', 'animal', 'lot'],
  humidite: ['capteur', 'temperature', 'alerte'],
  camera: ['mouvement', 'alerte', 'surveillance'],
};

function normalize(value = '') {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9#\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectDomains(query = '') {
  const q = normalize(query);
  const domains = [];
  if (/(febar|feebar|malade|sante|soin|vaccin|mortal)/.test(q)) domains.push('health');
  if (/(xaalis|bor|creance|dette|payer|paiement|caisse|argent|cash|money)/.test(q)) domains.push('money');
  if (/(stock|aliment|sac|provende|feed|reste)/.test(q)) domains.push('stock');
  if (/(ponte|nen|oeuf|oeufs|tablette)/.test(q)) domains.push('eggs');
  if (/(capteur|camera|temperature|humidite|mouvement|alerte)/.test(q)) domains.push('sensors');
  if (/(pret|vendre|vendable|jaay|vente)/.test(q)) domains.push('sellable');
  if (/(document|facture|invoice|preuve|photo)/.test(q)) domains.push('documents');
  if (/(tache|task|liggeey|controle)/.test(q)) domains.push('tasks');
  return domains;
}

function tokens(query = '') {
  const raw = normalize(query).split(' ').filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  const expanded = new Set(raw);
  raw.forEach((word) => (SYNONYMS[word] || []).forEach((synonym) => expanded.add(normalize(synonym))));
  return [...expanded];
}

function compactRow(row = {}) {
  const out = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out[key] = value;
  });
  return out;
}

function rowText(row = {}) {
  return normalize(Object.entries(row || {}).map(([key, value]) => `${key} ${value}`).join(' '));
}

function scoreRow(moduleKey, row, words, preferredModules) {
  const haystack = `${normalize(moduleKey)} ${normalize(MODULE_LABELS[moduleKey] || '')} ${rowText(row)}`;
  let score = preferredModules.includes(moduleKey) ? 6 : 0;
  words.forEach((word) => {
    if (haystack.includes(word)) score += word.length > 4 ? 3 : 2;
  });
  return score;
}

export function searchErpData(dataMap = {}, query = '', options = {}) {
  const words = tokens(query);
  const domains = detectDomains(query);
  const preferredModules = [...new Set(domains.flatMap((domain) => MODULE_HINTS[domain] || []))];
  const moduleLimit = options.moduleLimit || 14;
  const rowLimit = options.rowLimit || 10;
  const results = [];

  Object.entries(dataMap || {}).forEach(([moduleKey, rows]) => {
    if (!Array.isArray(rows) || !rows.length) return;
    const moduleResults = rows.slice(0, 300).map((row) => ({ moduleKey, row, score: scoreRow(moduleKey, row, words, preferredModules) })).filter((item) => item.score > 0 || preferredModules.includes(moduleKey)).sort((a, b) => b.score - a.score).slice(0, rowLimit);
    if (moduleResults.length) {
      results.push({ moduleKey, moduleLabel: MODULE_LABELS[moduleKey] || moduleKey, score: moduleResults.reduce((sum, item) => sum + item.score, 0), rows: moduleResults.map((item) => compactRow(item.row)) });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, moduleLimit);
}

export function buildErpSearchContext(dataMap = {}, query = '', stats = {}, sensorAlerts = []) {
  return {
    question: query,
    stats,
    sensorAlerts,
    relevantModules: searchErpData(dataMap, query),
    availableModules: Object.entries(dataMap || {}).filter(([, rows]) => Array.isArray(rows) && rows.length).map(([key, rows]) => ({ key, label: MODULE_LABELS[key] || key, count: rows.length })),
  };
}
