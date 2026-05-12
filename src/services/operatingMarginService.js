import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const splitModules = (value) => String(value || '').split(',').map((x) => x.trim()).filter(Boolean);

export const MODULE_ALIASES = {
  animaux: ['animaux', 'animal', 'bovin', 'ovin', 'caprin'],
  avicole: ['avicole', 'lot_avicole', 'chair', 'pondeuse', 'volaille', 'volailles'],
  cultures: ['cultures', 'culture', 'maraichage', 'maraîchage', 'agricole'],
  stock: ['stock', 'stocks', 'magasin'],
  ventes: ['ventes', 'vente', 'clients', 'commercial'],
  fournisseurs: ['fournisseurs', 'fournisseur', 'achats'],
  sante: ['sante', 'santé', 'vaccins', 'soins'],
  investissements: ['investissements', 'business_plan', 'bp'],
  ferme: ['ferme', 'general', 'général', 'exploitation'],
};

export function normalizeModule(value = '') {
  const raw = lower(value);
  const found = Object.entries(MODULE_ALIASES).find(([, aliases]) => aliases.some((alias) => raw.includes(alias)));
  return found?.[0] || raw || 'ferme';
}

export function isRhCost(transaction = {}) {
  const text = lower(`${transaction.categorie || ''} ${transaction.category || ''} ${transaction.module_lie || ''} ${transaction.source_module || ''} ${transaction.libelle || ''}`);
  return text.includes('rémunération') || text.includes('remuneration') || text.includes('salaire') || text.includes('paie') || text.includes('rh');
}

export function isOperatingCost(transaction = {}) {
  if (String(transaction.type || '').toLowerCase() !== 'sortie') return false;
  if (isRhCost(transaction)) return true;
  const text = lower(`${transaction.categorie || ''} ${transaction.category || ''} ${transaction.module_lie || ''} ${transaction.source_module || ''} ${transaction.libelle || ''}`);
  return /exploitation|loyer|electricite|électricité|eau|carburant|maintenance|transport|internet|gardiennage|administratif|assurance|impot|impôt|taxe|frais generaux|frais généraux|main d'oeuvre|main d’œuvre/.test(text);
}

function modulesForTransaction(transaction = {}) {
  const fromJson = (() => {
    try {
      const parsed = JSON.parse(transaction.cout_rh_modules || transaction.modules_costs || '[]');
      if (Array.isArray(parsed)) return parsed.map((x) => x.module).filter(Boolean);
    } catch { return []; }
    return [];
  })();
  const explicit = [...splitModules(transaction.modules_affectes), ...splitModules(transaction.modules), ...fromJson];
  if (explicit.length) return [...new Set(explicit.map(normalizeModule))];
  return [normalizeModule(transaction.module_lie || transaction.source_module || transaction.activite || transaction.activity || 'ferme')];
}

export function computeOperatingCostPools({ transactions = [] } = {}) {
  const pools = {};
  const ensure = (module) => {
    const key = normalizeModule(module);
    pools[key] ||= { module: key, rhCost: 0, operatingCost: 0, totalOverhead: 0, transactions: [] };
    return pools[key];
  };

  arr(transactions).filter(isOperatingCost).forEach((transaction) => {
    const amount = toNumber(transaction.montant ?? transaction.amount);
    if (amount <= 0) return;
    const modules = modulesForTransaction(transaction);
    const perModule = amount / Math.max(1, modules.length);
    modules.forEach((module) => {
      const pool = ensure(module);
      if (isRhCost(transaction)) pool.rhCost += perModule;
      else pool.operatingCost += perModule;
      pool.totalOverhead += perModule;
      pool.transactions.push(transaction);
    });
  });

  return pools;
}

export function allocateOverheadToEntities({ module, entities = [], transactions = [] } = {}) {
  const normalizedModule = normalizeModule(module);
  const pools = computeOperatingCostPools({ transactions });
  const pool = pools[normalizedModule] || { rhCost: 0, operatingCost: 0, totalOverhead: 0 };
  const count = Math.max(1, arr(entities).length || 1);
  return {
    module: normalizedModule,
    pool,
    perEntity: {
      rhCost: pool.rhCost / count,
      operatingCost: pool.operatingCost / count,
      totalOverhead: pool.totalOverhead / count,
    },
  };
}

export function applyOperatingMargin({ directRevenue = 0, directCosts = 0, rhCost = 0, operatingCost = 0 } = {}) {
  const revenue = toNumber(directRevenue);
  const direct = toNumber(directCosts);
  const rh = toNumber(rhCost);
  const exploitation = toNumber(operatingCost);
  const directMargin = revenue - direct;
  const marginAfterRh = directMargin - rh;
  const netOperatingMargin = marginAfterRh - exploitation;
  return {
    revenue,
    directCosts: direct,
    rhCost: rh,
    operatingCost: exploitation,
    totalOverhead: rh + exploitation,
    directMargin,
    marginAfterRh,
    netOperatingMargin,
    netMarginRate: revenue > 0 ? (netOperatingMargin / revenue) * 100 : 0,
  };
}
