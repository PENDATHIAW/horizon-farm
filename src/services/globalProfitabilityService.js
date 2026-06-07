import { toNumber } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires ?? row.cout ?? row.coût ?? row.cost);
const total = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.chiffre_affaires ?? row.amount);
const textOf = (row = {}) => lower(`${row.profit_bucket || ''} ${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.module || ''} ${row.source_type || ''} ${row.libelle || ''} ${row.title || ''} ${row.description || ''}`);

export const PROFIT_BUCKETS = {
  animaux: 'Charges directes animaux',
  avicole: 'Charges directes avicole',
  cultures: 'Charges directes cultures',
  stock_non_affecte: 'Stock / alimentation non affecté',
  sante_non_affectee: 'Santé non affectée',
  remuneration_proprietaire: 'Rémunération propriétaire',
  rh: 'Charges RH',
  exploitation: 'Charges exploitation',
  equipements: 'Équipements / maintenance',
  fournisseurs_achats: 'Achats fournisseurs',
  investissements: 'Investissements',
  prelevements_proprietaire: 'Prélèvements propriétaire',
  autres_charges: 'Autres charges',
};

export function classifyProfitCharge(row = {}) {
  if (row.profit_bucket && PROFIT_BUCKETS[row.profit_bucket]) return row.profit_bucket;
  const text = textOf(row);
  if (/animal|animaux|bovin|ovin|caprin|cheptel/.test(text)) return 'animaux';
  if (/avicole|volaille|poulet|poussin|pondeuse|chair|lot/.test(text)) return 'avicole';
  if (/culture|maraichage|maraîchage|semence|recolte|récolte|parcelle/.test(text)) return 'cultures';
  if (/sant|vaccin|medicament|médicament|veto|véto|soin|traitement/.test(text)) return 'sante_non_affectee';
  if (/stock|aliment|alimentation|provende|intrant|fourrage|foin|granul|cereale|céréale/.test(text)) return 'stock_non_affecte';
  if (/equip|materiel|matériel|maintenance|machine|pompe|incubateur|vehicule|véhicule/.test(text)) return 'equipements';
  if (/invest|business plan|immobilisation|construction|batiment|bâtiment/.test(text)) return 'investissements';
  if (/fournisseur|achat|approvisionnement|dette fournisseur/.test(text)) return 'fournisseurs_achats';
  if (/salaire|paie|rh|employ/.test(text)) return 'rh';
  if (/prelevement|prélèvement|retrait perso|avance associe|avance associé|compte exploitant/.test(text)) return 'prelevements_proprietaire';
  if (/loyer|electric|électric|eau|internet|transport|admin|assurance|taxe|impot|impôt|exploitation/.test(text)) return 'exploitation';
  return 'autres_charges';
}

function buildRowsByBucket() {
  return Object.fromEntries(Object.keys(PROFIT_BUCKETS).map((key) => [key, []]));
}

function addRow(rowsByBucket, bucket, value, source = {}) {
  if (!bucket || !PROFIT_BUCKETS[bucket] || toNumber(value) <= 0) return;
  rowsByBucket[bucket].push({ ...source, montant: value, profit_bucket: bucket, type: 'sortie' });
}

function manualFinanceBuckets(transactions = []) {
  const rowsByBucket = buildRowsByBucket();
  const buckets = Object.fromEntries(Object.keys(PROFIT_BUCKETS).map((key) => [key, 0]));
  arr(transactions).filter((tx) => lower(tx.type) === 'sortie').forEach((tx) => {
    const bucket = classifyProfitCharge(tx);
    const value = amount(tx);
    buckets[bucket] += value;
    addRow(rowsByBucket, bucket, value, tx);
  });
  return { buckets, rowsByBucket };
}

