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
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total ?? r.total_amount);
const clean = (v) => String(v || '').trim();
const norm = (v) => clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const rowText = (row = {}) => norm(Object.values(row || {}).filter((v) => typeof v !== 'object').join(' '));
const meta = (row = {}) => (row.metadata && typeof row.metadata === 'object' ? row.metadata : {});
const firstValue = (row = {}, keys = []) => keys.map((key) => row[key] ?? meta(row)[key]).find((v) => v != null && v !== '');
const linkedTo = (row = {}, id) => {
  const value = String(id || '');
  if (!value) return false;
  return [
    row.id,
    row.order_id,
    row.sale_id,
    row.source_id,
    row.source_record_id,
    row.related_id,
    row.entity_id,
    row.linked_entity_id,
    row.stock_id,
    row.lot_id,
    row.animal_id,
    row.parcel_id,
    meta(row).sales_order_id,
    meta(row).sale_id,
    meta(row).stock_id,
    meta(row).lot_id,
    meta(row).animal_id,
    meta(row).parcel_id,
  ].some((candidate) => String(candidate || '') === value);
};

function pushFinding(findings, finding) {
  findings.push({
    confidence_score: 0.86,
    category: 'coherence',
    ...finding,
  });
}

function hasDocumentFor(docs = [], id) {
  return docs.some((doc) => linkedTo(doc, id));
}

function hasTaskFor(tasks = [], id) {
  return tasks.some((task) => linkedTo(task, id) && !['done', 'cloturee', 'clôturée', 'closed', 'terminee', 'terminée'].includes(norm(task.status || task.statut)));
}

