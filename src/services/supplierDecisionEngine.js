const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amount = (row = {}) => num(row.montant ?? row.total ?? row.prix_total ?? row.valeur_stock ?? row.total_value ?? 0);

function supplierName(supplier = {}) {
  return supplier.nom || supplier.name || supplier.raison_sociale || supplier.id || 'Fournisseur';
}

function supplierCategory(supplier = {}) {
  const raw = norm(`${supplier.categorie || ''} ${supplier.type || ''} ${supplier.nom || ''} ${supplier.notes || ''}`);
  if (raw.includes('aliment')) return 'Aliments';
  if (raw.includes('veterinaire') || raw.includes('vaccin') || raw.includes('sante')) return 'Santé / vétérinaire';
  if (raw.includes('poussin') || raw.includes('avicole')) return 'Avicole';
  if (raw.includes('semence') || raw.includes('intrant') || raw.includes('engrais')) return 'Intrants cultures';
  if (raw.includes('transport')) return 'Transport';
  if (raw.includes('materiel') || raw.includes('equipement')) return 'Équipement';
  return supplier.categorie || 'Approvisionnement';
}

function supplierStockRows(supplier = {}, stocks = []) {
  const id = String(supplier.id || '');
  const name = norm(supplierName(supplier));
  return arr(stocks).filter((stock) => String(stock.fournisseur_id || stock.supplier_id || '') === id || norm(stock.fournisseur || stock.supplier || '').includes(name));
}

function supplierTransactions(supplier = {}, finances = []) {
  const id = String(supplier.id || '');
  const name = norm(supplierName(supplier));
  return arr(finances).filter((trx) => String(trx.fournisseur_id || trx.supplier_id || trx.related_id || '') === id || norm(`${trx.libelle || ''} ${trx.fournisseur || ''}`).includes(name));
}

export function buildSupplierDecisionProfile(supplier = {}, dataMap = {}) {
  const stocks = supplierStockRows(supplier, dataMap.stocks || dataMap.stock || []);
  const transactions = supplierTransactions(supplier, dataMap.finances || dataMap.transactions || []);
  const stockValue = stocks.reduce((sum, row) => sum + amount(row), 0);
  const purchaseValue = transactions.filter((trx) => norm(trx.type || trx.categorie || '').includes('sortie') || norm(trx.categorie || '').includes('achat')).reduce((sum, row) => sum + amount(row), 0);
  const debt = num(supplier.dettes ?? supplier.dette ?? supplier.reste_a_payer);
  const deliveries = num(supplier.livraisons ?? supplier.nb_livraisons ?? stocks.length);
  const note = num(supplier.note ?? supplier.score ?? 0);
  const hasPhone = Boolean(supplier.whatsapp || supplier.tel || supplier.phone);
  const category = supplierCategory(supplier);
  const dependencyScore = Math.min(100, Math.round((stockValue / 100000) + (purchaseValue / 150000) + deliveries * 4));
  const reliabilityScore = Math.max(0, Math.min(100, Math.round((note ? note * 16 : 45) + Math.min(25, deliveries * 3) + (hasPhone ? 10 : -10) - (debt > 0 ? 12 : 0))));
  const riskScore = Math.max(0, Math.min(100, Math.round((debt > 0 ? 25 : 0) + (reliabilityScore < 55 ? 30 : 0) + (dependencyScore > 70 ? 25 : 0) + (!hasPhone ? 10 : 0))));

  let segment = 'À qualifier';
  if (riskScore >= 70) segment = 'Critique / risque élevé';
  else if (dependencyScore >= 70 && reliabilityScore >= 65) segment = 'Stratégique';
  else if (debt > 0) segment = 'Dette à suivre';
  else if (reliabilityScore >= 75) segment = 'Fiable';
  else if (!hasPhone) segment = 'Contact incomplet';

  const action = (() => {
    if (segment === 'Critique / risque élevé') return 'Chercher un fournisseur alternatif et sécuriser le stock critique.';
    if (segment === 'Stratégique') return 'Négocier conditions, prix, délais et priorité de disponibilité.';
    if (segment === 'Dette à suivre') return 'Planifier paiement et éviter blocage d’approvisionnement.';
    if (segment === 'Fiable') return 'Consolider la relation et préparer commandes récurrentes.';
    if (segment === 'Contact incomplet') return 'Compléter téléphone, WhatsApp, adresse et conditions.';
    return 'Qualifier produits, prix, délais, zone et fiabilité.';
  })();

  return {
    id: supplier.id,
    name: supplierName(supplier),
    category,
    segment,
    stockValue,
    purchaseValue,
    debt,
    deliveries,
    dependencyScore,
    reliabilityScore,
    riskScore,
    action,
  };
}

export function buildSupplierDecisionSummary(rows = [], dataMap = {}) {
  const profiles = arr(rows).map((supplier) => buildSupplierDecisionProfile(supplier, dataMap));
  return {
    profiles,
    strategic: profiles.filter((p) => p.segment === 'Stratégique'),
    risks: profiles.filter((p) => p.riskScore >= 60),
    debts: profiles.filter((p) => p.debt > 0),
    missingContacts: profiles.filter((p) => p.segment === 'Contact incomplet'),
  };
}

export default buildSupplierDecisionSummary;
