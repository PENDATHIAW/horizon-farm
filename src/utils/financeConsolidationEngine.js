import { toNumber } from './format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim().toLowerCase();
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.cout ?? row.coût ?? row.cost ?? 0);
const orderAmount = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount ?? 0);
const orderPaidField = (order = {}) => toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid ?? 0);
const paymentAmount = (payment = {}) => toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount ?? 0);
const paymentOrderId = (payment = {}) => payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id;
const isCancelled = (row = {}) => ['annule', 'annulee', 'cancelled', 'rejete'].includes(clean(row.statut || row.status || row.statut_commande));
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(clean(row.type));
const isOut = (row = {}) => ['sortie', 'expense', 'out', 'charge', 'depense', 'dépense'].includes(clean(row.type));
const isPaid = (row = {}) => !['impaye', 'partiel', 'en_retard', 'annule', 'annulee'].includes(clean(row.statut || row.status || 'paye'));
const isReceivableTx = (row = {}) => isIn(row) && ['impaye', 'partiel', 'en_retard'].includes(clean(row.statut || row.status));
const isSalesLikeTx = (tx = {}) => ['vente', 'ventes', 'client', 'clients'].some((key) => clean(`${tx.categorie || ''} ${tx.module_lie || ''} ${tx.source_module || ''} ${tx.libelle || ''}`).includes(key));
const isLossEvent = (event = {}) => ['perte_animal', 'perte_avicole', 'perte_culturale'].includes(clean(event.type_evenement || event.event_type)) || clean(`${event.title || ''} ${event.description || ''}`).includes('perte');
const eventAmount = (event = {}) => toNumber(event.montant ?? event.amount ?? event.valeur_perte_estimee ?? event.total ?? 0);
const firstPositive = (...values) => values.map((value) => toNumber(value)).find((value) => value > 0) || 0;

function keyForTransaction(tx = {}) {
  return [tx.source_module || tx.module_lie || 'finance', tx.source_record_id || tx.related_id || tx.order_id || tx.sale_id || tx.payment_id || tx.invoice_id || tx.id].map((v) => String(v || '').trim()).join(':');
}

function keyForLossEvent(event = {}) {
  return [event.module || event.source_type || 'perte', event.source_id || event.source_record_id || event.related_id || event.id].map((v) => String(v || '').trim()).join(':');
}

function animalCosts(animal = {}) {
  const achat = firstPositive(animal.purchase_cost, animal.prix_achat, animal.cout_achat, animal.cost_purchase);
  const alimentation = firstPositive(animal.alimentation, animal.cout_alimentation, animal.feed_cost, animal.cout_nourriture);
  const sante = firstPositive(animal.sante, animal.cout_sante, animal.health_cost, animal.vet_cost);
  const autres = firstPositive(animal.autres_frais, animal.frais_directs, animal.other_costs, animal.direct_costs);
  const totalDirect = firstPositive(animal.cout_total, animal.total_cost, animal.cost_total);
  const total = totalDirect > 0 ? Math.max(totalDirect, achat + alimentation + sante + autres) : achat + alimentation + sante + autres;
  return { achat, alimentation, sante, autres, total };
}

function lotCosts(lot = {}) {
  const poussins = firstPositive(lot.cout_poussins, lot.purchase_cost, lot.cout_achat, lot.cost_purchase);
  const aliment = firstPositive(lot.cout_aliment, lot.alimentation, lot.cout_alimentation, lot.feed_cost);
  const sante = firstPositive(lot.frais_sante, lot.cout_sante, lot.sante, lot.health_cost);
  const pertes = firstPositive(lot.cout_pertes, lot.pertes_valeur, lot.loss_cost);
  const autres = firstPositive(lot.autres_frais, lot.frais_directs, lot.other_costs);
  const totalDirect = firstPositive(lot.cout_total, lot.total_cost, lot.cost_total);
  const total = totalDirect > 0 ? Math.max(totalDirect, poussins + aliment + sante + pertes + autres) : poussins + aliment + sante + pertes + autres;
  return { poussins, aliment, sante, pertes, autres, total };
}

