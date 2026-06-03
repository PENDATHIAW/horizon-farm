import { toNumber } from './format.js';
import { makeId } from './ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const cultureLabel = (row = {}) => row.nom || row.name || row.type || row.culture || row.parcelle || row.id || 'Culture';
export const cultureHarvestQty = (row = {}) => toNumber(row.quantite_recoltee ?? row.recolte ?? row.production_recoltee ?? row.rendement_reel);
export const cultureSoldQty = (row = {}) => toNumber(row.quantite_vendue ?? row.quantity_sold ?? row.vendue);
export const cultureAvailableQty = (row = {}) => {
  const explicit = toNumber(row.quantite_disponible ?? row.quantity_available ?? row.stock_recolte);
  if (explicit > 0) return explicit;
  const harvested = cultureHarvestQty(row);
  if (harvested <= 0) return 0;
  return Math.max(0, harvested - cultureSoldQty(row));
};
export const cultureHarvestUnit = (row = {}) => row.unite_recolte || row.unite || row.unit || 'kg';
export const cultureUnitPrice = (row = {}) => toNumber(row.prix_vente_estime ?? row.prix_vente ?? row.prix_vente_unitaire ?? row.prix_unitaire ?? row.unit_price);
export const cultureStockKey = (row = {}) => `culture-stock:${row.id || cultureLabel(row)}`;
export const cultureOpportunityKey = (row = {}) => `cultures:${row.id || cultureLabel(row)}`;

export function isCultureHarvestReady(row = {}) {
  const status = norm(row.statut || row.status || row.phase || '');
  return cultureHarvestQty(row) > 0 || cultureAvailableQty(row) > 0
    || Boolean(row.vendable || row.pret_a_la_vente || row.ready_for_sale || row.sale_ready)
    || ['recolte', 'recoltee', 'pret_a_vendre', 'pret_vente', 'pret a vendre'].some((word) => status.includes(norm(word)));
}

export function findCultureStock(stocks = [], culture = {}) {
  const key = cultureStockKey(culture);
  return stocks.find((row) => String(row.stock_key || row.dedupe_key || row.source_record_id || row.related_id || row.culture_id || '') === key
    || (String(row.source_module || '').includes('cultures') && String(row.source_id || row.culture_id || '') === String(culture.id)));
}

export function findCultureOpportunity(opportunities = [], culture = {}) {
  const keys = new Set([cultureOpportunityKey(culture), `culture-sale:${culture.id || ''}`].filter(Boolean));
  return opportunities.find((opp) => {
    const oppKey = String(opp.opportunity_key || opp.dedupe_key || opp.source_record_id || '');
    if (keys.has(oppKey)) return true;
    return (String(opp.source_module || opp.created_from || '').includes('cultures')
      && String(opp.source_id || opp.entity_id || opp.culture_id || '') === String(culture.id));
  });
}

export function buildCultureHarvestWorkflow({ before = {}, after = {}, stocks = [], opportunities = [], source = 'fiche culture', date = today() }) {
  if (!after?.id || !isCultureHarvestReady(after)) return null;
  const qty = cultureHarvestQty(after);
  if (qty <= 0) return null;
  const saleQty = cultureAvailableQty(after);
  const unit = cultureHarvestUnit(after);
  const price = cultureUnitPrice(after);
  const amount = price > 0 ? price * (saleQty > 0 ? saleQty : qty) : toNumber(after.valeur_recolte_estimee || after.montant_estime);
  const stockKey = cultureStockKey(after);
  const opportunityKey = cultureOpportunityKey(after);
  const name = `Récolte ${cultureLabel(after)}`;
  const stockExisting = findCultureStock(stocks, after);
  const opportunityExisting = findCultureOpportunity(opportunities, after);
  const stockPayload = {
    stock_key: stockKey,
    dedupe_key: stockKey,
    produit: name,
    name,
    categorie: 'Récoltes cultures',
    category: 'recolte_culture',
    quantite: qty,
    quantity: qty,
    unite: unit,
    seuil: 0,
    source_module: 'cultures',
    source_type: 'culture',
    source_id: after.id,
    source_record_id: stockKey,
    related_id: after.id,
    culture_id: after.id,
    date_entree: after.date_recolte || date,
    notes: `Stock créé depuis la récolte de ${cultureLabel(after)}`,
  };
  const opportunityPayload = {
    opportunity_key: opportunityKey,
    dedupe_key: opportunityKey,
    title: `Vente ${name}`,
    libelle: `Vente ${name}`,
    source_module: 'cultures',
    created_from: 'cultures',
    source_type: 'recolte_culture',
    entity_type: 'culture',
    source_id: after.id,
    entity_id: after.id,
    culture_id: after.id,
    product_name: name,
    produit: name,
    quantity: saleQty > 0 ? saleQty : qty,
    quantite: saleQty > 0 ? saleQty : qty,
    unite: unit,
    unit,
    unit_price: price,
    prix_unitaire: price,
    montant_estime: amount,
    estimated_amount: amount,
    valeur_estimee: amount,
    status: saleQty > 0 ? 'ouverte' : 'fermee',
    statut: saleQty > 0 ? 'ouverte' : 'fermee',
    priority: 'haute',
    date: after.date_recolte || date,
    notes: `Récolte disponible à vendre · ${qty} ${unit}`,
  };
  const beforeQty = cultureHarvestQty(before);
  return {
    stockExistingId: stockExisting?.id || '',
    opportunityExistingId: opportunityExisting?.id || '',
    stock: stockExisting?.id ? stockPayload : { id: makeId('STK'), ...stockPayload },
    opportunity: opportunityExisting?.id ? { ...opportunityPayload, updated_at: now() } : { id: makeId('OPP'), ...opportunityPayload },
    event: qty > beforeQty ? {
      id: makeId('EVT'),
      event_type: 'recolte_culture_disponible',
      module_source: 'cultures',
      module: 'cultures',
      source_type: 'culture',
      entity_type: 'culture',
      source_id: after.id,
      entity_id: after.id,
      title: `Récolte disponible · ${cultureLabel(after)}`,
      description: [`Source: ${source}`, `Quantité récoltée: ${qty} ${unit}`, 'Stock et opportunité de vente préparés.'].join('\n'),
      severity: 'info',
      status: 'nouveau',
      event_date: after.date_recolte || date,
      date: after.date_recolte || date,
      amount,
      montant: amount,
      linked_opportunity_key: opportunityKey,
      linked_stock_key: stockKey,
      saisies_evitees: 2,
    } : null,
  };
}

