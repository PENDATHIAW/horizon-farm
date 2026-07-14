import { toNumber } from './format.js';
import { financeIds, documentIds } from './sideEffectIds.js';
import { findExistingFinanceForPayment } from '../services/salesIntegrityService.js';
import { findHealthFinance } from '../services/healthIntegrityService.js';
import { linkedTaskForAlert, criticalAlert, closedAlert } from '../services/taskAlertIntegrityService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const dateOf = (row = {}) => row.updated_at || row.created_at || row.date || row.event_date || null;



function hasStockMovementEvent(events = [], stockId = '') {
  const target = clean(stockId);
  return arr(events).some((evt) => {
    const entity = clean(evt.entity_id || evt.linked_stock_id || evt.stock_id);
    const type = lower(evt.event_type || evt.type || '');
    return entity === target && /mouvement_stock|reception_stock|sortie_stock|stock/.test(type);
  });
}

function buildResult(recipe, partial = {}) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    expectedObjects: recipe.expectedObjects,
    sourceModule: recipe.sourceModule,
    sourceTab: recipe.sourceTab || null,
    status: 'untested',
    lastTestedAt: null,
    anchor: null,
    createdObjects: [],
    missingObjects: [],
    details: '',
    manualNote: '',
    ...partial,
  };
}

function finalizeResult(recipe, partial = {}) {
  const created = arr(partial.createdObjects);
  const missing = arr(partial.missingObjects);
  let status = partial.status || 'untested';
  if (status !== 'manual_ok') {
    if (!partial.anchor && missing.length === 0 && created.length === 0) status = 'untested';
    else if (missing.length === 0 && created.length > 0) status = 'ok';
    else if (partial.anchor || missing.length > 0) status = 'error';
  }
  return buildResult(recipe, {
    ...partial,
    status,
    lastTestedAt: partial.lastTestedAt || dateOf(partial.anchor) || new Date().toISOString(),
    createdObjects: created,
    missingObjects: missing,
  });
}

export const WORKFLOW_QUALITY_RECIPES = [
  {
    id: 'achat_stock_paye',
    title: 'Achat stock payé',
    description: 'Réception stock avec paiement immédiat et justificatif.',
    expectedObjects: ['stock', 'stock_movement', 'finance', 'document', 'business_event'],
    sourceModule: 'achats_stock',
    sourceTab: 'Stock',
  },
  {
    id: 'achat_stock_credit',
    title: 'Achat stock à crédit',
    description: 'Réception stock avec dette fournisseur ouverte.',
    expectedObjects: ['stock', 'stock_movement', 'dette_fournisseur'],
    sourceModule: 'achats_stock',
    sourceTab: 'Fournisseurs',
  },
  {
    id: 'vente_payee',
    title: 'Vente payée',
    description: 'Commande encaissée avec impacts finance, stock et facture.',
    expectedObjects: ['sales_order', 'payment', 'finance', 'sortie_stock', 'facture_document'],
    sourceModule: 'commercial',
    sourceTab: 'Ventes',
  },
  {
    id: 'vente_credit',
    title: 'Vente crédit',
    description: 'Commande avec créance client sans encaissement immédiat.',
    expectedObjects: ['sales_order', 'creance'],
    sourceModule: 'commercial',
    sourceTab: 'Clients',
  },
  {
    id: 'distribution_aliment',
    title: 'Distribution aliment',
    description: 'Consommation aliment liée au stock et au coût lot.',
    expectedObjects: ['alimentation_log', 'sortie_stock', 'cout_lot', 'stock_movement'],
    sourceModule: 'elevage',
    sourceTab: 'Alimentation',
  },
  {
    id: 'soin_vaccin',
    title: 'Soin / vaccin',
    description: 'Intervention santé avec produit, coût et rappel.',
    expectedObjects: ['soin', 'sortie_produit_sante', 'rappel_tache', 'cout_sante'],
    sourceModule: 'elevage',
    sourceTab: 'Santé',
  },
  {
    id: 'mortalite',
    title: 'Mortalité',
    description: 'Perte d’effectif avec impact perte et alerte si seuil.',
    expectedObjects: ['effectif_diminue', 'perte', 'alerte_seuil'],
    sourceModule: 'elevage',
    sourceTab: 'Avicole',
  },
  {
    id: 'production_oeufs',
    title: 'Production œufs',
    description: 'Ramassage lié au stock œufs et mouvement stock.',
    expectedObjects: ['production_log', 'entree_stock_oeufs', 'stock_movement'],
    sourceModule: 'elevage',
    sourceTab: 'Avicole',
  },
  {
    id: 'recolte_culture',
    title: 'Récolte culture',
    description: 'Récolte disponible en stock vendable.',
    expectedObjects: ['stock_vendable', 'stock_movement'],
    sourceModule: 'cultures',
    sourceTab: 'Récoltes',
  },
  {
    id: 'document_orphelin',
    title: 'Document orphelin',
    description: 'Justificatif sans source métier - liaison ou résolution attendue.',
    expectedObjects: ['preuve_liee', 'ecart_resolu'],
    sourceModule: 'documents_rapports',
    sourceTab: 'Documents',
  },
  {
    id: 'alerte_critique',
    title: 'Alerte critique',
    description: 'Alerte urgente avec tâche liée et notification unique.',
    expectedObjects: ['alerte', 'tache_liee', 'push_unique', 'resolution_possible'],
    sourceModule: 'activite_suivi',
    sourceTab: 'Alertes',
  },
];