function cultureCosts(culture = {}) {
  const semences = firstPositive(culture.cout_semences, culture.semences_cost, culture.seed_cost);
  const engrais = firstPositive(culture.cout_engrais, culture.engrais_cost, culture.fertilizer_cost);
  const eau = firstPositive(culture.cout_eau, culture.cout_irrigation, culture.water_cost, culture.irrigation_cost);
  const mainOeuvre = firstPositive(culture.cout_main_oeuvre, culture.cout_mo, culture.labor_cost);
  const traitements = firstPositive(culture.cout_traitement, culture.cout_traitements, culture.treatment_cost);
  const pertes = firstPositive(culture.cout_pertes, culture.pertes_valeur, culture.loss_cost);
  const autres = firstPositive(culture.autres_frais, culture.frais_directs, culture.other_costs);
  const totalDirect = firstPositive(culture.cout_total, culture.total_cost, culture.cost_total);
  const total = totalDirect > 0 ? Math.max(totalDirect, semences + engrais + eau + mainOeuvre + traitements + pertes + autres) : semences + engrais + eau + mainOeuvre + traitements + pertes + autres;
  return { semences, engrais, eau, mainOeuvre, traitements, pertes, autres, total };
}

function healthCost(row = {}) {
  return firstPositive(row.cout, row.coût, row.montant, row.amount, row.cout_sante, row.health_cost, row.vet_cost, row.prix, row.price);
}

function investmentCost(row = {}) {
  return firstPositive(row.montant, row.amount, row.total, row.cout, row.coût, row.budget, row.cost, row.prix, row.price);
}

function equipmentCost(row = {}) {
  const repair = firstPositive(row.cout_reparation, row.repair_cost, row.maintenance_cost, row.cout_maintenance);
  const purchase = firstPositive(row.prix_achat, row.purchase_cost, row.cout_achat, row.cost_purchase);
  return repair + purchase;
}

function stockValueOf(item = {}) {
  return firstPositive(
    item.valeur,
    item.valeur_stock,
    item.value,
    item.total,
    toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.prixUnit ?? item.prixunit ?? item.unit_price),
  );
}

function deriveBusinessCharges({ animaux = [], lots = [], cultures = [], stocks = [], fournisseurs = [], sante = [], alimentationLogs = [], investissements = [], equipements = [], businessEvents = [] } = {}) {
  const animalBreakdown = arr(animaux).map(animalCosts);
  const lotBreakdown = arr(lots).map(lotCosts);
  const cultureBreakdown = arr(cultures).map(cultureCosts);

  const animalTotal = animalBreakdown.reduce((sum, item) => sum + item.total, 0);
  const lotTotal = lotBreakdown.reduce((sum, item) => sum + item.total, 0);
  const cultureTotal = cultureBreakdown.reduce((sum, item) => sum + item.total, 0);

  const stockPurchases = arr(stocks).reduce((sum, item) => {
    const value = stockValueOf(item);
    const isPurchaseOrInput = ['aliment', 'alimentation', 'intrant', 'engrais', 'semence', 'produit', 'achat', 'stock'].some((word) => clean(`${item.categorie || ''} ${item.category || ''} ${item.type || ''} ${item.produit || ''} ${item.nom || ''}`).includes(word));
    return sum + (isPurchaseOrInput ? value : 0);
  }, 0);

  const healthTotal = arr(sante).reduce((sum, row) => sum + healthCost(row), 0);
  const alimentationTotal = arr(alimentationLogs).reduce((sum, row) => sum + firstPositive(row.cout, row.coût, row.montant, row.amount, row.total, row.cout_total), 0);
  const investmentTotal = arr(investissements).reduce((sum, row) => sum + investmentCost(row), 0);
  const equipmentTotal = arr(equipements).reduce((sum, row) => sum + equipmentCost(row), 0);
  const supplierDebt = arr(fournisseurs).reduce((sum, supplier) => sum + firstPositive(supplier.dettes, supplier.dette, supplier.solde_du, supplier.montant_du), 0);
  const eventCharges = arr(businessEvents).reduce((sum, event) => {
    const kind = clean(`${event.type_evenement || ''} ${event.event_type || ''} ${event.title || ''} ${event.description || ''}`);
    const looksLikeCost = ['charge', 'cout', 'coût', 'depense', 'dépense', 'perte', 'maintenance', 'sante', 'santé', 'aliment', 'investissement'].some((word) => kind.includes(word));
    return sum + (looksLikeCost ? eventAmount(event) : 0);
  }, 0);

  const total = animalTotal + lotTotal + cultureTotal + stockPurchases + healthTotal + alimentationTotal + investmentTotal + equipmentTotal + supplierDebt + eventCharges;
  return {
    animaux: animalTotal,
    avicole: lotTotal,
    cultures: cultureTotal,
    stockAchats: stockPurchases,
    sante: healthTotal,
    alimentation: alimentationTotal,
    investissements: investmentTotal,
    equipements: equipmentTotal,
    dettesFournisseurs: supplierDebt,
    evenements: eventCharges,
    total,
    details: {
      animaux: animalBreakdown,
      avicole: lotBreakdown,
      cultures: cultureBreakdown,
    },
  };
}