export function buildCultureInputUsageWorkflow({ culture = {}, stock = {}, qty = 0, motif = 'Intrant utilisé', date = today() }) {
  const usedQty = Math.max(0, toNumber(qty));
  if (!culture?.id || !stock?.id || usedQty <= 0) return null;
  const currentQty = toNumber(stock.quantite ?? stock.quantity);
  const nextQty = Math.max(0, currentQty - usedQty);
  const unitPrice = toNumber(stock.prixUnit ?? stock.prixunit ?? stock.prix_unitaire ?? stock.unit_price);
  const amount = usedQty * unitPrice;
  const label = stock.produit || stock.name || stock.nom || stock.id;
  return {
    stockPatch: {
      quantite: nextQty,
      quantity: nextQty,
      last_movement_type: 'sortie_intrant_culture',
      last_movement_qty: usedQty,
      last_movement_label: motif,
      last_movement_at: now(),
      source_module: stock.source_module || 'stock',
    },
    culturePatch: {
      cout_total_reel: toNumber(culture.cout_total_reel) + amount,
      cout_intrants: toNumber(culture.cout_intrants) + amount,
      derniere_sortie_intrant_stock_id: stock.id,
      derniere_sortie_intrant_at: now(),
    },
    event: {
      id: makeId('EVT'),
      event_type: 'intrant_culture_utilise',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      title: `Intrant utilisé · ${cultureLabel(culture)}`,
      description: `${usedQty} ${stock.unite || ''} de ${label} · ${motif}`.trim(),
      event_date: date,
      severity: nextQty <= toNumber(stock.seuil ?? stock.threshold) && toNumber(stock.seuil ?? stock.threshold) > 0 ? 'warning' : 'info',
      linked_stock_id: stock.id,
      quantity: usedQty,
      amount,
      saisies_evitees: 2,
    },
  };
}

export function buildCultureLossWorkflow({ culture = {}, qty = 0, unitPrice = 0, reason = 'Perte déclarée', date = today() }) {
  const lossQty = Math.max(0, toNumber(qty));
  if (!culture?.id || lossQty <= 0) return null;
  const unit = cultureHarvestUnit(culture);
  const amount = lossQty * toNumber(unitPrice || cultureUnitPrice(culture));
  const available = Math.max(0, toNumber(culture.quantite_disponible ?? cultureHarvestQty(culture)) - lossQty);
  return {
    culturePatch: {
      quantite_disponible: available,
      pertes: toNumber(culture.pertes) + lossQty,
      quantite_perdue: toNumber(culture.quantite_perdue) + lossQty,
      valeur_perte_estimee: toNumber(culture.valeur_perte_estimee) + amount,
      statut: available <= 0 ? 'perdu' : (culture.statut || 'a_surveiller'),
      last_loss_at: now(),
      last_loss_reason: reason,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'perte_culturale',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      title: `Perte culture · ${cultureLabel(culture)}`,
      description: `${lossQty} ${unit} perdu(s) · ${reason}`,
      event_date: date,
      severity: available <= 0 ? 'critique' : 'warning',
      quantity: lossQty,
      amount,
      montant: amount,
    },
  };
}

export function buildCultureWeatherRiskFollowUp({ culture = {}, reason = 'Risque météo', severity = 'warning', date = today() }) {
  if (!culture?.id) return null;
  const key = `culture-risk:${culture.id}:${norm(reason) || 'meteo'}`;
  const taskId = makeId('TSK');
  return {
    task: {
      id: taskId,
      title: `Vérifier culture: ${cultureLabel(culture)}`,
      module_lie: 'cultures',
      source_module: 'cultures',
      source_record_id: culture.id,
      related_id: culture.id,
      task_dedupe_key: key,
      due_date: date,
      priority: severity === 'critique' ? 'critique' : 'haute',
      status: 'a_faire',
      checklist: 'Contrôler parcelle; Vérifier eau/intrants; Noter action terrain',
      notes: reason,
    },
    alert: {
      id: makeId('ALT'),
      title: `Risque culture: ${cultureLabel(culture)}`,
      message: reason,
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      severity,
      status: 'nouvelle',
      action_recommandee: 'Contrôler la parcelle et créer une action si nécessaire.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'risque_culture_detecte',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      title: `Risque culture ${cultureLabel(culture)}`,
      description: reason,
      event_date: date,
      severity,
      linked_task_id: taskId,
    },
  };
}
