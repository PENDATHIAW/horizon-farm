import { toNumber } from './format';
import { calculateAnimalCost, calculateAvicoleLotCost } from './costEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const qtyOf = (row = {}) => Math.max(1, toNumber(row.quantity ?? row.quantite ?? row.qty ?? 1));
const saleTotalOf = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.total_amount ?? row.chiffre_affaires ?? row.valeur_vente ?? row.montant_estime ?? row.estimated_amount ?? row.valeur_estimee ?? row.ca_potentiel ?? 0);
const paidOf = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.paye ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const paymentOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
const sourceModuleOf = (row = {}) => lower(row.source_module || row.created_from || row.module_source || row.source_type || row.module_lie);
const sourceIdOf = (row = {}) => clean(row.source_id || row.related_id || row.entity_id || row.source_record_id || row.asset_id || row.lot_id || row.animal_id || row.culture_id);
const unitPriceStock = (row = {}) => toNumber(row.cout_unitaire_calcule ?? row.cout_revient_unitaire ?? row.prixUnit ?? row.prixunit ?? row.prix_achat ?? row.purchase_price ?? row.cout_achat ?? row.prix_unitaire ?? row.unit_price ?? row.cost_unit ?? row.cout_unitaire);
const cancelled = (row = {}) => ['annule', 'annulé', 'cancelled'].includes(lower(row.statut || row.status || row.statut_commande));
const paymentCancelled = (row = {}) => ['annule', 'annulé', 'cancelled', 'rejete', 'rejeté'].includes(lower(row.statut || row.status));

function findById(rows, id) {
  return arr(rows).find((row) => clean(row.id) === clean(id) || clean(row.tag) === clean(id));
}

function paidFromLinkedPayments(order = {}, payments = []) {
  const id = clean(order.id);
  if (!id) return 0;
  return arr(payments).filter((payment) => !paymentCancelled(payment) && paymentOrderId(payment) === id).reduce((sum, payment) => sum + paymentAmount(payment), 0);
}

function effectivePaidAmount(order = {}, saleAmount = 0, context = {}) {
  const fromOrder = paidOf(order);
  const fromPayments = paidFromLinkedPayments(order, context.payments || context.paymentsList || []);
  const raw = Math.max(fromOrder, fromPayments);
  return saleAmount > 0 ? Math.min(saleAmount, raw) : raw;
}

function cultureTotalCost(culture = {}) {
  return toNumber(culture.cout_total_reel ?? culture.cout_total ?? culture.budget_prevu)
    || toNumber(culture.cout_semences) + toNumber(culture.cout_engrais) + toNumber(culture.cout_eau) + toNumber(culture.cout_main_oeuvre) + toNumber(culture.cout_traitement);
}

function cultureUnitCost(culture = {}) {
  const totalCost = cultureTotalCost(culture);
  const harvested = toNumber(culture.quantite_recoltee ?? culture.production_reelle ?? culture.quantite_disponible ?? culture.quantite_prevue);
  return harvested > 0 ? totalCost / harvested : 0;
}

function marginResult({ saleAmount = 0, paidAmount = 0, directCost = 0, costSource = 'cout_indisponible', sourceLabel = '' }) {
  const sale = toNumber(saleAmount);
  const paid = Math.min(sale || Number.MAX_SAFE_INTEGER, Math.max(0, toNumber(paidAmount)));
  const cost = toNumber(directCost);
  const margin = sale - cost;
  const cashMargin = paid - cost;
  return {
    chiffre_affaires: sale,
    montant_encaisse: paid,
    cout_revient: cost,
    cout_direct: cost,
    cout_source: costSource,
    marge_directe: margin,
    marge_montant: margin,
    marge: margin,
    marge_cash: cashMargin,
    taux_marge_directe: sale > 0 ? Number(((margin / sale) * 100).toFixed(1)) : 0,
    marge_taux: sale > 0 ? Number(((margin / sale) * 100).toFixed(1)) : 0,
    taux_marge_cash: paid > 0 ? Number(((cashMargin / paid) * 100).toFixed(1)) : 0,
    source_label: sourceLabel,
  };
}

