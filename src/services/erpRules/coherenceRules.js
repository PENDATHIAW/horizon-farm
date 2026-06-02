import {
  invoiceRequired,
  isDelivered,
  isInvoiced,
  isSaleClosed,
  linkedPaymentsForOrders,
} from '../../modules/commercial/commercialMetrics.js';
import { remainingForOrder } from '../../utils/salesStatuses.js';
import { buildFeedCoherenceAlerts } from '../../utils/stockFreshProduct.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

/** Cohérence inter-modules : vente, achat, mortalité, ponte. */
export function evaluateCoherenceRules(data = {}) {
  const findings = [];
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const linked = linkedPaymentsForOrders(orders, payments);
  const stocks = arr(data.stock || data.stocks);
  const finances = arr(data.finances || data.transactions);
  const lots = arr(data.avicole || data.lots);
  const feedLogs = arr(data.alimentation_logs || data.alimentationLogs);
  const eggLogs = arr(data.production_oeufs_logs || data.productionLogs);

  orders.forEach((order) => {
    const total = amount(order);
    if (total <= 0 || isSaleClosed(order, linked)) return;
    const rest = remainingForOrder(order, linked);
    if (rest > 0) {
      findings.push({ id: `coh-sale-unpaid-${order.id}`, module: 'commercial', severity: 'haute', category: 'coherence', title: `Vente sans paiement complet : ${order.client_nom || order.id}`, description: `Reste ${rest} FCFA`, recommended_action: 'Encaisser ou créer tâche de relance', confidence_score: 0.92, auto_action: 'create_task' });
    }
    if (invoiceRequired(order) && !isInvoiced(order)) {
      findings.push({ id: `coh-sale-no-invoice-${order.id}`, module: 'commercial', severity: 'moyenne', category: 'coherence', title: `Vente sans facture : ${order.id}`, description: 'Facture non émise', recommended_action: 'Créer facture manquante', confidence_score: 0.88, auto_action: 'create_alert' });
    }
    if (!isDelivered(order)) {
      findings.push({ id: `coh-sale-no-delivery-${order.id}`, module: 'commercial', severity: 'moyenne', category: 'coherence', title: `Vente sans livraison : ${order.id}`, description: 'Livraison non confirmée', recommended_action: 'Mettre à jour le statut livraison', confidence_score: 0.85, auto_action: 'create_task' });
    }
  });

  finances.filter((trx) => low(trx.type).includes('achat') || low(trx.categorie).includes('achat')).forEach((trx) => {
    const linked = stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) || trx.stock_impact === true;
    if (!linked && amount(trx) > 0) {
      findings.push({ id: `coh-purchase-no-stock-${trx.id}`, module: 'achats_stock', severity: 'moyenne', category: 'coherence', title: `Achat sans impact stock : ${trx.libelle || trx.id}`, description: 'Aucun mouvement stock lié', recommended_action: 'Enregistrer entrée stock', confidence_score: 0.9, auto_action: 'create_alert' });
    }
  });

  lots.forEach((lot) => {
    const mortality = n(lot.mortality ?? lot.mortalite);
    const count = n(lot.current_count ?? lot.effectif);
    if (mortality > 0 && count <= 0) {
      findings.push({ id: `coh-mortality-no-headcount-${lot.id}`, module: 'elevage', severity: 'haute', category: 'coherence', title: `Mortalité sans effectif : ${lot.name || lot.id}`, description: 'Mortalité enregistrée mais effectif à 0', recommended_action: 'Corriger effectif lot', confidence_score: 0.93, auto_action: 'create_task' });
    }
    if (mortality > 0 && count > 0 && mortality > count) {
      findings.push({ id: `coh-mortality-exceeds-${lot.id}`, module: 'elevage', severity: 'haute', category: 'coherence', title: `Mortalité supérieure à l'effectif : ${lot.name || lot.id}`, description: `${mortality} mortalité(s) pour ${count} tête(s)`, recommended_action: 'Réconcilier mortalité et effectif', confidence_score: 0.91, auto_action: 'create_alert' });
    }
  });

  const recentEggs = eggLogs.slice(0, 7).reduce((s, r) => s + n(r.oeufs_produits ?? r.eggs_count), 0);
  const eggStock = stocks.filter((s) => /oeuf|egg|plateau/i.test(String(s.produit || s.nom || '')));
  if (recentEggs > 0 && !eggStock.length) {
    findings.push({ id: 'coh-eggs-no-stock', module: 'elevage', severity: 'moyenne', category: 'coherence', title: 'Ponte sans impact stock œufs', description: `${recentEggs} œuf(s) produits sans ligne stock œufs`, recommended_action: 'Mettre à jour stock production œufs', confidence_score: 0.86, auto_action: 'create_alert' });
  }
  if (recentEggs > 0 && !feedLogs.length && !stocks.some((s) => /aliment|feed|provende/i.test(String(s.produit || s.nom || '')))) {
    findings.push({ id: 'coh-eggs-no-feed-stock', module: 'elevage', severity: 'moyenne', category: 'coherence', title: 'Ponte sans stock aliment visible', description: 'Production d\'œufs sans trace aliment/stock', recommended_action: 'Vérifier consommation et stock aliment', confidence_score: 0.8, auto_action: 'create_alert' });
  }

  buildFeedCoherenceAlerts({ stocks, lots }).forEach((alert) => {
    findings.push({
      id: alert.id,
      module: 'elevage',
      severity: alert.severity === 'red' ? 'haute' : 'moyenne',
      category: 'coherence',
      title: alert.title,
      description: alert.detail,
      recommended_action: 'Distribuer ou réapprovisionner l’aliment',
      confidence_score: alert.severity === 'red' ? 0.9 : 0.82,
      auto_action: 'create_alert',
    });
  });

  return findings;
}
