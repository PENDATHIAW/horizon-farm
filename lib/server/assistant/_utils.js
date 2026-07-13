import { interpretVoiceCommand } from '../../../src/services/voiceCommands.js';

const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const money = (value) => `${Math.round(num(value)).toLocaleString('fr-FR')} FCFA`;

export const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(payload));
};

export const readJsonBody = async (req) => {
  if (req.method === 'GET') return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

export const requirePostOrOptions = (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 200, { ok: true });
    return false;
  }
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Méthode non autorisée. Utilise POST.' });
    return false;
  }
  return true;
};

export const getModuleArrays = (dataMap = {}) => ({
  ventes: arr(dataMap.sales_orders || dataMap.ventes || dataMap.commandes),
  payments: arr(dataMap.payments || dataMap.paiements),
  finances: arr(dataMap.finances || dataMap.transactions),
  factures: arr(dataMap.invoices || dataMap.factures),
  stock: arr(dataMap.stock || dataMap.stocks),
  clients: arr(dataMap.clients),
  fournisseurs: arr(dataMap.fournisseurs),
  animaux: arr(dataMap.animaux),
  avicole: arr(dataMap.avicole || dataMap.lots),
  sante: arr(dataMap.sante || dataMap.vaccins),
  cultures: arr(dataMap.cultures),
  taches: arr(dataMap.taches || dataMap.tasks),
  alertes: arr(dataMap.alertes_center || dataMap.alertes || dataMap.alerts),
  documents: arr(dataMap.documents),
  smartfarm: arr(dataMap.smartfarm_events || dataMap.sensor_events || dataMap.events),
});

export const summarizeDataMap = (dataMap = {}) => {
  const m = getModuleArrays(dataMap);
  const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.valeur_estimee);
  const ca = Math.max(
    m.ventes.reduce((sum, row) => sum + amount(row), 0),
    m.factures.reduce((sum, row) => sum + amount(row), 0)
  );
  const encaisse = m.payments.reduce((sum, row) => sum + amount(row), 0) + m.finances
    .filter((row) => ['entree', 'recette', 'revenu', 'encaissement'].some((term) => normalize(`${row.type || ''} ${row.categorie || ''}`).includes(term)))
    .reduce((sum, row) => sum + amount(row), 0);
  const depenses = m.finances
    .filter((row) => ['sortie', 'depense', 'charge', 'achat'].some((term) => normalize(`${row.type || ''} ${row.categorie || ''}`).includes(term)))
    .reduce((sum, row) => sum + amount(row), 0);
  const creances = Math.max(0, m.ventes.reduce((sum, row) => sum + num(row.reste_a_payer), 0) || ca - encaisse);
  const stockCritique = m.stock.filter((row) => num(row.quantite ?? row.quantity ?? row.stock) <= num(row.seuil ?? row.threshold ?? row.min_stock) && num(row.seuil ?? row.threshold ?? row.min_stock) > 0).length;
  const soinsRetard = m.sante.filter((row) => normalize(row.statut || row.status).includes('retard')).length;
  const alertesCritiques = m.alertes.filter((row) => ['critique', 'urgence'].some((term) => normalize(row.severity || row.gravite || row.priority).includes(term))).length;

  return {
    totals: {
      ca,
      ca_label: money(ca),
      encaisse,
      encaisse_label: money(encaisse),
      depenses,
      depenses_label: money(depenses),
      creances,
      creances_label: money(creances),
      cash_result: encaisse - depenses,
      cash_result_label: money(encaisse - depenses),
    },
    counts: {
      ventes: m.ventes.length,
      payments: m.payments.length,
      finances: m.finances.length,
      stock: m.stock.length,
      clients: m.clients.length,
      fournisseurs: m.fournisseurs.length,
      animaux: m.animaux.length,
      avicole: m.avicole.length,
      sante: m.sante.length,
      cultures: m.cultures.length,
      taches: m.taches.length,
      alertes: m.alertes.length,
      documents: m.documents.length,
      smartfarm: m.smartfarm.length,
    },
    risks: {
      stock_critique: stockCritique,
      soins_retard: soinsRetard,
      alertes_critiques: alertesCritiques,
    },
  };
};

export const detectNavigationIntent = (text = '') => {
  const command = normalize(text);
  const isNavigation = ['ouvre', 'ouvrir', 'montre', 'affiche', 'va dans', 'vas dans', 'module'].some((word) => command.includes(normalize(word)));
  const modules = [
    ['ventes', ['vente', 'ventes', 'commande']],
    ['finances', ['finance', 'finances', 'caisse', 'argent']],
    ['stock', ['stock', 'stocks', 'aliment', 'intrants']],
    ['avicole', ['avicole', 'pondeuse', 'oeufs', 'poulet', 'lot']],
    ['animaux', ['animaux', 'animal', 'vache', 'mouton', 'chevre']],
    ['sante', ['sante', 'vaccin', 'soin', 'veterinaire']],
    ['cultures', ['culture', 'cultures', 'parcelle', 'recolte']],
    ['clients', ['client', 'clients']],
    ['fournisseurs', ['fournisseur', 'fournisseurs']],
    ['documents', ['document', 'documents', 'justificatif']],
    ['taches', ['tache', 'taches', 'planning']],
    ['alertes', ['alerte', 'alertes']],
    ['smartfarm', ['smart farm', 'capteur', 'camera', 'iot']],
    ['centre_ia', ['centre ia', 'ia', 'cerveau']],
    ['dashboard', ['accueil', 'dashboard', 'tableau de bord']],
  ];
  const found = modules.find(([, words]) => words.some((word) => command.includes(normalize(word))));
  if (!found) return null;
  return {
    intent: isNavigation ? 'navigate_module' : 'module_question',
    primary_module: found[0],
    confidence: isNavigation ? 0.95 : 0.72,
  };
};

/** Même moteur que le client Hey Horizon (src/services/voiceCommands.js). */
export const answerFarmQuestion = (question = '', dataMap = {}) => {
  const summary = summarizeDataMap(dataMap);
  const { answer, moduleKey } = interpretVoiceCommand(question, dataMap);
  return { answer, moduleKey: moduleKey || null, summary };
};

export const buildSimpleDraft = (command = '', _dataMap = {}) => {
  const text = normalize(command);
  const navigation = detectNavigationIntent(text);
  if (navigation?.intent === 'navigate_module') return { ...navigation, status: 'ready', requires_validation: false };

  if (text.includes('achat') || text.includes('achete') || text.includes('aliment') || text.includes('sac')) {
    const quantity = Number(text.match(/(\d+)\s*(sac|sacs|kg|kilogramme|kilogrammes)?/)?.[1] || 0) || null;
    return {
      status: quantity ? 'draft_incomplete' : 'draft_incomplete',
      intent: 'purchase_stock',
      confidence: quantity ? 0.78 : 0.58,
      primary_module: 'stock',
      form_type: 'stock_purchase',
      requires_validation: true,
      missing_fields: ['supplier_name', 'payment_status', 'date'].filter(Boolean),
      draft_fields: {
        product_name: text.includes('aliment') ? 'aliment' : '',
        quantity,
        unit: text.includes('sac') ? 'sac' : '',
      },
      impacted_modules: ['stock', 'finances', 'fournisseurs', 'tracabilite', 'centre_ia'],
    };
  }

  return {
    status: 'question',
    intent: 'farm_question',
    confidence: 0.5,
    primary_module: navigation?.primary_module || null,
    requires_validation: false,
  };
};