export function calculateSalesMargin(input = {}, context = {}) {
  const quantity = qtyOf(input);
  const unitPrice = toNumber(input.unit_price ?? input.prix_unitaire ?? input.prix_vente ?? input.price);
  const saleAmount = cancelled(input) ? 0 : (saleTotalOf(input) || quantity * unitPrice);
  const paidAmount = effectivePaidAmount(input, saleAmount, context);
  const sourceModule = sourceModuleOf(input);
  const sourceId = sourceIdOf(input);
  const unit = lower(input.unit || input.unite || input.unité || '');
  const product = lower(`${input.product_name || input.produit || input.title || input.nom || ''}`);

  if (sourceModule.includes('animal')) {
    const animal = findById(context.animaux, sourceId);
    if (animal) {
      const cost = calculateAnimalCost({ animal, alimentationLogs: context.alimentationLogs, vaccins: context.vaccins, slaughterEvents: context.businessEvents, directCharges: context.businessEvents });
      const byKg = unit.includes('kg') && cost.costPerKg > 0;
      const directCost = byKg ? cost.costPerKg * quantity : cost.totalCost;
      return marginResult({ saleAmount, paidAmount, directCost, costSource: cost.feedCostSource === 'reel' ? 'cout_animal_reel' : 'cout_animal_estime', sourceLabel: animal.name || animal.tag || animal.id });
    }
  }

  if (sourceModule.includes('avicole') || sourceModule.includes('lot')) {
    const lot = findById(context.lots, sourceId);
    if (lot) {
      const cost = calculateAvicoleLotCost({ lot, alimentationLogs: context.alimentationLogs, productionLogs: context.productionLogs, slaughterEvents: context.businessEvents, directCharges: context.businessEvents });
      let directCost = cost.totalCost;
      if (unit.includes('kg') && cost.costPerKg > 0) directCost = cost.costPerKg * quantity;
      else if ((product.includes('oeuf') || product.includes('œuf')) && cost.costPerEgg > 0) directCost = cost.costPerEgg * quantity;
      else if (cost.costPerProducedSubject > 0) directCost = cost.costPerProducedSubject * quantity;
      else if (cost.costPerLiveSubject > 0) directCost = cost.costPerLiveSubject * quantity;
      return marginResult({ saleAmount, paidAmount, directCost, costSource: cost.feedCostSource === 'reel' ? 'cout_lot_reel' : 'cout_lot_estime', sourceLabel: lot.name || lot.id });
    }
  }

  if (sourceModule.includes('culture') || sourceModule.includes('recolte') || sourceModule.includes('récolte')) {
    const culture = findById(context.cultures, sourceId);
    if (culture) {
      const unitCost = cultureUnitCost(culture);
      const totalCost = cultureTotalCost(culture);
      const directCost = unitCost > 0 ? unitCost * quantity : totalCost;
      return marginResult({ saleAmount, paidAmount, directCost, costSource: unitCost > 0 ? 'cout_culture_unitaire' : 'cout_culture_total', sourceLabel: culture.nom || culture.type || culture.id });
    }
  }

  if (sourceModule.includes('stock')) {
    const stock = findById(context.stocks, sourceId);
    if (stock) {
      const directCost = unitPriceStock(stock) * quantity;
      return marginResult({ saleAmount, paidAmount, directCost, costSource: directCost > 0 ? 'cout_stock' : 'cout_stock_indisponible', sourceLabel: stock.produit || stock.id });
    }
  }

  const explicitCost = toNumber(input.cout_revient ?? input.cout_direct ?? input.cout_total ?? input.cost_total ?? input.total_cost ?? input.purchase_cost);
  return marginResult({ saleAmount, paidAmount, directCost: explicitCost, costSource: explicitCost > 0 ? 'cout_saisi' : 'cout_indisponible', sourceLabel: input.product_name || input.produit || input.title || input.id });
}

export function enrichWithSalesMargin(input = {}, context = {}) {
  const margin = calculateSalesMargin(input, context);
  return { ...input, chiffre_affaires: margin.chiffre_affaires, montant_encaisse: margin.montant_encaisse, cout_revient: margin.cout_revient, cout_direct: margin.cout_direct, cout_source: margin.cout_source, marge_directe: margin.marge_directe, marge_montant: margin.marge_montant, marge: margin.marge, marge_cash: margin.marge_cash, taux_marge_directe: margin.taux_marge_directe, marge_taux: margin.marge_taux, taux_marge_cash: margin.taux_marge_cash, marge_calculee_at: new Date().toISOString() };
}

export function summarizeSalesMargins(rows = [], context = {}) {
  const details = arr(rows).filter((row) => !cancelled(row)).map((row) => enrichWithSalesMargin(row, context));
  const ca = details.reduce((sum, row) => sum + toNumber(row.chiffre_affaires), 0);
  const encaisse = details.reduce((sum, row) => sum + toNumber(row.montant_encaisse), 0);
  const directCost = details.reduce((sum, row) => sum + toNumber(row.cout_revient), 0);
  const margin = ca - directCost;
  const cashMargin = encaisse - directCost;
  return { details, ca, encaisse, directCost, margin, cashMargin, marginRate: ca > 0 ? Number(((margin / ca) * 100).toFixed(1)) : 0, cashMarginRate: encaisse > 0 ? Number(((cashMargin / encaisse) * 100).toFixed(1)) : 0 };
}
