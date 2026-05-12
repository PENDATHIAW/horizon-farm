import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const total = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.chiffre_affaires ?? row.amount);
const linkedText = (row = {}) => lower(`${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.related_type || ''}`);
const fullText = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''}`);

export const PROFIT_BUCKETS = {
  animaux: 'Charges directes animaux',
  avicole: 'Charges directes avicole',
  cultures: 'Charges directes cultures',
  stock_non_affecte: 'Stock / alimentation non affecté',
  sante_non_affectee: 'Santé non affectée',
  rh: 'Charges RH',
  exploitation: 'Charges exploitation',
  equipements: 'Équipements / maintenance',
  fournisseurs_achats: 'Fournisseurs / achats généraux',
  investissements: 'Investissements',
  autres_charges: 'Autres charges',
};

function activityFromLink(row = {}) {
  const text = linkedText(row);
  if (/animal|animaux|bovin|ovin|caprin/.test(text)) return 'animaux';
  if (/avicole|volaille|poulet|poussin|pondeuse|chair|lot_avicole|lot/.test(text)) return 'avicole';
  if (/culture|cultures|maraichage|maraîchage|parcelle/.test(text)) return 'cultures';
  return '';
}

export function classifyProfitCharge(row = {}) {
  if (row.profit_bucket && PROFIT_BUCKETS[row.profit_bucket]) return row.profit_bucket;
  const linkedActivity = activityFromLink(row);
  if (linkedActivity) return linkedActivity;
  const text = fullText(row);
  if (/rh|salaire|paie|rémun|remun/.test(text)) return 'rh';
  if (/animal|bovin|ovin|caprin|cheptel/.test(text)) return 'animaux';
  if (/avicole|volaille|poulet|poussin|pondeuse|chair|lot/.test(text)) return 'avicole';
  if (/culture|maraichage|maraîchage|semence|intrant|récolte|recolte|parcelle/.test(text)) return 'cultures';
  if (/stock|aliment|provende|maïs|mais|son|fourrage|perte stock/.test(text)) return 'stock_non_affecte';
  if (/sant|vaccin|veto|véto|soin|traitement|biosécurité|biosecurite/.test(text)) return 'sante_non_affectee';
  if (/equip|matériel|materiel|maintenance|carburant|machine|pompe|groupe/.test(text)) return 'equipements';
  if (/fournisseur|achat|approvisionnement|dette fournisseur/.test(text)) return 'fournisseurs_achats';
  if (/invest|business plan|bp|immobilisation|construction|bâtiment|batiment/.test(text)) return 'investissements';
  if (/loyer|electric|électric|eau|internet|transport|admin|assurance|impot|impôt|taxe|frais généraux|frais generaux|exploitation/.test(text)) return 'exploitation';
  return 'autres_charges';
}

export function computeGlobalProfitability({ transactions = [], salesOrders = [], payments = [] } = {}) {
  const salesCa = arr(salesOrders).reduce((sum, sale) => sum + total(sale), 0);
  const financeIn = arr(transactions).filter((tx) => ['entree', 'entrée'].includes(lower(tx.type))).reduce((sum, tx) => sum + amount(tx), 0);
  const paidIn = arr(payments).reduce((sum, payment) => sum + amount(payment), 0);
  const caTotal = Math.max(salesCa, financeIn, paidIn);
  const encaisse = Math.max(financeIn, paidIn);
  const buckets = Object.fromEntries(Object.keys(PROFIT_BUCKETS).map((key) => [key, 0]));
  const rowsByBucket = Object.fromEntries(Object.keys(PROFIT_BUCKETS).map((key) => [key, []]));

  arr(transactions).filter((tx) => lower(tx.type) === 'sortie').forEach((tx) => {
    const bucket = classifyProfitCharge(tx);
    const value = amount(tx);
    buckets[bucket] += value;
    rowsByBucket[bucket].push(tx);
  });

  const directActivityCharges = buckets.animaux + buckets.avicole + buckets.cultures;
  const unallocatedOperationalCharges = buckets.stock_non_affecte + buckets.sante_non_affectee;
  const structureCharges = buckets.rh + buckets.exploitation + buckets.equipements + buckets.fournisseurs_achats + buckets.autres_charges;
  const investments = buckets.investissements;
  const chargesBeforeInvestments = directActivityCharges + unallocatedOperationalCharges + structureCharges;
  const grossActivityMargin = caTotal - directActivityCharges;
  const operatingResult = caTotal - chargesBeforeInvestments;
  const cashResultAfterInvestments = encaisse - chargesBeforeInvestments - investments;

  return {
    caTotal,
    encaisse,
    buckets,
    rowsByBucket,
    directActivityCharges,
    unallocatedOperationalCharges,
    structureCharges,
    investments,
    chargesBeforeInvestments,
    grossActivityMargin,
    operatingResult,
    cashResultAfterInvestments,
    operatingMarginPct: caTotal > 0 ? (operatingResult / caTotal) * 100 : 0,
  };
}