function verifyPurchasePaid(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[0];
  const stocks = arr(dataMap.stock);
  const finances = arr(dataMap.finances);
  const documents = arr(dataMap.documents);
  const events = arr(dataMap.business_events);
  const candidate = finances.find((trx) => {
    const id = clean(trx.id);
    return id.startsWith('TRX-ACHAT-') && lower(trx.statut || trx.status || 'paye') === 'paye';
  }) || finances.find((trx) => lower(trx.created_from || '') === 'purchase_side_effects' && lower(trx.statut || trx.status || 'paye') === 'paye');

  if (!candidate) return buildResult(recipe);

  const stockId = clean(candidate.stock_id || candidate.related_id || candidate.source_record_id);
  const stock = stocks.find((row) => clean(row.id) === stockId);
  const docId = documentIds.purchase(stockId, '');
  const document = documents.find((row) => clean(row.id).includes(`DOC-ACHAT-${stockId}`) || clean(row.entity_id) === stockId);
  const movement = hasStockMovementEvent(events, stockId);
  const event = events.find((row) => clean(row.entity_id) === stockId && /stock|achat|reception/.test(lower(`${row.event_type || ''} ${row.title || ''}`)));

  const created = [];
  const missing = [];
  if (stock) created.push({ key: 'stock', label: 'Stock', id: stock.id });
  else missing.push({ key: 'stock', label: 'Stock', detail: stockId || 'introuvable' });
  if (movement || event) created.push({ key: 'stock_movement', label: 'Mouvement stock', id: event?.id });
  else missing.push({ key: 'stock_movement', label: 'Mouvement stock' });
  created.push({ key: 'finance', label: 'Finance achat', id: candidate.id });
  if (document) created.push({ key: 'document', label: 'Justificatif achat', id: document.id });
  else missing.push({ key: 'document', label: 'Justificatif achat', detail: docId });
  if (event) created.push({ key: 'business_event', label: 'Événement métier', id: event.id });
  else missing.push({ key: 'business_event', label: 'Événement métier' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: stock ? `Achat ${stock.produit || stockId}` : `Finance ${candidate.id}`,
  });
}

function verifyPurchaseCredit(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[1];
  const finances = arr(dataMap.finances);
  const stocks = arr(dataMap.stock);
  const events = arr(dataMap.business_events);
  const candidate = finances.find((trx) => clean(trx.id).startsWith('TRX-DETTE-FOUR-'))
    || finances.find((trx) => ['impaye', 'impayé', 'partiel', 'a_payer'].includes(lower(trx.statut || trx.status)) && (trx.fournisseur_id || /fournisseur|dette/.test(lower(`${trx.libelle || ''} ${trx.categorie || ''}`))));

  if (!candidate) return buildResult(recipe);

  const stockId = clean(candidate.stock_id || candidate.related_id || candidate.source_record_id);
  const stock = stocks.find((row) => clean(row.id) === stockId) || stocks.find((row) => clean(row.fournisseur_id) === clean(candidate.fournisseur_id));
  const movement = hasStockMovementEvent(events, stock?.id || stockId);

  const created = [{ key: 'dette_fournisseur', label: 'Dette fournisseur', id: candidate.id }];
  const missing = [];
  if (stock) created.push({ key: 'stock', label: 'Stock', id: stock.id });
  else missing.push({ key: 'stock', label: 'Stock lié' });
  if (movement) created.push({ key: 'stock_movement', label: 'Mouvement stock' });
  else missing.push({ key: 'stock_movement', label: 'Mouvement stock' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: candidate.libelle || candidate.id,
  });
}

