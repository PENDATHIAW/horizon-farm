const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total);
const paid = (row = {}) => num(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? row.amount);
const idOf = (row = {}) => String(row.id || row.client_id || row.fournisseur_id || row.name || row.nom || '');

function daysSince(dateValue) {
  if (!dateValue) return 999;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function relatedTo(row = {}, entity = {}) {
  const keys = [entity.id, entity.nom, entity.name, entity.telephone, entity.phone].filter(Boolean).map(String);
  const raw = `${row.client_id || ''} ${row.customer_id || ''} ${row.client || ''} ${row.client_name || ''} ${row.fournisseur_id || ''} ${row.supplier_id || ''} ${row.fournisseur || ''} ${row.supplier_name || ''}`;
  return keys.some((key) => raw.includes(key));
}

export function scoreClient(client = {}, dataMap = {}) {
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders).filter((sale) => relatedTo(sale, client));
  const payments = arr(dataMap.payments).filter((payment) => relatedTo(payment, client));
  const totalSales = sales.reduce((sum, sale) => sum + amount(sale), 0);
  const totalPaid = Math.max(payments.reduce((sum, payment) => sum + Math.max(amount(payment), paid(payment)), 0), sales.reduce((sum, sale) => sum + paid(sale), 0));
  const receivable = Math.max(0, totalSales - totalPaid);
  const lastSaleDays = Math.min(...sales.map((sale) => daysSince(sale.date || sale.created_at || sale.date_commande)), 999);
  const repeatScore = Math.min(35, sales.length * 7);
  const cashScore = totalSales > 0 ? Math.max(0, 35 - Math.round((receivable / Math.max(1, totalSales)) * 35)) : 0;
  const recencyScore = lastSaleDays <= 30 ? 20 : lastSaleDays <= 90 ? 12 : lastSaleDays <= 180 ? 6 : 0;
  const contactScore = client.telephone || client.phone || client.whatsapp ? 10 : 0;
  const score = Math.max(0, Math.min(100, repeatScore + cashScore + recencyScore + contactScore));
  let action = 'À qualifier : peu d’historique de vente.';
  if (receivable > 0) action = 'Relancer paiement avant nouvelle vente à crédit.';
  else if (score >= 75) action = 'Client fidèle : proposer précommande, offre groupée ou priorité livraison.';
  else if (lastSaleDays > 90 && sales.length) action = 'Client dormant : relance commerciale recommandée.';
  else if (sales.length) action = 'Client actif : entretenir relation et proposer réachat.';
  return { id: idOf(client), name: client.nom || client.name || client.id, score, totalSales, totalPaid, receivable, salesCount: sales.length, lastSaleDays, action };
}

export function scoreSupplier(supplier = {}, dataMap = {}) {
  const stocks = arr(dataMap.stock || dataMap.stocks).filter((stock) => relatedTo(stock, supplier));
  const transactions = arr(dataMap.finances || dataMap.transactions).filter((trx) => relatedTo(trx, supplier));
  const documents = arr(dataMap.documents).filter((doc) => relatedTo(doc, supplier));
  const debt = num(supplier.dettes || supplier.solde_du || supplier.reste_a_payer);
  const riskyStatus = ['a_risque', 'risque', 'bloque', 'bloqué', 'litige'].some((status) => norm(supplier.statut || supplier.status).includes(status));
  const stockCoverage = Math.min(30, stocks.length * 6);
  const proofScore = Math.min(20, documents.length * 5);
  const transactionScore = Math.min(25, transactions.length * 5);
  const debtPenalty = debt > 0 ? 20 : 0;
  const statusPenalty = riskyStatus ? 25 : 0;
  const score = Math.max(0, Math.min(100, 50 + stockCoverage + proofScore + transactionScore - debtPenalty - statusPenalty));
  let action = 'Fournisseur à qualifier.';
  if (debt > 0) action = 'Dette fournisseur à suivre avant nouvelle commande importante.';
  else if (riskyStatus) action = 'Fournisseur à risque : demander alternative ou sécuriser conditions.';
  else if (score >= 80) action = 'Fournisseur fiable : prioritaire pour devis et réapprovisionnement.';
  else action = 'Comparer prix, délais et qualité avant commande.';
  return { id: idOf(supplier), name: supplier.nom || supplier.name || supplier.id, score, stocksCount: stocks.length, transactionsCount: transactions.length, debt, action };
}

export function scoreStock(stock = {}) {
  const quantity = num(stock.quantite ?? stock.quantity);
  const threshold = num(stock.seuil ?? stock.min_stock ?? stock.stock_min);
  const unitPrice = num(stock.prix_unitaire ?? stock.unit_price ?? stock.price);
  const value = quantity * unitPrice;
  const status = norm(`${stock.statut || stock.status || ''} ${stock.categorie || ''} ${stock.produit || stock.name || ''}`);
  const isCritical = threshold > 0 && quantity <= threshold;
  const isHealthOrFeed = /aliment|vaccin|medicament|médicament|soin|semence|engrais/.test(status);
  const immobilized = value > 0 && !isCritical && quantity > threshold * 3;
  let score = 70;
  if (isCritical) score -= 35;
  if (isHealthOrFeed) score += 10;
  if (immobilized) score -= 15;
  score = Math.max(0, Math.min(100, score));
  let action = 'Stock à suivre.';
  if (isCritical) action = 'Rupture possible : réapprovisionnement ou arbitrage urgent.';
  else if (immobilized) action = 'Stock immobilisé : vérifier rotation, marge et risque de perte.';
  else if (isHealthOrFeed) action = 'Stock stratégique : garder disponible pour production et santé.';
  else action = 'Stock correct : surveiller rotation et seuil.';
  return { id: idOf(stock), name: stock.produit || stock.name || stock.nom || stock.id, score, quantity, threshold, value, isCritical, immobilized, action };
}

export function buildRelationshipStockScores(dataMap = {}) {
  const clients = arr(dataMap.clients).map((client) => scoreClient(client, dataMap)).sort((a, b) => b.score - a.score);
  const suppliers = arr(dataMap.fournisseurs || dataMap.suppliers).map((supplier) => scoreSupplier(supplier, dataMap)).sort((a, b) => b.score - a.score);
  const stocks = arr(dataMap.stock || dataMap.stocks).map(scoreStock).sort((a, b) => a.score - b.score);
  return {
    clients,
    suppliers,
    stocks,
    bestClients: clients.filter((item) => item.score >= 75).slice(0, 5),
    clientsToRecover: clients.filter((item) => item.receivable > 0).slice(0, 5),
    supplierRisks: suppliers.filter((item) => item.score < 60 || item.debt > 0).slice(0, 5),
    stockRisks: stocks.filter((item) => item.isCritical || item.immobilized).slice(0, 8),
  };
}

export default buildRelationshipStockScores;
