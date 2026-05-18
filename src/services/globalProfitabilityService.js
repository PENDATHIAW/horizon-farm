import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires ?? row.cout ?? row.coût ?? row.cost);
const total = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.chiffre_affaires ?? row.amount);
const linkedText = (row = {}) => lower(`${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.related_type || ''} ${row.module || ''} ${row.source_type || ''}`);
const fullText = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.module || ''} ${row.source_type || ''} ${row.type_evenement || ''} ${row.event_type || ''} ${row.libelle || ''} ${row.title || ''} ${row.description || ''} ${row.notes || ''}`);
const isLossEvent = (row = {}) => ['perte_animal', 'perte_avicole', 'perte_culturale'].includes(lower(row.type_evenement || row.event_type)) || lower(`${row.title || ''} ${row.description || ''}`).includes('perte');
const firstPositive = (...values) => values.map((value) => toNumber(value)).find((value) => value > 0) || 0;

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

function addBucket({ buckets, rowsByBucket }, bucket, value, row) {
  const amountValue = toNumber(value);
  if (!bucket || !PROFIT_BUCKETS[bucket] || amountValue <= 0) return;
  buckets[bucket] += amountValue;
  rowsByBucket[bucket].push(row || { montant: amountValue, type: 'sortie', profit_bucket: bucket });
}

function animalDerivedCost(row = {}) {
  const achat = firstPositive(row.purchase_cost, row.prix_achat, row.cout_achat, row.cost_purchase);
  const alimentation = firstPositive(row.alimentation, row.cout_alimentation, row.feed_cost, row.cout_nourriture);
  const sante = firstPositive(row.sante, row.cout_sante, row.health_cost, row.vet_cost);
  const autres = firstPositive(row.autres_frais, row.frais_directs, row.other_costs, row.direct_costs);
  const totalDirect = firstPositive(row.cout_total, row.total_cost, row.cost_total);
  const calc = achat + alimentation + sante + autres;
  return totalDirect > 0 ? Math.max(totalDirect, calc) : calc;
}

function lotDerivedCost(row = {}) {
  const poussins = firstPositive(row.cout_poussins, row.purchase_cost, row.cout_achat, row.cost_purchase);
  const aliment = firstPositive(row.cout_aliment, row.alimentation, row.cout_alimentation, row.feed_cost);
  const sante = firstPositive(row.frais_sante, row.cout_sante, row.sante, row.health_cost);
  const pertes = firstPositive(row.cout_pertes, row.pertes_valeur, row.loss_cost);
  const autres = firstPositive(row.autres_frais, row.frais_directs, row.other_costs);
  const totalDirect = firstPositive(row.cout_total, row.total_cost, row.cost_total);
  const calc = poussins + aliment + sante + pertes + autres;
  return totalDirect > 0 ? Math.max(totalDirect, calc) : calc;
}

function cultureDerivedCost(row = {}) {
  const semences = firstPositive(row.cout_semences, row.semences_cost, row.seed_cost);
  const engrais = firstPositive(row.cout_engrais, row.engrais_cost, row.fertilizer_cost);
  const eau = firstPositive(row.cout_eau, row.cout_irrigation, row.water_cost, row.irrigation_cost);
  const mainOeuvre = firstPositive(row.cout_main_oeuvre, row.cout_mo, row.labor_cost);
  const traitements = firstPositive(row.cout_traitement, row.cout_traitements, row.treatment_cost);
  const pertes = firstPositive(row.cout_pertes, row.pertes_valeur, row.loss_cost);
  const autres = firstPositive(row.autres_frais, row.frais_directs, row.other_costs);
  const totalDirect = firstPositive(row.cout_total, row.total_cost, row.cost_total);
  const calc = semences + engrais + eau + mainOeuvre + traitements + pertes + autres;
  return totalDirect > 0 ? Math.max(totalDirect, calc) : calc;
}

function stockDerivedCost(row = {}) {
  return firstPositive(row.valeur, row.valeur_stock, row.value, row.total, toNumber(row.quantite ?? row.quantity) * toNumber(row.prix_unitaire ?? row.prixUnit ?? row.prixunit ?? row.unit_price));
}

function healthDerivedCost(row = {}) {
  return firstPositive(row.cout, row.coût, row.montant, row.amount, row.cout_sante, row.health_cost, row.vet_cost, row.prix, row.price);
}

function investmentDerivedCost(row = {}) {
  return firstPositive(row.montant, row.amount, row.total, row.cout, row.coût, row.budget, row.cost, row.prix, row.price);
}

function equipmentDerivedCost(row = {}) {
  return firstPositive(row.cout_reparation, row.repair_cost, row.maintenance_cost, row.cout_maintenance) + firstPositive(row.prix_achat, row.purchase_cost, row.cout_achat, row.cost_purchase);
}

function addDerivedBusinessCharges(context, { animaux = [], lots = [], cultures = [], stocks = [], sante = [], alimentationLogs = [], fournisseurs = [], investissements = [], equipements = [], businessEvents = [] } = {}) {
  arr(animaux).forEach((row) => addBucket(context, 'animaux', animalDerivedCost(row), { ...row, type: 'sortie', profit_bucket: 'animaux', source_module: 'animaux', generated: true }));
  arr(lots).forEach((row) => addBucket(context, 'avicole', lotDerivedCost(row), { ...row, type: 'sortie', profit_bucket: 'avicole', source_module: 'avicole', generated: true }));
  arr(cultures).forEach((row) => addBucket(context, 'cultures', cultureDerivedCost(row), { ...row, type: 'sortie', profit_bucket: 'cultures', source_module: 'cultures', generated: true }));
  arr(stocks).forEach((row) => addBucket(context, 'stock_non_affecte', stockDerivedCost(row), { ...row, type: 'sortie', profit_bucket: 'stock_non_affecte', source_module: 'stock', generated: true }));
  arr(sante).forEach((row) => addBucket(context, activityFromLink(row) || 'sante_non_affectee', healthDerivedCost(row), { ...row, type: 'sortie', profit_bucket: activityFromLink(row) || 'sante_non_affectee', source_module: 'sante', generated: true }));
  arr(alimentationLogs).forEach((row) => addBucket(context, activityFromLink(row) || 'stock_non_affecte', firstPositive(row.cout, row.coût, row.montant, row.amount, row.total, row.cout_total), { ...row, type: 'sortie', profit_bucket: activityFromLink(row) || 'stock_non_affecte', source_module: 'alimentation_logs', generated: true }));
  arr(fournisseurs).forEach((row) => addBucket(context, 'fournisseurs_achats', firstPositive(row.dettes, row.dette, row.solde_du, row.montant_du), { ...row, type: 'sortie', profit_bucket: 'fournisseurs_achats', source_module: 'fournisseurs', generated: true }));
  arr(investissements).forEach((row) => addBucket(context, 'investissements', investmentDerivedCost(row), { ...row, type: 'sortie', profit_bucket: 'investissements', source_module: 'investissements', generated: true }));
  arr(equipements).forEach((row) => addBucket(context, 'equipements', equipmentDerivedCost(row), { ...row, type: 'sortie', profit_bucket: 'equipements', source_module: 'equipements', generated: true }));

  arr(businessEvents).forEach((event) => {
    if (isLossEvent(event)) return;
    const text = fullText(event);
    const looksLikeCharge = /charge|cout|coût|depense|dépense|maintenance|sante|santé|aliment|investissement|achat|fournisseur/.test(text);
    if (looksLikeCharge) addBucket(context, classifyProfitCharge(event), amount(event), { ...event, type: 'sortie', generated: true });
  });
}

export function computeGlobalProfitability({ transactions = [], salesOrders = [], payments = [], businessEvents = [], animaux = [], lots = [], cultures = [], stocks = [], sante = [], alimentationLogs = [], fournisseurs = [], investissements = [], equipements = [] } = {}) {
  const salesCa = arr(salesOrders).reduce((sum, sale) => sum + total(sale), 0);
  const financeIn = arr(transactions).filter((tx) => ['entree', 'entrée'].includes(lower(tx.type))).reduce((sum, tx) => sum + amount(tx), 0);
  const paidIn = arr(payments).reduce((sum, payment) => sum + amount(payment), 0);
  const caTotal = Math.max(salesCa, financeIn, paidIn);
  const encaisse = Math.max(financeIn, paidIn);
  const buckets = Object.fromEntries(Object.keys(PROFIT_BUCKETS).map((key) => [key, 0]));
  const rowsByBucket = Object.fromEntries(Object.keys(PROFIT_BUCKETS).map((key) => [key, []]));
  const context = { buckets, rowsByBucket };

  arr(transactions).filter((tx) => lower(tx.type) === 'sortie').forEach((tx) => {
    addBucket(context, classifyProfitCharge(tx), amount(tx), tx);
  });

  addDerivedBusinessCharges(context, { animaux, lots, cultures, stocks, sante, alimentationLogs, fournisseurs, investissements, equipements, businessEvents });

  const lossEvents = arr(businessEvents).filter((event) => isLossEvent(event) && amount(event) > 0);
  lossEvents.forEach((event) => {
    const bucket = lossBucket(event);
    addBucket(context, bucket, amount(event), { ...event, type: 'sortie', categorie: 'perte_non_cash', profit_bucket: bucket });
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