function verifySalePaid(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[2];
  const orders = arr(dataMap.sales_orders);
  const payments = arr(dataMap.payments);
  const finances = arr(dataMap.finances);
  const invoices = arr(dataMap.invoices);
  const documents = arr(dataMap.documents);
  const events = arr(dataMap.business_events);

  for (const order of orders) {
    const orderId = clean(order.id);
    const orderPayments = payments.filter((row) => clean(row.order_id || row.sale_id || row.related_id) === orderId);
    const paidPayment = orderPayments.find((payment) => findExistingFinanceForPayment({
      orderId,
      paymentId: payment.id,
      amount: num(payment.montant ?? payment.amount),
      date: payment.date || payment.date_paiement,
      method: payment.moyen_paiement || payment.payment_method,
      transactions: finances,
    }));
    if (!paidPayment) continue;

    const finance = findExistingFinanceForPayment({
      orderId,
      paymentId: paidPayment.id,
      amount: num(paidPayment.montant ?? paidPayment.amount),
      transactions: finances,
    });
    const invoice = invoices.find((row) => clean(row.order_id || row.sale_id || row.related_id) === orderId)
      || documents.find((row) => clean(row.related_id || row.entity_id) === orderId);
    const stockOut = events.find((row) => clean(row.order_id || row.related_id || row.source_record_id) === orderId && /sortie_stock|stock|livraison/.test(lower(`${row.event_type || ''} ${row.title || ''}`)));

    const created = [
      { key: 'sales_order', label: 'Commande', id: order.id },
      { key: 'payment', label: 'Paiement', id: paidPayment.id },
      { key: 'finance', label: 'Encaissement finance', id: finance?.id },
    ];
    const missing = [];
    if (!finance) missing.push({ key: 'finance', label: 'Encaissement finance' });
    if (invoice) created.push({ key: 'facture_document', label: 'Facture / document', id: invoice.id });
    else missing.push({ key: 'facture_document', label: 'Facture / document' });
    if (stockOut) created.push({ key: 'sortie_stock', label: 'Sortie stock', id: stockOut.id });
    else missing.push({ key: 'sortie_stock', label: 'Sortie stock', detail: 'Optionnel si vente de service' });

    return finalizeResult(recipe, {
      anchor: order,
      createdObjects: created,
      missingObjects: missing.filter((item) => item.key !== 'sortie_stock' || num(order.stock_id || order.product_stock_id) > 0),
      details: order.client_nom || order.customer_name || orderId,
    });
  }
  return buildResult(recipe);
}

function verifySaleCredit(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[3];
  const orders = arr(dataMap.sales_orders);
  const finances = arr(dataMap.finances);
  const candidate = orders.find((order) => {
    const orderId = clean(order.id);
    const receivable = finances.find((trx) => clean(trx.id) === financeIds.receivable(orderId) || (clean(trx.order_id || trx.related_id) === orderId && /creance|créance|impaye|impayé/.test(lower(`${trx.categorie || ''} ${trx.libelle || ''} ${trx.statut || ''}`))));
    const paidNow = finances.find((trx) => clean(trx.id) === financeIds.paid(orderId) || (clean(trx.order_id || trx.related_id) === orderId && lower(trx.statut || trx.status) === 'paye' && /encaissement|acompte|paye/.test(lower(trx.libelle || ''))));
    return receivable && !paidNow;
  });

  if (!candidate) return buildResult(recipe);

  const orderId = clean(candidate.id);
  const receivable = finances.find((trx) => clean(trx.id) === financeIds.receivable(orderId) || clean(trx.related_id) === orderId);
  const created = [
    { key: 'sales_order', label: 'Commande', id: candidate.id },
    { key: 'creance', label: 'Créance client', id: receivable?.id },
  ];
  const missing = receivable ? [] : [{ key: 'creance', label: 'Créance client' }];

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: candidate.client_nom || candidate.customer_name || orderId,
  });
}

