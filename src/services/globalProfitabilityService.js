import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const total = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.chiffre_affaires ?? row.amount);
const linkedText = (row = {}) => lower(`${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.related_type || ''} ${row.module || ''} ${row.source_type || ''}`);
const fullText = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.module || ''} ${row.source_type || ''} ${row.type_evenement || ''} ${row.event_type || ''} ${row.libelle || ''} ${row.title || ''} ${row.description || ''} ${row.notes || ''}`);
const isLossEvent = (row = {}) => ['perte_animal', 'perte_avicole', 'perte_culturale'].includes(lower(row.type_evenement || row.event_type)) || lower(`${row.title || ''} ${row.description || ''}`).includes('perte');

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
  fournisseurs_achats: 'Achats généraux non affectés',
  investissements: 'Investissements',
  prelevements_proprietaire: 'Prélèvements propriétaire',
  autres_charges: 'Autres charges',
};

function activityFromLink(row = {}) {
  const text = linkedText(row);
  if (/animal|animaux|bovin|ovin|caprin/.test(text)) return 'animaux';
  if (/avicole|volaille|poulet|poussin|pondeuse|chair|lot_avicole|lot/.test(text)) return 'avicole';
  if (/culture|cultures|maraichage|maraîchage|parcelle/.test(text)) return 'cultures';
  return '';
}

function lossBucket(row = {}) {
  const type = lower(row.type_evenement || row.event_type);
  if (type === 'perte_animal') return 'animaux';
  if (type === 'perte_avicole') return 'avicole';
  if (type === 'perte_culturale') return 'cultures';
  return activityFromLink(row) || classifyProfitCharge(row);
}

function supplierGeneralPurchase(text = '') {
  const isSupplier = /fournisseur|achat|approvisionnement|dette fournisseur/.test(text);
  if (!isSupplier) return false;
  const isStockOrFeed = /stock|aliment|alimentation|provende|maïs|mais|son|fourrage|foin|granul[eé]|céréale|cereale|intrant stock|mati[eè]re premi[eè]re/.test(text);
  const isHealth = /sant|vaccin|m[eé]dicament|medicament|veto|véto|soin|traitement|bios[eé]curit/.test(text);
  const isEquipment = /equip|mat[eé]riel|materiel|maintenance|machine|pompe|groupe|incubateur|v[eé]hicule|carburant/.test(text);
  const isActivity = /animal|bovin|ovin|caprin|cheptel|avicole|volaille|poulet|poussin|pondeuse|chair|culture|maraichage|maraîchage|semence|r[eé]colte|parcelle/.test(text);
  const isInvestment = /invest|business plan|bp|immobilisation|construction|bâtiment|batiment/.test(text);
  return !isStockOrFeed && !isHealth && !isEquipment && !isActivity && !isInvestment;
}

export function classifyProfitCharge(row = {}) {
  if (row.profit_bucket && PROFIT_BUCKETS[row.profit_bucket]) return row.profit_bucket;
  const linkedActivity = activityFromLink(row);
  if (linkedActivity) return linkedActivity;
  const text = fullText(row);
  if (/salaire.*(propri[eé]taire|dirigeant|fondatrice|g[eé]rante|penda)|r[eé]mun[eé]ration.*(propri[eé]taire|dirigeant|fondatrice|g[eé]rante|penda)|salaire penda|paie penda/.test(text)) return 'remuneration_proprietaire';
  if (/pr[eé]l[eè]vement|retrait perso|personnel|avance associ[eé]|compte exploitant|voyage personnel|d[eé]pense perso/.test(text)) return 'prelevements_proprietaire';
  if (/rh|salaire|paie|rémun|remun/.test(text)) return 'rh';
  if (/animal|bovin|ovin|caprin|cheptel/.test(text)) return 'animaux';
  if (/avicole|volaille|poulet|poussin|pondeuse|chair|lot/.test(text)) return 'avicole';
  if (/culture|maraichage|maraîchage|semence|intrant|récolte|recolte|parcelle/.test(text)) return 'cultures';
  if (/stock|aliment|alimentation|provende|maïs|mais|son|fourrage|foin|granul[eé]|céréale|cereale|perte stock/.test(text)) return 'stock_non_affecte';
  if (/sant|vaccin|m[eé]dicament|medicament|veto|véto|soin|traitement|biosécurité|biosecurite/.test(text)) return 'sante_non_affectee';
  if (/equip|matériel|materiel|maintenance|carburant|machine|pompe|groupe|incubateur|v[eé]hicule/.test(text)) return 'equipements';
  if (/invest|business plan|bp|immobilisation|construction|bâtiment|batiment/.test(text)) return 'investissements';
  if (/loyer|electric|électric|eau|internet|transport|admin|assurance|impot|impôt|taxe|frais généraux|frais generaux|exploitation/.test(text)) return 'exploitation';
  if (supplierGeneralPurchase(text)) return 'fournisseurs_achats';
  return 'autres_charges';
}

export function computeGlobalProfitability({ transactions = [], salesOrders = [], payments = [], businessEvents = [] } = {}) {
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

  const lossEvents = arr(businessEvents).filter((event) => isLossEvent(event) && amount(event) > 0);
  lossEvents.forEach((event) => {
    const bucket = lossBucket(event);
    const value = amount(event);
    buckets[bucket] += value;
    rowsByBucket[bucket].push({ ...event, type: 'sortie', categorie: 'perte_non_cash', profit_bucket: bucket });
  });

  const directActivityCharges = buckets.animaux + buckets.avicole + buckets.cultures;
  const unallocatedOperationalCharges = buckets.stock_non_affecte + buckets.sante_non_affectee;
  const ownerSalary = buckets.remuneration_proprietaire;
  const ownerWithdrawals = buckets.prelevements_proprietaire;
  const structureCharges = ownerSalary + buckets.rh + buckets.exploitation + buckets.equipements + buckets.fournisseurs_achats + buckets.autres_charges;
  const investments = buckets.investissements;
  const chargesBeforeInvestments = directActivityCharges + unallocatedOperationalCharges + structureCharges;
  const grossActivityMargin = caTotal - directActivityCharges;
  const operatingResult = caTotal - chargesBeforeInvestments;
  const cashResultAfterInvestments = encaisse - chargesBeforeInvestments - investments;
  const availableCashAfterWithdrawals = cashResultAfterInvestments - ownerWithdrawals;
  const lossCharges = lossEvents.reduce((sum, event) => sum + amount(event), 0);

  return {
    caTotal,
    encaisse,
    buckets,
    rowsByBucket,
    directActivityCharges,
    unallocatedOperationalCharges,
    structureCharges,
    investments,
    ownerSalary,
    ownerWithdrawals,
    lossCharges,
    chargesBeforeInvestments,
    grossActivityMargin,
    operatingResult,
    cashResultAfterInvestments,
    availableCashAfterWithdrawals,
    operatingMarginPct: caTotal > 0 ? (operatingResult / caTotal) * 100 : 0,
  };
}
