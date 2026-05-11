import { toNumber } from '../utils/format';

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const clean = (value) => String(value || '').trim().toLowerCase();
const quantitySoldOf = (sale = {}) => Math.max(1, toNumber(sale.quantite ?? sale.quantity ?? sale.qty ?? 1));
const sourceIdOf = (sale = {}) => sale.source_id || sale.product_id || sale.entity_id || sale.asset_id || sale.stock_id || sale.lot_id || sale.animal_id || sale.culture_id;
const sourceTypeOf = (sale = {}) => clean(sale.source_type || sale.type_vente || sale.product_type || sale.source_module || sale.module_lie);
const amountOf = (sale = {}) => toNumber(sale.montant_total ?? sale.total ?? sale.amount ?? sale.total_amount ?? sale.montant);
const unitPriceOf = (sale = {}) => toNumber(sale.prix_unitaire ?? sale.unit_price ?? sale.price ?? sale.prix_vente) || (quantitySoldOf(sale) > 0 ? amountOf(sale) / quantitySoldOf(sale) : 0);
const stockQtyOf = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty ?? row.quantite_disponible ?? row.stock_quantity ?? row.quantite_stock ?? row.current_count ?? row.quantite_initiale_stock);
const costUnitOf = (row = {}) => toNumber(row.cout_revient_unitaire ?? row.cout_unitaire_calcule ?? row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price ?? row.cost_unit ?? row.cout_unitaire);

function stockPatch(sale, quantitySold) {
  const current = stockQtyOf(sale);
  const next = current > 0 ? Math.max(0, current - quantitySold) : undefined;
  const unitCost = costUnitOf(sale);
  return {
    id: sourceIdOf(sale),
    quantite: next,
    quantity: next,
    stock_status: next === 0 ? 'epuise' : undefined,
    statut: next === 0 ? 'epuise' : undefined,
    last_movement_type: 'sortie_vente',
    last_movement_label: 'Vente produit stock',
    last_movement_qty: quantitySold,
    last_movement_at: now(),
    last_sale_id: sale.id,
    last_sale_amount: amountOf(sale),
    cout_revient_unitaire: unitCost || undefined,
    cout_unitaire_calcule: unitCost || undefined,
    source_module: 'ventes',
  };
}

function animalPatch(sale) {
  return {
    id: sourceIdOf(sale),
    status: 'vendu',
    statut: 'vendu',
    prix_vente_reel: amountOf(sale),
    sale_price: amountOf(sale),
    date_vente: sale.date || today(),
    client_id: sale.client_id || '',
    moyen_paiement: sale.moyen_paiement || sale.mode_paiement || '',
    commentaire_vente: `Vente liée à la commande ${sale.id}`,
    linked_sale_id: sale.id,
    last_sale_id: sale.id,
    source_module: 'ventes',
  };
}

function lotPatch(sale, quantitySold) {
  const currentSold = toNumber(sale.vendus ?? sale.sold_count ?? 0);
  const currentCount = toNumber(sale.current_count ?? sale.effectif_actuel ?? 0);
  const nextCurrent = currentCount > 0 ? Math.max(0, currentCount - quantitySold) : undefined;
  return {
    id: sourceIdOf(sale),
    vendus: currentSold + quantitySold,
    current_count: nextCurrent,
    effectif_actuel: nextCurrent,
    status: nextCurrent === 0 ? 'vendu_totalement' : 'vendu_partiellement',
    statut: nextCurrent === 0 ? 'vendu_totalement' : 'vendu_partiellement',
    prix_vente_reel: unitPriceOf(sale),
    montant_vente_total_reel: amountOf(sale),
    date_fin_reelle: nextCurrent === 0 ? (sale.date || today()) : undefined,
    client_id: sale.client_id || '',
    linked_sale_id: sale.id,
    last_sale_id: sale.id,
    source_module: 'ventes',
  };
}

function culturePatch(sale, quantitySold) {
  const available = toNumber(sale.quantite_disponible ?? sale.stock_quantity ?? sale.quantite_stock ?? 0);
  const previousRevenue = toNumber(sale.revenu_reel ?? sale.revenu_total_reel ?? 0);
  return {
    id: sourceIdOf(sale),
    quantite_disponible: available > 0 ? Math.max(0, available - quantitySold) : undefined,
    revenu_reel: previousRevenue + amountOf(sale),
    last_sale_qty: quantitySold,
    last_sale_amount: amountOf(sale),
    last_sale_id: sale.id,
    client_id: sale.client_id || '',
    source_module: 'ventes',
  };
}

export function buildSaleAssetPatch(sale = {}, activity = '') {
  const id = sourceIdOf(sale);
  if (!id) return null;
  const type = `${clean(activity)} ${sourceTypeOf(sale)}`;
  const quantitySold = quantitySoldOf(sale);
  if (type.includes('stock')) return stockPatch(sale, quantitySold);
  if (type.includes('animal') || type.includes('animaux')) return animalPatch(sale);
  if (type.includes('avicole') || type.includes('lot')) return lotPatch(sale, quantitySold);
  if (type.includes('culture') || type.includes('recolte') || type.includes('récolte')) return culturePatch(sale, quantitySold);
  return stockPatch(sale, quantitySold);
}

export function cleanPatchForWrite(patch = {}) {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}
