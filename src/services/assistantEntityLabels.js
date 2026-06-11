/**
 * Résolution de libellés métier — interdit les placeholders génériques
 * quand une donnée réelle existe (Client, Produit, Animal, Lot).
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();

const GENERIC_LABELS = new Set([
  'client',
  'produit',
  'animal',
  'lot',
  'passage',
  'client passage',
  'fournisseur',
  'parcelle',
]);

export function isGenericEntityLabel(label = '') {
  const q = normalizeAgriculturalText(label);
  return !q || GENERIC_LABELS.has(q);
}

function clientRecordName(client = {}) {
  return clean(
    client.nom
    || client.name
    || client.raison_sociale
    || client.full_name
    || client.company_name
    || client.entreprise,
  );
}

/** Résout le nom client depuis commande + référentiel clients. */
export function resolveClientName(order = {}, clients = []) {
  const fromOrder = clean(
    order.client_nom
    || order.customer_name
    || order.client_label
    || order.client_name
    || order.nom_client,
  );
  if (fromOrder && !isGenericEntityLabel(fromOrder)) return fromOrder;

  const clientId = order.client_id ?? order.customer_id ?? order.clientId;
  if (clientId != null && clientId !== '') {
    const client = arr(clients).find((row) => String(row.id) === String(clientId));
    const fromClient = clientRecordName(client);
    if (fromClient && !isGenericEntityLabel(fromClient)) return fromClient;
  }

  if (fromOrder && !isGenericEntityLabel(fromOrder)) return fromOrder;

  const orderRef = clean(order.id || order.reference || order.numero);
  if (orderRef) return `le client de la commande ${orderRef}`;

  return null;
}

export function resolveClientDisplayName(order = {}, clients = [], { fallbackIndex = null } = {}) {
  const resolved = resolveClientName(order, clients);
  if (resolved) return resolved;
  if (fallbackIndex != null) return `un client à relancer (${fallbackIndex + 1})`;
  return 'un client à identifier dans le module Clients';
}

export function resolveProductName(row = {}, fallback = '') {
  const name = clean(
    row.product_name
    || row.produit
    || row.nom
    || row.libelle
    || row.title,
  );
  if (name && !isGenericEntityLabel(name)) return name;
  return fallback || null;
}

export function resolveLotLabel(lot = {}, fallback = '') {
  const label = clean(lot.name || lot.nom || lot.code || lot.label);
  if (label && !isGenericEntityLabel(label)) return label;
  if (lot.id) return `lot ${lot.id}`;
  return fallback || null;
}

/** Nettoie les répétitions de prose (en hausse en hausse, etc.). */
export function dedupeProse(text = '') {
  let out = String(text || '');

  const repetitionPatterns = [
    /\b(en hausse)(\s+\1)+\b/gi,
    /\b(en baisse)(\s+\1)+\b/gi,
    /\b(en progression)(\s+\1)+\b/gi,
    /\b(en recul)(\s+\1)+\b/gi,
    /\b(principal)(\s+\1)+\b/gi,
    /\b(risque)(\s+\1)+\b/gi,
    /\b(créance|creance)(\s+\1)+\b/gi,
  ];
  for (const pattern of repetitionPatterns) {
    out = out.replace(pattern, '$1');
  }

  const sentences = out
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const sentence of sentences) {
    const key = normalizeAgriculturalText(sentence);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
  }

  return unique.join(' ').replace(/\s{2,}/g, ' ').trim();
}

/** Filtre une liste de noms clients — exclut les placeholders et doublons. */
export function uniqueClientNames(rows = [], clients = []) {
  const names = [];
  const seen = new Set();
  for (const row of arr(rows)) {
    const name = row.clientName
      || row.name
      || resolveClientName(row, clients)
      || resolveClientDisplayName(row, clients);
    const key = normalizeAgriculturalText(name);
    if (seen.has(key) || isGenericEntityLabel(name)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export default {
  isGenericEntityLabel,
  resolveClientName,
  resolveClientDisplayName,
  resolveProductName,
  resolveLotLabel,
  dedupeProse,
  uniqueClientNames,
};
