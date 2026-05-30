const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const isDelivered = (r = {}) => ['livre', 'livré', 'delivered', 'termine', 'terminé'].includes(low(r.delivery_status || r.statut_livraison || r.status));
const isInvoiced = (r = {}) => r.invoice_id || r.facture_id || ['facture', 'facturé', 'invoiced'].includes(low(r.invoice_status || r.facture_status));
const paidOf = (order, payments) => n(order.montant_paye) || arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + amount(p), 0);

/** Cohérence inter-modules : vente, achat, mortalité, ponte. */
export function evaluateCoherenceRules(data = {}) {
  const findings = [];
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const stocks = arr(data.stock || data.stocks);
  const finances = arr(data.finances || data.transactions);
  const lots = arr(data.avicole || data.lots);
  const feedLogs = arr(data.alimentation_logs || data.alimentationLogs);
  const eggLogs = arr(data.production_oeufs_logs || data.productionLogs);

  orders.forEach((order) => {
    const total = amount(order);
    const paid = paidOf(order, payments);
    if (total > 0 && paid < total) {
      findings.push({ id: `coh-sale-unpaid-${order.id}`, module: 'commercial', severity: 'haute', category: 'coherence', title: `Vente sans paiement complet : ${order.client_nom || order.id}`, description: `Reste ${total - paid} FCFA`, recommended_action: 'Encaisser ou créer tâche de relance', confidence_score: 0.92, auto_action: 'create_task' });
    }
    if (!isInvoiced(order)) {
      findings.push({ id: `coh-sale-no-invoice-${order.id}`, module: 'commercial', severity: 'moyenne', category: 'coherence', title: `Vente sans facture : ${order.id}`, description: 'Facture non émise', recommended_action: 'Créer facture manquante', confidence_score: 0.88, auto_action: 'create_alert' });
    }
    if (!isDelivered(order) && total > 0) {
      findings.push({ id: `coh-sale-no-delivery-${order.id}`, module: 'commercial', severity: 'moyenne', category: 'coherence', title: `Vente sans livraison : ${order.id}`, description: 'Livraison non confirmée', recommended_action: 'Mettre à jour le statut livraison', confidence_score: 0.85 });
    }
  });

  finances.filter((trx) => low(trx.type).includes('achat') || low(trx.categorie).includes('achat')).forEach((trx) => {
    const linked = stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) || trx.stock_impact === true;
    if (!linked && amount(trx) > 0) {
      findings.push({ id: `coh-purchase-no-stock-${trx.id}`, module: 'achats_stock', severity: 'moyenne', category: 'coherence', title: `Achat sans impact stock : ${trx.libelle || trx.id}`, description: 'Aucun mouvement stock lié', recommended_action: 'Enregistrer entrée stock', confidence_score: 0.9 });
    }
  });

  lots.forEach((lot) => {
    const mortality = n(lot.mortality ?? lot.mortalite);
    const count = n(lot.current_count ?? lot.effectif);
    if (mortality > 0 && count <= 0) {
      findings.push({ id: `coh-mortality-no-headcount-${lot.id}`, module: 'elevage', severity: 'haute', category: 'coherence', title: `Mortalité sans effectif : ${lot.name || lot.id}`, description: 'Mortalité enregistrée mais effectif à 0', recommended_action: 'Corriger effectif lot', confidence_score: 0.93 });
    }
  });

  const recentEggs = eggLogs.slice(0, 7).reduce((s, r) => s + n(r.oeufs_produits ?? r.eggs_count), 0);
  if (recentEggs > 0 && !feedLogs.length && !stocks.some((s) => /aliment|feed|provende/i.test(String(s.produit || s.nom || '')))) {
    findings.push({ id: 'coh-eggs-no-feed-stock', module: 'elevage', severity: 'moyenne', category: 'coherence', title: 'Ponte sans stock aliment visible', description: 'Production d\'œufs sans trace aliment/stock', recommended_action: 'Vérifier consommation et stock aliment', confidence_score: 0.8 });
  }

  return findings;
}