export function paymentsForOrder(order = {}, payments = []) {
  const orderId = String(order.id || '');
  return arr(payments).filter((payment) => !isCancelled(payment) && String(paymentOrderId(payment) || '') === orderId);
}

export function calculateOrderSettlement(order = {}, payments = []) {
  const total = orderAmount(order);
  const linkedPayments = paymentsForOrder(order, payments);
  const paidFromPayments = linkedPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const paidRaw = Math.max(orderPaidField(order), paidFromPayments);
  const paid = total > 0 ? Math.min(total, paidRaw) : paidRaw;
  const overpaid = total > 0 ? Math.max(0, paidRaw - total) : 0;
  const remaining = Math.max(0, total - paid);
  const paymentStatus = total <= 0 ? 'non_paye' : remaining <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye';
  const orderStatus = isCancelled(order) ? 'annule' : paymentStatus !== 'non_paye' ? 'confirme' : total > 0 ? 'enregistree' : 'brouillon';
  return { total, paid, paidRaw, overpaid, remaining, paymentStatus, orderStatus, linkedPayments };
}

export function calculateClientSettlement(client = {}, orders = [], payments = []) {
  const clientOrders = arr(orders).filter((order) => String(order.client_id || '') === String(client.id || '') && !isCancelled(order));
  const details = clientOrders.map((order) => ({ order, ...calculateOrderSettlement(order, payments) }));
  const total = details.reduce((sum, item) => sum + item.total, 0);
  const paid = details.reduce((sum, item) => sum + item.paid, 0);
  const remaining = details.reduce((sum, item) => sum + item.remaining, 0);
  return { clientId: client.id, orders: details, total, paid, remaining, openOrders: details.filter((item) => item.remaining > 0), status: remaining > 0 ? 'a_relancer' : total > 0 ? 'actif' : (client.statut || 'prospect') };
}