function verifyFeeding(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[4];
  const logs = arr(dataMap.alimentation_logs);
  const finances = arr(dataMap.finances);
  const events = arr(dataMap.business_events);
  const candidate = logs.find((row) => num(row.quantite ?? row.quantity) > 0);

  if (!candidate) return buildResult(recipe);

  const logId = clean(candidate.id);
  const stockId = clean(candidate.stock_id);
  const finance = finances.find((row) => clean(row.id) === financeIds.feeding(logId));
  const movement = hasStockMovementEvent(events, stockId) || events.some((row) => clean(row.source_record_id) === logId);
  const lotCost = num(candidate.montant_total ?? candidate.cout ?? candidate.cost) > 0 || finance;

  const created = [{ key: 'alimentation_log', label: 'Journal alimentation', id: candidate.id }];
  const missing = [];
  if (stockId) created.push({ key: 'sortie_stock', label: 'Sortie stock', id: stockId });
  else missing.push({ key: 'sortie_stock', label: 'Sortie stock' });
  if (lotCost) created.push({ key: 'cout_lot', label: 'Coût lot', id: finance?.id || logId });
  else missing.push({ key: 'cout_lot', label: 'Coût lot' });
  if (movement) created.push({ key: 'stock_movement', label: 'Mouvement stock' });
  else missing.push({ key: 'stock_movement', label: 'Mouvement stock' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: candidate.produit || candidate.lot_nom || logId,
  });
}

function verifyHealth(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[5];
  const healthRows = arr(dataMap.sante);
  const tasks = arr(dataMap.taches);
  const stocks = arr(dataMap.stock);
  const finances = arr(dataMap.finances);
  const candidate = healthRows.find((row) => clean(row.stock_id) || num(row.cout ?? row.montant) > 0 || /vaccin|soin|traitement/.test(lower(`${row.type_intervention || ''} ${row.nom || ''}`)));

  if (!candidate) return buildResult(recipe);

  const finance = findHealthFinance(candidate, finances) || finances.find((row) => clean(row.id) === financeIds.health(candidate.id));
  const stockId = clean(candidate.stock_id);
  const stockUsed = stockId && stocks.some((row) => clean(row.id) === stockId);
  const task = tasks.find((row) => clean(row.related_id || row.source_record_id) === clean(candidate.id) || /vaccin|soin|rappel|sante|sanit/.test(lower(`${row.title || ''} ${row.checklist || ''}`)));

  const created = [{ key: 'soin', label: 'Intervention santé', id: candidate.id }];
  const missing = [];
  if (stockUsed || !stockId) created.push({ key: 'sortie_produit_sante', label: 'Produit santé', id: stockId || 'sans stock' });
  else missing.push({ key: 'sortie_produit_sante', label: 'Produit santé' });
  if (task) created.push({ key: 'rappel_tache', label: 'Rappel / tâche', id: task.id });
  else missing.push({ key: 'rappel_tache', label: 'Rappel / tâche' });
  if (finance) created.push({ key: 'cout_sante', label: 'Coût santé', id: finance.id });
  else missing.push({ key: 'cout_sante', label: 'Coût santé' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: candidate.nom || candidate.type_intervention || candidate.id,
  });
}

function verifyMortality(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[6];
  const events = arr(dataMap.business_events);
  const lots = arr(dataMap.avicole);
  const alerts = arr(dataMap.alertes_center);
  const candidate = events.find((row) => /mortalite|mort|perte_effectif/.test(lower(`${row.event_type || ''} ${row.title || ''}`)))
    || lots.find((row) => num(row.mortalite ?? row.morts ?? row.pertes) > 0);

  if (!candidate) return buildResult(recipe);

  const lotId = clean(candidate.lot_id || candidate.id);
  const loss = events.find((row) => clean(row.entity_id || row.lot_id) === lotId && /perte|mortalite|impact/.test(lower(`${row.event_type || ''} ${row.title || ''}`)));
  const alert = alerts.find((row) => clean(row.entity_id || row.related_id) === lotId && /mortalite|seuil|effectif/.test(lower(`${row.title || ''} ${row.message || ''}`)));
  const effectifOk = lots.some((row) => clean(row.id) === lotId && num(row.effectif_actuel ?? row.quantite ?? row.headcount) >= 0);

  const created = [];
  const missing = [];
  if (effectifOk || candidate.effectif_actuel != null) created.push({ key: 'effectif_diminue', label: 'Effectif lot', id: lotId });
  else missing.push({ key: 'effectif_diminue', label: 'Effectif lot' });
  if (loss || /mortalite|perte/.test(lower(`${candidate.event_type || ''} ${candidate.title || ''}`))) created.push({ key: 'perte', label: 'Perte enregistrée', id: loss?.id || candidate.id });
  else missing.push({ key: 'perte', label: 'Perte enregistrée' });
  if (alert || num(candidate.mortalite ?? candidate.morts) < 5) created.push({ key: 'alerte_seuil', label: 'Alerte seuil', id: alert?.id || 'non requise' });
  else missing.push({ key: 'alerte_seuil', label: 'Alerte seuil' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: candidate.nom || candidate.name || lotId,
  });
}

