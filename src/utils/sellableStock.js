import { toNumber } from './format';
import { isCommerciallyBlocked } from './stockFreshProduct';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();

const terminalStatuses = ['epuise', 'épuisé', 'bloque', 'bloqué', 'perime', 'périmé', 'retourne', 'retourné', 'a_retourner', 'non_conforme'];
const sellableCategories = ['recolte', 'produit_fini', 'produits_recoltes', 'vente'];

export function productNameOf(row = {}) {
  return row.produit || row.nom || row.name || row.id || 'Produit';
}

export function quantityOf(row = {}) {
  return toNumber(row.quantite ?? row.quantity);
}

export function unitOf(row = {}) {
  return row.unite || row.unit || 'unité';
}

export function unitPriceOf(row = {}) {
  return toNumber(
    row.prixUnit
    ?? row.prixunit
    ?? row.prix_unitaire
    ?? row.prix_vente_unitaire
    ?? row.unit_price,
  );
}

export function unitCostOf(row = {}) {
  return toNumber(
    row.cout_revient_unitaire
    ?? row.cout_unitaire_calcule
    ?? row.cout_unitaire
    ?? row.prix_achat
    ?? row.purchase_price
    ?? row.cout_achat,
  );
}

export function dlcOf(row = {}) {
  return clean(row.date_peremption || row.dlc || row.date_limite_consommation);
}

export function isSellableStock(row = {}) {
  const status = clean(row.statut || row.stock_status || row.status).toLowerCase();
  const category = clean(row.categorie || row.category).toLowerCase();
  const activity = clean(row.activite_liee || row.activity || row.module_lie).toLowerCase();
  if (!row.id || quantityOf(row) <= 0 || terminalStatuses.includes(status) || isCommerciallyBlocked(row)) {
    return false;
  }
  return sellableCategories.some((value) => category.includes(value))
    || activity === 'vente'
    || Boolean(row.vendable || row.pret_a_la_vente || row.ready_for_sale || row.sale_ready);
}

export function listSellableStocks(rows = [], limit = 12) {
  return arr(rows).filter(isSellableStock).slice(0, limit);
}