export function consolidateFinance({ transactions = [], salesOrders = [], payments = [], fournisseurs = [], stocks = [], animaux = [], lots = [], cultures = [], sante = [], alimentationLogs = [], investissements = [], equipements = [], businessEvents = [] } = {}) {
  const orders = arr(salesOrders).filter((order) => !isCancelled(order));
  const txRows = arr(transactions).filter((tx) => Math.abs(amountOf(tx)) > 0 && !isCancelled(tx));
  const paymentRows = arr(payments).filter((payment) => paymentAmount(payment) > 0 && !isCancelled(payment));
  const lossEvents = arr(businessEvents).filter((event) => isLossEvent(event) && eventAmount(event) > 0 && !isCancelled(event));
  const derivedCharges = deriveBusinessCharges({ animaux, lots, cultures, stocks, fournisseurs, sante, alimentationLogs, investissements, equipements, businessEvents });
  const lossEventMap = new Map();
  lossEvents.forEach((event) => {
    const key = keyForLossEvent(event);
    const existing = lossEventMap.get(key);
    if (!existing || eventAmount(event) >= eventAmount(existing)) lossEventMap.set(key, event);
  });
  const uniqueLossEvents = Array.from(lossEventMap.values());
  const lossCharges = uniqueLossEvents.reduce((sum, event) => sum + eventAmount(event), 0);
  const orderSettlements = orders.map((order) => ({ order, ...calculateOrderSettlement(order, paymentRows) }));
  const caFacture = orderSettlements.reduce((sum, item) => sum + item.total, 0);
  const cashOrders = orderSettlements.reduce((sum, item) => sum + item.paid, 0);
  const creancesCommandes = orderSettlements.reduce((sum, item) => sum + item.remaining, 0);
  const overpaidOrders = orderSettlements.reduce((sum, item) => sum + item.overpaid, 0);
  const transactionMap = new Map();
  txRows.forEach((tx) => {
    const key = keyForTransaction(tx);
    const existing = transactionMap.get(key);
    if (!existing || Math.abs(amountOf(tx)) >= Math.abs(amountOf(existing))) transactionMap.set(key, tx);
  });
  const uniqueTransactions = Array.from(transactionMap.values());
  const txCashIn = uniqueTransactions.filter((tx) => isIn(tx) && isPaid(tx) && isSalesLikeTx(tx)).reduce((sum, tx) => sum + amountOf(tx), 0);
  const otherCashIn = uniqueTransactions.filter((tx) => isIn(tx) && isPaid(tx) && !isSalesLikeTx(tx)).reduce((sum, tx) => sum + amountOf(tx), 0);
  const txReceivables = uniqueTransactions.filter(isReceivableTx).reduce((sum, tx) => sum + amountOf(tx), 0);
  const txExpenses = uniqueTransactions.filter(isOut).reduce((sum, tx) => sum + amountOf(tx), 0);
  const paidExpenses = uniqueTransactions.filter((tx) => isOut(tx) && isPaid(tx)).reduce((sum, tx) => sum + amountOf(tx), 0);
  const supplierDebt = arr(fournisseurs).reduce((sum, supplier) => sum + toNumber(supplier.dettes ?? supplier.dette ?? supplier.solde_du ?? supplier.montant_du), 0);
  const stockValue = arr(stocks).reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.prixUnit ?? item.prixunit ?? item.unit_price), 0);
  const orphanPayments = paymentRows.filter((payment) => !paymentOrderId(payment));
  const orphanPaymentsTotal = orphanPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const salesCashRaw = Math.max(cashOrders, txCashIn);
  const cashEncaisse = caFacture > 0 ? Math.min(caFacture, salesCashRaw) : salesCashRaw;
  const creancesReelles = Math.max(0, caFacture - cashEncaisse, creancesCommandes);
  const caConsolide = caFacture;
  const chargesMetier = Math.max(txExpenses, derivedCharges.total);
  const chargesEngagees = chargesMetier + lossCharges;
  const chargesPayees = paidExpenses > 0 ? paidExpenses : Math.max(0, Math.min(chargesMetier, derivedCharges.total));
  const cashNet = cashEncaisse + otherCashIn + orphanPaymentsTotal - chargesPayees;
  const margeReelle = caConsolide - chargesEngagees;
  const warnings = [];
  if (orphanPayments.length) warnings.push(`${orphanPayments.length} paiement(s) non rattache(s) a une commande`);
  if (overpaidOrders > 0) warnings.push(`${overpaidOrders} FCFA d'encaissement dépasse le montant de commandes liées`);
  if (txReceivables > 0 && creancesCommandes > 0) warnings.push('Creances presentes dans commandes et transactions: anti-doublon applique');
  if (lossCharges > 0) warnings.push(`${lossCharges} FCFA de pertes consignées intégrées aux charges non cash`);
  if (txExpenses <= 0 && derivedCharges.total > 0) warnings.push('Charges Finance absentes: charges métier estimées depuis animaux, avicole, cultures, santé, alimentation, stock, fournisseurs, investissements ou équipements');
  if (derivedCharges.total <= 0 && (arr(animaux).length || arr(lots).length || arr(cultures).length || arr(stocks).length || arr(sante).length || arr(alimentationLogs).length || arr(investissements).length || arr(equipements).length)) warnings.push('Charges métier à zéro malgré activités présentes: vérifier coûts achat, alimentation, santé, cultures, stock, investissements et équipements');
  return {
    caFacture,
    caConsolide,
    cashEncaisse,
    otherCashIn,
    orphanPaymentsTotal,
    creancesReelles,
    chargesEngagees,
    chargesPayees,
    chargesMetier,
    chargesDerivees: derivedCharges.total,
    chargesDeriveesDetail: derivedCharges,
    lossCharges,
    dettesFournisseurs: supplierDebt,
    stockValue,
    cashNet,
    margeReelle,
    marginRate: caConsolide > 0 ? Number(((margeReelle / caConsolide) * 100).toFixed(1)) : 0,
    orderSettlements,
    uniqueTransactions,
    uniqueLossEvents,
    orphanPayments,
    warnings,
  };
}