export function computeGlobalProfitability({ transactions = [], salesOrders = [], payments = [], businessEvents = [], animaux = [], lots = [], cultures = [], stocks = [], sante = [], alimentationLogs = [], productionLogs = [], fournisseurs = [], investissements = [], equipements = [] } = {}) {
  const finance = consolidateFinance({ transactions, salesOrders, payments, fournisseurs, stocks, animaux, lots, cultures, sante, alimentationLogs, productionLogs, investissements, equipements, businessEvents });
  const manual = manualFinanceBuckets(transactions);
  const detail = finance.chargesDeriveesDetail || {};
  const buckets = {
    ...manual.buckets,
    animaux: Math.max(manual.buckets.animaux || 0, detail.animaux || 0),
    avicole: Math.max(manual.buckets.avicole || 0, detail.avicole || 0),
    cultures: Math.max(manual.buckets.cultures || 0, detail.cultures || 0),
    stock_non_affecte: Math.max(manual.buckets.stock_non_affecte || 0, detail.stockAchats || 0, detail.alimentation || 0),
    sante_non_affectee: Math.max(manual.buckets.sante_non_affectee || 0, detail.sante || 0),
    fournisseurs_achats: Math.max(manual.buckets.fournisseurs_achats || 0, detail.dettesFournisseurs || 0),
    investissements: Math.max(manual.buckets.investissements || 0, detail.investissements || 0),
    equipements: Math.max(manual.buckets.equipements || 0, detail.equipements || 0),
    autres_charges: Math.max(manual.buckets.autres_charges || 0, detail.evenements || 0),
  };
  const rowsByBucket = manual.rowsByBucket;
  addRow(rowsByBucket, 'animaux', detail.animaux, { source_module: 'consolidation_animaux' });
  addRow(rowsByBucket, 'avicole', detail.avicole, { source_module: 'consolidation_avicole' });
  addRow(rowsByBucket, 'cultures', detail.cultures, { source_module: 'consolidation_cultures' });
  addRow(rowsByBucket, 'stock_non_affecte', Math.max(detail.stockAchats || 0, detail.alimentation || 0), { source_module: 'consolidation_stock_alimentation' });
  addRow(rowsByBucket, 'sante_non_affectee', detail.sante, { source_module: 'consolidation_sante' });
  addRow(rowsByBucket, 'fournisseurs_achats', detail.dettesFournisseurs, { source_module: 'consolidation_fournisseurs' });
  addRow(rowsByBucket, 'investissements', detail.investissements, { source_module: 'consolidation_investissements' });
  addRow(rowsByBucket, 'equipements', detail.equipements, { source_module: 'consolidation_equipements' });
  addRow(rowsByBucket, 'autres_charges', detail.evenements, { source_module: 'consolidation_evenements' });

  const caTotal = Math.max(finance.caConsolide || 0, arr(salesOrders).reduce((sum, sale) => sum + total(sale), 0), arr(payments).reduce((sum, payment) => sum + amount(payment), 0));
  const encaisse = finance.cashEncaisse || 0;
  const directActivityCharges = (buckets.animaux || 0) + (buckets.avicole || 0) + (buckets.cultures || 0);
  const unallocatedOperationalCharges = (buckets.stock_non_affecte || 0) + (buckets.sante_non_affectee || 0);
  const ownerSalary = buckets.remuneration_proprietaire || 0;
  const ownerWithdrawals = buckets.prelevements_proprietaire || 0;
  const structureCharges = ownerSalary + (buckets.rh || 0) + (buckets.exploitation || 0) + (buckets.equipements || 0) + (buckets.fournisseurs_achats || 0) + (buckets.autres_charges || 0);
  const investments = buckets.investissements || 0;
  const chargesBeforeInvestments = directActivityCharges + unallocatedOperationalCharges + structureCharges;
  const grossActivityMargin = caTotal - directActivityCharges;
  const operatingResult = caTotal - chargesBeforeInvestments;
  const cashResultAfterInvestments = encaisse - chargesBeforeInvestments - investments;
  const availableCashAfterWithdrawals = cashResultAfterInvestments - ownerWithdrawals;
  return { caTotal, encaisse, buckets, rowsByBucket, directActivityCharges, unallocatedOperationalCharges, structureCharges, investments, ownerSalary, ownerWithdrawals, lossCharges: finance.lossCharges || 0, chargesBeforeInvestments, grossActivityMargin, operatingResult, cashResultAfterInvestments, availableCashAfterWithdrawals, operatingMarginPct: caTotal > 0 ? (operatingResult / caTotal) * 100 : 0 };
}
