/**
 * Commercial V1 — moteur opportunités automatique (aucune saisie).
 * Sources : récoltes vendables, frigo, lots prêts, rotation lente.
 */

import { listSellableStocks, quantityOf, unitPriceOf, productNameOf, dlcOf } from './sellableStock.js';
import { fmtCurrency } from './format.js';
import { toNumber } from './format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => toNumber(v);
const lower = (v) => String(v || '').toLowerCase();

function daysUntil(dateStr = '') {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d - Date.now()) / 86400000);
}

function isPerishable(row = {}) {
  const text = lower([row.produit, row.nom, row.category, row.categorie, row.activite_liee].join(' '));
  return /oeuf|œuf|viande|poulet|chair|legume|lait|fromage|frigo|frais|periss/.test(text)
    || Boolean(dlcOf(row));
}

function slowRotationStock(row = {}) {
  const lastMove = row.last_movement_at || row.updated_at || row.date_entree || '';
  const days = lastMove ? Math.floor((Date.now() - new Date(lastMove).getTime()) / 86400000) : 30;
  return days >= 14 && quantityOf(row) > 0;
}

function aiRecommendation({ perishable = false, urgency = 'normal', kind = '' } = {}) {
  if (perishable && urgency === 'critique') {
    return 'Vente flash — contactez vos clients habituels aujourd\'hui.';
  }
  if (perishable && urgency === 'haute') {
    return 'Offre groupée ou promotion courte durée pour écouler avant DLC.';
  }
  if (kind === 'lot_pret') {
    return 'Proposer aux restaurants et hôtels — lot prêt à commercialiser.';
  }
  if (kind === 'rotation_lente') {
    return 'Promotion ciblée ou bundle avec produits à forte demande.';
  }
  if (kind === 'recolte') {
    return 'Publier sur Opportunités et proposer aux clients du segment.';
  }
  return 'Contacter les clients les plus adaptés depuis l\'onglet Opportunités.';
}

function baseOpportunity({
  id,
  title,
  product_name,
  quantity,
  unit,
  estimated_value,
  urgency,
  reason,
  recommendation,
  source_type,
  source_id,
  perishable,
  auto_generated = true,
}) {
  return {
    id,
    title,
    libelle: title,
    product_name,
    quantity,
    unit,
    estimated_value,
    montant_estime: estimated_value,
    urgency,
    reason,
    recommendation,
    source_type,
    source_id,
    status: 'ouverte',
    statut: 'ouverte',
    auto_generated,
    created_from: 'commercial_auto_opportunities_v1',
  };
}