function verifyEggProduction(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[7];
  const logs = arr(dataMap.production_oeufs_logs);
  const events = arr(dataMap.business_events);
  const stocks = arr(dataMap.stock);
  const candidate = logs.find((row) => num(row.oeufs_produits ?? row.quantite ?? row.quantity) > 0);
  if (!candidate) return buildResult(recipe);

  const logId = clean(candidate.id);
  const lotId = clean(candidate.lot_id);
  const event = events.find((row) => clean(row.source_record_id || row.entity_id) === logId || (clean(row.entity_id) === lotId && /production_oeufs|oeuf|ramassage/.test(lower(`${row.event_type || ''} ${row.title || ''}`))));
  const eggStock = stocks.find((row) => /oeuf|œuf|ponte/.test(lower(`${row.produit || ''} ${row.categorie || ''}`)) && num(row.quantite) > 0);
  const movement = event || hasStockMovementEvent(events, eggStock?.id);

  const created = [{ key: 'production_log', label: 'Journal production', id: candidate.id }];
  const missing = [];
  if (eggStock || num(candidate.stock_entree ?? candidate.stock_qty) > 0) created.push({ key: 'entree_stock_oeufs', label: 'Entrée stock œufs', id: eggStock?.id });
  else missing.push({ key: 'entree_stock_oeufs', label: 'Entrée stock œufs' });
  if (movement) created.push({ key: 'stock_movement', label: 'Mouvement stock', id: event?.id });
  else missing.push({ key: 'stock_movement', label: 'Mouvement stock' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: `${num(candidate.oeufs_produits)} œufs · lot ${lotId || '-'}`,
  });
}

function verifyCultureHarvest(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[8];
  const cultures = arr(dataMap.cultures);
  const stocks = arr(dataMap.stock);
  const events = arr(dataMap.business_events);
  const candidate = cultures.find((row) => num(row.quantite_recoltee ?? row.recolte ?? row.harvest_qty ?? row.disponible) > 0);
  if (!candidate) return buildResult(recipe);

  const cultureId = clean(candidate.id);
  const stock = stocks.find((row) => clean(row.culture_id || row.source_culture_id || row.related_id) === cultureId || lower(`${row.produit || ''}`).includes(lower(candidate.nom || candidate.name || '')));
  const movement = hasStockMovementEvent(events, stock?.id) || events.some((row) => clean(row.entity_id) === cultureId && /recolte|culture|stock/.test(lower(`${row.event_type || ''} ${row.title || ''}`)));

  const created = [];
  const missing = [];
  if (stock) created.push({ key: 'stock_vendable', label: 'Stock vendable', id: stock.id });
  else missing.push({ key: 'stock_vendable', label: 'Stock vendable' });
  if (movement) created.push({ key: 'stock_movement', label: 'Mouvement stock', id: movement ? 'ok' : undefined });
  else missing.push({ key: 'stock_movement', label: 'Mouvement stock' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing,
    details: candidate.nom || candidate.name || cultureId,
  });
}

