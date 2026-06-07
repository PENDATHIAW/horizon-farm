import { consolidateFinance, deriveBusinessCharges } from '../utils/financeConsolidationEngine.js';
import { makeId } from '../utils/ids.js';
import { toNumber } from '../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);

const CHARGE_CATEGORIES = [
  { key: 'animaux', label: 'Coûts animaux', module: 'animaux', activite: 'animaux', keywords: ['animal', 'animaux', 'bovin', 'ovin', 'caprin'] },
  { key: 'avicole', label: 'Coûts avicole', module: 'avicole', activite: 'avicole', keywords: ['avicole', 'lot', 'poulet', 'pondeuse'] },
  { key: 'cultures', label: 'Coûts cultures', module: 'cultures', activite: 'cultures', keywords: ['culture', 'recolte', 'récolte', 'semence'] },
  { key: 'sante', label: 'Coûts santé', module: 'sante', activite: 'sante', keywords: ['sante', 'santé', 'vaccin', 'soin', 'veterinaire'] },
  { key: 'alimentation', label: 'Alimentation', module: 'stock', activite: 'stock', keywords: ['aliment', 'alimentation', 'nourriture'] },
  { key: 'stockAchats', label: 'Achats stock', module: 'stock', activite: 'stock', keywords: ['stock', 'achat', 'intrant', 'approvisionnement'] },
  { key: 'investissements', label: 'Investissements', module: 'investissements', activite: 'investissements', keywords: ['investissement', 'equipement', 'équipement'] },
  { key: 'evenements', label: 'Charges événements', module: 'finances', activite: 'global', keywords: ['maintenance', 'charge', 'depense', 'dépense'] },
];

function financeCoversCategory(transactions = [], category = {}, amount = 0) {
  if (amount <= 0) return true;
  const covered = arr(transactions)
    .filter((row) => clean(row.type) === 'sortie' || clean(row.type) === 'expense')
    .filter((row) => {
      const text = clean(`${row.categorie || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.libelle || ''} ${row.activite || ''}`);
      if (text.includes(`business-charge-sync:${category.key}`)) return true;
      return category.keywords.some((word) => text.includes(word));
    })
    .reduce((sum, row) => sum + num(row.montant ?? row.amount), 0);
  return covered >= amount * 0.85;
}

export function auditBusinessChargeGaps(data = {}) {
  const transactions = arr(data.finances || data.transactions);
  const derived = deriveBusinessCharges({
    animaux: data.animaux,
    lots: data.lots || data.avicole,
    cultures: data.cultures,
    stocks: data.stocks || data.stock,
    fournisseurs: data.fournisseurs,
    sante: data.sante,
    alimentationLogs: data.alimentationLogs,
    investissements: data.investissements,
    businessEvents: data.businessEvents,
  });
  const gaps = CHARGE_CATEGORIES
    .map((category) => {
      const amount = num(derived[category.key]);
      const missing = amount > 0 && !financeCoversCategory(transactions, category, amount);
      return missing ? { ...category, amount, dedupeKey: `business-charge-sync:${category.key}` } : null;
    })
    .filter(Boolean);
  const finance = consolidateFinance({
    transactions,
    salesOrders: data.sales_orders || data.salesOrders || [],
    payments: data.payments || [],
    fournisseurs: data.fournisseurs || [],
    stocks: data.stocks || data.stock || [],
    animaux: data.animaux || [],
    lots: data.lots || data.avicole || [],
    cultures: data.cultures || [],
    sante: data.sante || [],
    alimentationLogs: data.alimentationLogs || [],
    investissements: data.investissements || [],
    businessEvents: data.businessEvents || [],
  });
  return { gaps, derived, finance, totalMissing: gaps.reduce((sum, row) => sum + row.amount, 0) };
}

export function buildBusinessChargeFinanceRow(category = {}, amount = 0, date = today()) {
  const value = num(amount);
  if (value <= 0) return null;
  return {
    id: makeId('TRX'),
    type: 'sortie',
    libelle: `${category.label} · sync métier`,
    montant: value,
    amount: value,
    date,
    categorie: category.label,
    activite: category.activite,
    module_lie: category.module,
    source_module: category.module,
    source_record_id: category.dedupeKey,
    related_id: category.dedupeKey,
    statut: 'paye',
    transaction_origin: 'business_charge_sync',
    side_effects_managed: true,
    created_from: 'business_charge_sync',
    notes: `Charge métier consolidée depuis ${category.module}. Clé ${category.dedupeKey}.`,
  };
}

export async function syncBusinessChargesToFinance({ data = {}, handlers = {} } = {}) {
  const audit = auditBusinessChargeGaps(data);
  const transactions = arr(data.finances || data.transactions);
  let created = 0;
  for (const gap of audit.gaps) {
    const exists = transactions.some((row) => clean(row.source_record_id || row.related_id) === clean(gap.dedupeKey));
    if (exists) continue;
    const row = buildBusinessChargeFinanceRow(gap, gap.amount);
    if (!row || !handlers.onCreateFinanceTransaction) continue;
    await handlers.onCreateFinanceTransaction(row);
    created += 1;
  }
  if (created > 0) await handlers.onRefreshFinances?.();
  return { ...audit, created };
}