/** Cohérence inter-modules : vente, achat, mortalité, ponte, cultures, biosécurité, financeur, équipement. */
export function evaluateCoherenceRules(data = {}) {
  const findings = [];
  const orders = arr(data.sales_orders || data.salesOrders);
  const orderItems = arr(data.sales_order_items || data.orderItems);
  const payments = arr(data.payments);
  const linked = linkedPaymentsForOrders(orders, payments);
  const stocks = arr(data.stock || data.stocks);
  const stockMovements = arr(data.stock_movements || data.stockMovements);
  const finances = arr(data.finances || data.transactions);
  const lots = arr(data.avicole || data.lots);
  const animals = arr(data.animaux || data.animals);
  const feedLogs = arr(data.alimentation_logs || data.alimentationLogs);
  const eggLogs = arr(data.production_oeufs_logs || data.productionLogs);
  const cultures = arr(data.cultures || data.parcelles || data.crop_campaigns);
  const tasks = arr(data.taches || data.tasks);
  const alerts = arr(data.alertes_center || data.alertes);
  const docs = arr(data.documents);
  const reports = arr(data.rapports || data.reports);
  const equipment = arr(data.equipements || data.equipment);
  const sensors = arr(data.sensor_devices || data.sensors);
  const businessEvents = arr(data.business_events || data.businessEvents);
  const investments = arr(data.investissements || data.investments);

  orders.forEach((order) => {
    const total = amount(order);
    if (total <= 0 || isSaleClosed(order, linked)) return;
    const rest = remainingForOrder(order, linked);
    if (rest > 0) {
      pushFinding(findings, { id: `coh-sale-unpaid-${order.id}`, module: 'commercial', severity: 'haute', title: `Vente sans paiement complet : ${order.client_nom || order.client_name || order.id}`, description: `Reste ${rest} FCFA`, recommended_action: 'Encaisser ou créer tâche de relance', auto_action: 'create_task', confidence_score: 0.92 });
    }
    if (invoiceRequired(order) && !isInvoiced(order)) {
      pushFinding(findings, { id: `coh-sale-no-invoice-${order.id}`, module: 'commercial', severity: 'moyenne', title: `Vente sans facture : ${order.id}`, description: 'Facture non émise', recommended_action: 'Créer facture manquante', auto_action: 'create_alert', confidence_score: 0.88 });
    }
    if (!isDelivered(order)) {
      pushFinding(findings, { id: `coh-sale-no-delivery-${order.id}`, module: 'commercial', severity: 'moyenne', title: `Vente sans livraison : ${order.id}`, description: 'Livraison non confirmée', recommended_action: 'Mettre à jour le statut livraison', auto_action: 'create_task', confidence_score: 0.85 });
    }

    const items = orderItems.filter((item) => String(item.order_id || item.sales_order_id || '') === String(order.id || ''));
    const hasSource = items.some((item) => firstValue(item, ['source_id', 'stock_id', 'lot_id', 'animal_id', 'parcel_id', 'feed_finished_batch_id']))
      || firstValue(order, ['source_id', 'stock_id', 'lot_id', 'animal_id', 'parcel_id']);
    if (!hasSource) {
      pushFinding(findings, { id: `coh-sale-no-source-${order.id}`, module: 'commercial', severity: 'haute', title: `Vente sans source de production : ${order.id}`, description: 'La vente n’est reliée ni à un stock, ni à un lot, ni à un animal, ni à une parcelle.', recommended_action: 'Relier la vente à sa source pour calculer stock, marge et traçabilité', auto_action: 'create_alert', confidence_score: 0.9 });
    }

    const isDeliveredOrder = isDelivered(order) || ['livree', 'livré', 'livree_partielle'].includes(norm(order.delivery_status || order.statut_livraison || order.status));
    const hasStockExit = stockMovements.some((movement) => linkedTo(movement, order.id) && /sortie|vente|delivery|livraison/i.test(String(movement.movement_type || movement.type || movement.kind || '')));
    if (isDeliveredOrder && !hasStockExit && !items.some((item) => firstValue(item, ['stock_id', 'source_id']))) {
      pushFinding(findings, { id: `coh-sale-no-stock-exit-${order.id}`, module: 'achats_stock', severity: 'haute', title: `Vente livrée sans sortie stock : ${order.id}`, description: 'Aucun mouvement de stock ou ligne source ne justifie la livraison.', recommended_action: 'Créer ou vérifier la sortie stock liée à la vente', auto_action: 'create_alert', confidence_score: 0.88 });
    }
  });

  payments.forEach((payment) => {
    const orderId = firstValue(payment, ['order_id', 'sale_id', 'sales_order_id', 'source_record_id', 'related_id']);
    if (amount(payment) > 0 && orderId && !orders.some((order) => String(order.id) === String(orderId))) {
      pushFinding(findings, { id: `coh-payment-orphan-${payment.id}`, module: 'finance_pilotage', severity: 'haute', title: `Paiement sans vente liée : ${payment.id}`, description: `Paiement de ${amount(payment)} FCFA sans commande existante.`, recommended_action: 'Relier le paiement à une vente ou corriger la référence', auto_action: 'create_alert', confidence_score: 0.9 });
    }
  });

  finances.filter((trx) => low(trx.type).includes('achat') || low(trx.categorie).includes('achat')).forEach((trx) => {
    const stockLinked = stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) || stockMovements.some((m) => linkedTo(m, trx.id)) || trx.stock_impact === true;
    if (!stockLinked && amount(trx) > 0) {
      pushFinding(findings, { id: `coh-purchase-no-stock-${trx.id}`, module: 'achats_stock', severity: 'moyenne', title: `Achat sans impact stock : ${trx.libelle || trx.description || trx.id}`, description: 'Aucun mouvement stock lié', recommended_action: 'Enregistrer entrée stock', auto_action: 'create_alert', confidence_score: 0.9 });
    }
    const important = amount(trx) >= 50000;
    if (important && !hasDocumentFor(docs, trx.id)) {
      pushFinding(findings, { id: `coh-expense-no-doc-${trx.id}`, module: 'documents_rapports', severity: 'haute', title: `Dépense importante sans justificatif : ${trx.libelle || trx.id}`, description: `${amount(trx)} FCFA sans document rattaché.`, recommended_action: 'Ajouter facture, reçu, devis ou photo justificative', auto_action: 'create_task', confidence_score: 0.87 });
    }
  });

  lots.forEach((lot) => {
    const mortality = n(lot.mortality ?? lot.mortalite);
    const count = n(lot.current_count ?? lot.effectif);
    if (mortality > 0 && count <= 0) {
      pushFinding(findings, { id: `coh-mortality-no-headcount-${lot.id}`, module: 'elevage', severity: 'haute', title: `Mortalité sans effectif : ${lot.name || lot.nom || lot.id}`, description: 'Mortalité enregistrée mais effectif à 0', recommended_action: 'Corriger effectif lot', auto_action: 'create_task', confidence_score: 0.93 });
    }
    if (mortality > 0 && count > 0 && mortality > count) {
      pushFinding(findings, { id: `coh-mortality-exceeds-${lot.id}`, module: 'elevage', severity: 'haute', title: `Mortalité supérieure à l’effectif : ${lot.name || lot.nom || lot.id}`, description: `${mortality} mortalité(s) pour ${count} tête(s)`, recommended_action: 'Réconcilier mortalité et effectif', auto_action: 'create_alert', confidence_score: 0.91 });
    }
    const sold = ['sold', 'vendu', 'vendue', 'closed', 'cloture', 'clôturé'].includes(norm(lot.status || lot.statut));
    if (sold && !orderItems.some((item) => String(firstValue(item, ['lot_id', 'source_id'])) === String(lot.id) && n(item.margin ?? item.marge) !== 0)) {
      pushFinding(findings, { id: `coh-lot-sold-no-margin-${lot.id}`, module: 'finance_pilotage', severity: 'haute', title: `Lot vendu sans marge calculée : ${lot.name || lot.id}`, description: 'Le lot est vendu/clôturé mais aucune marge liée n’est visible.', recommended_action: 'Relier ventes, aliment, santé et coûts au lot', auto_action: 'create_alert', confidence_score: 0.88 });
    }
  });

  animals.forEach((animal) => {
    const soldItem = orderItems.find((item) => String(firstValue(item, ['animal_id', 'source_id'])) === String(animal.id));
    const soldOrder = orders.find((order) => String(firstValue(order, ['animal_id', 'source_id'])) === String(animal.id));
    const stillActive = !['vendu', 'vendue', 'sold', 'sorti', 'inactive', 'abattu'].includes(norm(animal.status || animal.statut || animal.etat));
    if ((soldItem || soldOrder) && stillActive) {
      pushFinding(findings, { id: `coh-animal-sold-active-${animal.id}`, module: 'elevage', severity: 'haute', title: `Animal vendu encore actif : ${animal.nom || animal.id}`, description: 'Une vente est liée à cet animal mais sa fiche reste active.', recommended_action: 'Sortir l’animal de l’actif et calculer la marge par tête', auto_action: 'create_task', confidence_score: 0.88 });
    }
    const lastWeighing = firstValue(animal, ['last_weighing_date', 'last_weight_date', 'date_derniere_pesee']);
    const bovine = /bovin|boeuf|bœuf|embouche/i.test(String(animal.type || animal.espece || animal.category || ''));
    if (bovine && !lastWeighing && !businessEvents.some((event) => linkedTo(event, animal.id) && /pesee|pesée|weigh/i.test(rowText(event)))) {
      pushFinding(findings, { id: `coh-bovine-no-weighing-${animal.id}`, module: 'elevage', severity: 'moyenne', title: `Bovin sans pesée récente : ${animal.nom || animal.id}`, description: 'Aucune pesée exploitable pour suivre le gain de poids.', recommended_action: 'Programmer une pesée et recalculer coût/kg gagné', auto_action: 'create_task', confidence_score: 0.8 });
    }
  });

  const recentEggs = eggLogs.slice(0, 7).reduce((s, r) => s + n(r.oeufs_produits ?? r.eggs_count ?? r.plateaux ?? r.trays_count), 0);
  const eggStock = stocks.filter((s) => s.categorie === 'produit_fini_oeufs' || /oeuf|œuf|egg|plateau|tablette/i.test(String(s.produit || s.nom || s.product_name || '')));
  if (recentEggs > 0 && !eggStock.length) {
    pushFinding(findings, { id: 'coh-eggs-no-stock', module: 'elevage', severity: 'moyenne', title: 'Ponte sans impact stock œufs', description: `${recentEggs} unité(s) produite(s) sans ligne stock œufs`, recommended_action: 'Mettre à jour stock production œufs', auto_action: 'create_alert', confidence_score: 0.86 });
  }
  if (recentEggs > 0 && !feedLogs.length && !stocks.some((s) => /aliment|feed|provende/i.test(String(s.produit || s.nom || '')))) {
    pushFinding(findings, { id: 'coh-eggs-no-feed-stock', module: 'elevage', severity: 'moyenne', title: 'Ponte sans stock aliment visible', description: 'Production d’œufs sans trace aliment/stock', recommended_action: 'Vérifier consommation et stock aliment', auto_action: 'create_alert', confidence_score: 0.8 });
  }

  cultures.forEach((crop) => {
    const active = !['closed', 'cloturee', 'clôturée', 'terminee', 'terminée', 'inactive'].includes(norm(crop.status || crop.statut));
    if (active && !firstValue(crop, ['parcel_id', 'parcelle_id', 'surface', 'culture_type'])) {
      pushFinding(findings, { id: `coh-crop-incomplete-${crop.id}`, module: 'cultures', severity: 'moyenne', title: `Culture active incomplète : ${crop.nom || crop.id}`, description: 'Parcelle, surface ou type de culture manquant.', recommended_action: 'Compléter la campagne pour calculer coût et rendement', auto_action: 'create_task', confidence_score: 0.82 });
    }
  });

  businessEvents.forEach((event) => {
    const text = rowText(event);
    const eventId = event.id || `${event.event_type || 'event'}-${event.created_at || event.date || ''}`;
    if (/nettoyage|biosecurite|biosécurité|cleaning|litiere|litière/.test(text)) {
      const bags = n(firstValue(event, ['bags_collected', 'sacs_collectes', 'sacs_collectés', 'nombre_sacs']));
      const destination = firstValue(event, ['destination', 'next_destination', 'destination_type']);
      const nextStep = firstValue(event, ['next_step', 'prochaine_etape', 'prochaine_étape']);
      if (bags <= 0) {
        pushFinding(findings, { id: `coh-cleaning-no-bags-${eventId}`, module: 'elevage', severity: 'haute', title: 'Nettoyage sans sacs collectés', description: 'Le nettoyage ne précise pas le nombre de sacs de fientes, fumier ou litière collectés.', recommended_action: 'Renseigner sacs collectés et poids estimé par sac', auto_action: 'create_task', confidence_score: 0.92 });
      }
      if (!destination || !nextStep) {
        pushFinding(findings, { id: `coh-cleaning-no-next-step-${eventId}`, module: 'activite_suivi', severity: 'haute', title: 'Nettoyage sans destination ou prochaine étape', description: 'La matière collectée doit aller vers compostage, stockage, parcelle ou évacuation.', recommended_action: 'Choisir destination et prochaine étape biosécurité', auto_action: 'create_task', confidence_score: 0.9 });
      }
    }

    if (/fiente|fumier|litiere|litière|compost|effluent|organic/.test(text)) {
      const origin = firstValue(event, ['origin_id', 'origine', 'source_id', 'building_id']);
      const destination = firstValue(event, ['destination_parcel_id', 'parcel_id', 'destination', 'parcelle_id']);
      const sanitaryStatus = norm(firstValue(event, ['sanitary_status', 'statut_sanitaire', 'health_status']) || 'normal');
      if (!origin || !destination) {
        pushFinding(findings, { id: `coh-organic-no-route-${eventId}`, module: 'cultures', severity: 'moyenne', title: 'Matière organique sans origine ou destination', description: 'La chaîne origine → stockage/compostage/parcelle est incomplète.', recommended_action: 'Renseigner origine, destination et statut sanitaire', auto_action: 'create_alert', confidence_score: 0.86 });
      }
      if (/suspect|contamine|contaminé|maladie|doute/.test(sanitaryStatus) && /parcelle|culture|tomate|salade/.test(String(destination || '').toLowerCase())) {
        pushFinding(findings, { id: `coh-organic-suspect-to-crop-${eventId}`, module: 'cultures', severity: 'haute', title: 'Matière suspecte envoyée vers culture', description: 'Une matière au statut sanitaire suspect ne doit pas être valorisée en parcelle sans validation.', recommended_action: 'Bloquer la valorisation et créer contrôle sanitaire', auto_action: 'create_alert', confidence_score: 0.94 });
      }
    }

    if (/irrigation|eau|water/.test(text)) {
      const parcelId = firstValue(event, ['parcel_id', 'parcelle_id', 'destination_parcel_id']);
      if (parcelId && !cultures.some((crop) => String(crop.id || crop.parcel_id || crop.parcelle_id) === String(parcelId))) {
        pushFinding(findings, { id: `coh-irrigation-no-crop-${eventId}`, module: 'cultures', severity: 'moyenne', title: 'Irrigation sans culture active liée', description: 'Une consommation d’eau est enregistrée sans campagne ou parcelle active.', recommended_action: 'Relier l’irrigation à une parcelle active ou corriger la donnée', auto_action: 'create_alert', confidence_score: 0.82 });
      }
    }
  });

  equipment.forEach((item) => {
    const broken = /panne|hs|broken|maintenance_urgente|indisponible/.test(norm(item.status || item.statut || item.etat));
    if (broken && !hasTaskFor(tasks, item.id)) {
      pushFinding(findings, { id: `coh-equipment-broken-no-task-${item.id}`, module: 'equipements', severity: 'haute', title: `Équipement en panne sans tâche : ${item.nom || item.name || item.id}`, description: 'Aucune tâche ouverte ne suit la panne.', recommended_action: 'Créer tâche maintenance et rattacher coût si réparation', auto_action: 'create_task', confidence_score: 0.89 });
    }
  });

  investments.forEach((investment) => {
    const funding = /financement|der|subvention|pret|prêt|loan/.test(rowText(investment));
    if (funding && !hasDocumentFor(docs, investment.id)) {
      pushFinding(findings, { id: `coh-funding-no-doc-${investment.id}`, module: 'financements', severity: 'haute', title: `Financement sans justificatif : ${investment.libelle || investment.name || investment.id}`, description: 'Une ligne de financement ou investissement n’a pas de document lié.', recommended_action: 'Joindre convention, facture, reçu ou preuve d’utilisation', auto_action: 'create_task', confidence_score: 0.86 });
    }
  });

  reports.forEach((report) => {
    const financeur = /financeur|investisseur|mensuel|reporting/.test(rowText(report));
    if (financeur) {
      const required = [orders.length, payments.length, finances.length, stocks.length].filter((count) => count > 0).length;
      if (required < 3) {
        pushFinding(findings, { id: `coh-report-weak-source-${report.id}`, module: 'documents_rapports', severity: 'haute', title: `Rapport financeur avec données sources faibles : ${report.title || report.id}`, description: 'Le rapport devrait s’appuyer au minimum sur ventes, paiements, finances et stock.', recommended_action: 'Compléter les données sources avant diffusion', auto_action: 'create_alert', confidence_score: 0.87 });
      }
    }
  });

  sensors.forEach((sensor) => {
    const status = norm(sensor.status || sensor.statut || sensor.state);
    if (['offline', 'muet', 'hs', 'inactive'].includes(status) && !hasTaskFor(tasks, sensor.id)) {
      pushFinding(findings, { id: `coh-sensor-offline-no-task-${sensor.id}`, module: 'smartfarm', severity: 'moyenne', title: `Capteur muet sans tâche : ${sensor.nom || sensor.name || sensor.id}`, description: 'Un capteur inactif devrait créer une vérification terrain.', recommended_action: 'Créer tâche de contrôle capteur ou équipement', auto_action: 'create_task', confidence_score: 0.82 });
    }
  });

  alerts.forEach((alert) => {
    const critical = /critique|haute|urgent|critical|high/.test(norm(alert.severity || alert.gravite || alert.priority || alert.priorite));
    const closed = /closed|resolue|résolue|traitee|traitée|archive/.test(norm(alert.status || alert.statut));
    if (critical && !closed && !hasTaskFor(tasks, alert.id)) {
      pushFinding(findings, { id: `coh-critical-alert-no-task-${alert.id}`, module: 'activite_suivi', severity: 'haute', title: `Alerte critique sans tâche : ${alert.title || alert.titre || alert.id}`, description: 'Une alerte critique doit être transformée en action assignée.', recommended_action: 'Créer une tâche, assigner un responsable et une date', auto_action: 'create_task', confidence_score: 0.9 });
    }
  });

  buildFeedCoherenceAlerts({ stocks, lots }).forEach((alert) => {
    pushFinding(findings, {
      id: alert.id,
      module: 'elevage',
      severity: alert.severity === 'red' ? 'haute' : 'moyenne',
      title: alert.title,
      description: alert.detail,
      recommended_action: 'Distribuer ou réapprovisionner l’aliment',
      confidence_score: alert.severity === 'red' ? 0.9 : 0.82,
      auto_action: 'create_alert',
    });
  });

  return findings;
}