function verifyOrphanDocument(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[9];
  const documents = arr(dataMap.documents);
  const orphans = documents.filter((doc) => {
    const hasLink = clean(doc.entity_id || doc.related_id || doc.transaction_id || doc.source_record_id || doc.order_id || doc.stock_id);
    const hasProof = clean(doc.proof_url || doc.justificatif_url || doc.file_url || doc.url);
    return !hasLink && !hasProof;
  });
  const resolved = documents.filter((doc) => {
    const wasOrphanCandidate = !clean(doc.entity_id || doc.related_id || doc.transaction_id);
    return wasOrphanCandidate && clean(doc.proof_url || doc.justificatif_url || doc.file_url || doc.url);
  });

  if (!documents.length) return buildResult(recipe);

  if (!orphans.length) {
    return finalizeResult(recipe, {
      anchor: resolved[0] || documents[0],
      status: 'ok',
      createdObjects: [
        { key: 'preuve_liee', label: 'Justificatifs liés', id: `${documents.length - orphans.length}/${documents.length}` },
        { key: 'ecart_resolu', label: 'Écarts résolus', id: String(resolved.length) },
      ],
      missingObjects: [],
      details: 'Aucun document orphelin détecté.',
    });
  }

  return finalizeResult(recipe, {
    anchor: orphans[0],
    createdObjects: [{ key: 'preuve_liee', label: 'Documents liés', id: `${documents.length - orphans.length}/${documents.length}` }],
    missingObjects: [
      { key: 'preuve_liee', label: 'Liaison preuve', detail: `${orphans.length} orphelin(s)` },
      { key: 'ecart_resolu', label: 'Résolution écart', detail: 'Documents sans source métier' },
    ],
    details: `${orphans.length} document(s) sans source métier.`,
  });
}

function verifyCriticalAlert(dataMap = {}) {
  const recipe = WORKFLOW_QUALITY_RECIPES[10];
  const alerts = arr(dataMap.alertes_center);
  const tasks = arr(dataMap.taches);
  const whatsappLogs = arr(dataMap.whatsapp_logs);
  const candidate = alerts.find((row) => criticalAlert(row) && !closedAlert(row));
  if (!candidate) return buildResult(recipe);

  const task = linkedTaskForAlert(tasks, candidate);
  const pushes = whatsappLogs.filter((row) => clean(row.alert_id || row.related_id) === clean(candidate.id));
  const duplicatePush = pushes.length > 1;

  const created = [{ key: 'alerte', label: 'Alerte critique', id: candidate.id }];
  const missing = [];
  if (task) created.push({ key: 'tache_liee', label: 'Tâche liée', id: task.id });
  else missing.push({ key: 'tache_liee', label: 'Tâche liée' });
  if (pushes.length === 1) created.push({ key: 'push_unique', label: 'Notification unique', id: pushes[0].id });
  else if (pushes.length === 0) missing.push({ key: 'push_unique', label: 'Notification / push', detail: 'Aucune trace WhatsApp simulée' });
  else missing.push({ key: 'push_unique', label: 'Notification unique', detail: `${pushes.length} envois` });
  if (candidate.action_recommandee || task || candidate.resolution_status) created.push({ key: 'resolution_possible', label: 'Résolution possible' });
  else missing.push({ key: 'resolution_possible', label: 'Résolution possible' });

  return finalizeResult(recipe, {
    anchor: candidate,
    createdObjects: created,
    missingObjects: missing.filter((item) => !(item.key === 'push_unique' && duplicatePush)),
    details: candidate.title || candidate.message || candidate.id,
  });
}

const VERIFY_FNS = [
  verifyPurchasePaid,
  verifyPurchaseCredit,
  verifySalePaid,
  verifySaleCredit,
  verifyFeeding,
  verifyHealth,
  verifyMortality,
  verifyEggProduction,
  verifyCultureHarvest,
  verifyOrphanDocument,
  verifyCriticalAlert,
];

export function auditWorkflowQuality(dataMap = {}, manualChecks = {}) {
  const results = VERIFY_FNS.map((fn) => {
    const base = fn(dataMap);
    const manual = manualChecks[base.id];
    if (manual?.status === 'manual_ok') {
      return {
        ...base,
        status: 'manual_ok',
        lastTestedAt: manual.validatedAt || base.lastTestedAt,
        manualNote: manual.note || '',
        details: manual.note || base.details || 'Validé manuellement',
      };
    }
    return base;
  });
  return results;
}

export function computeWorkflowQualityScore(results = []) {
  const total = results.length || WORKFLOW_QUALITY_RECIPES.length;
  const okCount = results.filter((row) => row.status === 'ok' || row.status === 'manual_ok').length;
  const errorCount = results.filter((row) => row.status === 'error').length;
  const untestedCount = results.filter((row) => row.status === 'untested').length;
  const score = total ? Math.round((okCount / total) * 100) : 0;
  return { score, okCount, errorCount, untestedCount, total };
}

export function formatWorkflowQualityDate(value = '') {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return String(value).slice(0, 16);
  }
}