export function buildAutoCommercialOpportunities({
  stocks = [],
  cultures = [],
  lots = [],
  animaux = [],
  salesOrders = [],
  limit = 24,
} = {}) {
  const opportunities = [];
  const seen = new Set();

  listSellableStocks(stocks, 80).forEach((row) => {
    const qty = quantityOf(row);
    const price = unitPriceOf(row) || n(row.prix_vente);
    const value = qty * (price > 0 ? price : 1);
    const dlc = dlcOf(row);
    const days = daysUntil(dlc);
    const perishable = isPerishable(row);
    let urgency = 'normal';
    if (perishable && days != null && days <= 2) urgency = 'critique';
    else if (perishable && days != null && days <= 7) urgency = 'haute';
    else if (slowRotationStock(row)) urgency = 'moyenne';

    const key = `stock:${row.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    const name = productNameOf(row);
    opportunities.push(baseOpportunity({
      id: `auto-opp-stock-${row.id}`,
      title: `${name} disponible`,
      product_name: name,
      quantity: qty,
      unit: row.unite || row.unit || 'unité',
      estimated_value: value,
      urgency,
      reason: dlc
        ? `DLC ${dlc}${days != null ? ` · J-${days}` : ''}`
        : slowRotationStock(row)
          ? 'Stock à rotation lente'
          : 'Produit vendable en stock',
      recommendation: aiRecommendation({ perishable, urgency, kind: slowRotationStock(row) ? 'rotation_lente' : 'stock' }),
      source_type: 'stock',
      source_id: row.id,
      perishable,
    }));
  });

  arr(cultures).forEach((culture) => {
    const harvestQty = n(culture.quantite_recoltee ?? culture.harvest_qty ?? culture.stock_disponible);
    if (harvestQty <= 0) return;
    const sellable = culture.commercial_ready || culture.pret_vente || lower(culture.statut).includes('recolte');
    if (!sellable && harvestQty < 5) return;

    const key = `culture:${culture.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    const name = culture.culture || culture.nom || culture.parcelle || 'Récolte';
    const price = n(culture.prix_vente_unitaire ?? culture.prix_unitaire);
    opportunities.push(baseOpportunity({
      id: `auto-opp-culture-${culture.id}`,
      title: `Récolte vendable · ${name}`,
      product_name: name,
      quantity: harvestQty,
      unit: culture.unite || 'kg',
      estimated_value: harvestQty * (price || 1),
      urgency: 'haute',
      reason: 'Récolte commercialisable',
      recommendation: aiRecommendation({ kind: 'recolte' }),
      source_type: 'culture',
      source_id: culture.id,
      perishable: true,
    }));
  });

  arr(lots).forEach((lot) => {
    const ready = lot.pret_vente || lot.sale_ready || lower(lot.statut).includes('pret') || lower(lot.phase).includes('commercial');
    const qty = n(lot.quantite_disponible ?? lot.stock_disponible ?? lot.nombre_restants ?? lot.quantite);
    if (!ready && qty <= 0) return;

    const key = `lot:${lot.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    const name = lot.nom || lot.libelle || lot.type || 'Lot avicole';
    opportunities.push(baseOpportunity({
      id: `auto-opp-lot-${lot.id}`,
      title: `Lot prêt · ${name}`,
      product_name: name,
      quantity: qty,
      unit: lot.unite || 'unité',
      estimated_value: qty * n(lot.prix_vente_unitaire ?? lot.prix_unitaire),
      urgency: 'haute',
      reason: 'Lot prêt à la commercialisation',
      recommendation: aiRecommendation({ kind: 'lot_pret' }),
      source_type: 'lot_avicole',
      source_id: lot.id,
      perishable: /chair|poulet/.test(lower(name)),
    }));
  });

  arr(animaux).filter((a) => lower(a.statut).includes('pret') || a.pret_vente).forEach((animal) => {
    const key = `animal:${animal.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    const name = animal.nom || animal.identification || animal.race || 'Animal';
    opportunities.push(baseOpportunity({
      id: `auto-opp-animal-${animal.id}`,
      title: `Animal prêt · ${name}`,
      product_name: name,
      quantity: 1,
      unit: 'unité',
      estimated_value: n(animal.prix_vente ?? animal.valeur_vente),
      urgency: 'moyenne',
      reason: 'Animal marqué prêt à vendre',
      recommendation: aiRecommendation({ kind: 'lot_pret' }),
      source_type: 'animal',
      source_id: animal.id,
      perishable: false,
    }));
  });

  const urgencyRank = { critique: 0, haute: 1, moyenne: 2, normal: 3 };
  return opportunities
    .sort((a, b) => (urgencyRank[a.urgency] ?? 9) - (urgencyRank[b.urgency] ?? 9) || b.estimated_value - a.estimated_value)
    .slice(0, limit);
}

export function mergeCommercialOpportunities(manual = [], auto = []) {
  const byKey = new Map();
  const sourceKeys = new Set();

  arr(manual).forEach((row) => {
    const sourceKey = row.source_type && row.source_id ? `${row.source_type}:${row.source_id}` : '';
    const key = row.id || sourceKey || makeManualKey(row);
    byKey.set(key, { ...row, auto_generated: false });
    if (sourceKey) sourceKeys.add(sourceKey);
  });

  arr(auto).forEach((row) => {
    const sourceKey = row.source_id ? `${row.source_type}:${row.source_id}` : '';
    if (sourceKey && sourceKeys.has(sourceKey)) return;
    const key = sourceKey || row.id;
    if (!byKey.has(key)) byKey.set(key, row);
  });
  return [...byKey.values()];
}

function makeManualKey(row = {}) {
  return `manual:${row.title || row.libelle || row.product_name || 'opp'}`;
}

export function opportunityPipelineValue(opportunities = []) {
  return arr(opportunities).reduce((sum, row) => sum + n(row.estimated_value ?? row.montant_estime), 0);
}

export function formatOpportunityUrgencyLabel(urgency = '') {
  const map = { critique: 'Critique', haute: 'Haute', moyenne: 'Moyenne', normal: 'Normale' };
  return map[urgency] || urgency || 'Normale';
}
