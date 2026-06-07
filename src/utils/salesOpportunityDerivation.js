import { toNumber } from './format';
import { avicoleActiveCount, avicoleHasActiveBirds } from './avicoleMetrics';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const openStatuses = ['ouverte', 'nouvelle', 'a_traiter', 'à_traiter', 'active', 'prospect'];
const closedStatuses = ['convertie', 'vendue', 'fermee', 'fermée', 'annulee', 'annulée', 'inactive', 'cloture', 'clôturé', 'abattu', 'transforme', 'transformé', 'perdu', 'vendu'];

export function salesOpportunityStatus(row = {}) {
  return lower(row.status || row.statut || 'ouverte');
}

export function isOpenSalesOpportunity(row = {}) {
  const status = salesOpportunityStatus(row);
  if (closedStatuses.includes(status)) return false;
  return openStatuses.includes(status) || !status;
}

export function salesOpportunityKey(row = {}) {
  const direct = clean(row.opportunity_key);
  if (direct) return direct;
  const module = clean(row.source_module || row.created_from || row.module_source);
  const sourceId = clean(row.source_id || row.related_id || row.entity_id);
  if (module && sourceId) return `${module}:${sourceId}`;
  return clean(row.id);
}

export function salesOpportunityAmount(row = {}) {
  const amount = toNumber(row.estimated_amount ?? row.montant_estime ?? row.amount ?? row.total);
  if (amount > 0) return amount;
  return Math.max(1, toNumber(row.quantity ?? row.quantite ?? 1)) * toNumber(row.unit_price ?? row.prix_unitaire ?? row.prix_vente ?? 0);
}

function lotReadyForSale(lot = {}) {
  if (!clean(lot.id) || !avicoleHasActiveBirds(lot)) return false;
  const status = lower(lot.status || lot.statut);
  return Boolean(lot.pret_vente_confirme || lot.pret_a_la_vente || lot.ready_for_sale || lot.sale_ready)
    || ['pret_a_la_vente', 'pret_a_vendre', 'pret_a_vendre_reforme', 'a_reformer'].includes(status);
}

function animalReadyForSale(animal = {}) {
  const status = lower(animal.status || animal.statut || animal.sale_status);
  return clean(animal.id) && !['vendu', 'decede', 'décédé', 'sorti', 'annule', 'mort', 'vole', 'volé'].includes(status)
    && Boolean(animal.pret_vente_confirme || animal.pret_a_la_vente || animal.ready_for_sale || animal.sale_ready || ['pret_a_la_vente', 'pret_a_vendre'].includes(status));
}

function cultureReadyForSale(culture = {}) {
  const status = lower(culture.status || culture.statut || culture.sale_status);
  const qty = toNumber(culture.quantite_recoltee ?? culture.recolte_disponible ?? culture.stock_recolte ?? culture.quantity_available);
  return clean(culture.id) && qty > 0 && !['vendue', 'vendu', 'perdu', 'annulee', 'annulée'].includes(status)
    && (Boolean(culture.pret_a_vendre || culture.ready_for_sale || culture.sale_ready) || ['recoltee', 'récoltée', 'pret_a_vendre', 'pret_a_la_vente'].includes(status));
}

function stockReadyForSale(stock = {}) {
  const status = lower(stock.status || stock.statut || stock.sale_status);
  const qty = toNumber(stock.quantite ?? stock.quantity ?? stock.stock_disponible);
  return clean(stock.id) && qty > 0 && !['reserve', 'réservé', 'bloque', 'bloqué', 'perime', 'périmé', 'epuise', 'épuisé'].includes(status)
    && Boolean(stock.pret_a_vendre || stock.ready_for_sale || stock.sale_ready || stock.vendable);
}

function persistedTargetStillActive(opp = {}, { lots = [], animaux = [], cultures = [], stocks = [] } = {}) {
  const source = lower(opp.source_module || opp.created_from || opp.module_source || opp.source_type || '');
  const id = clean(opp.source_id || opp.related_id || opp.entity_id || opp.lot_id || opp.animal_id || opp.culture_id || opp.stock_id);
  if (!id) return true;
  if (source.includes('avicole') || source.includes('lot')) {
    const lot = arr(lots).find((item) => String(item.id) === id);
    return Boolean(lot && avicoleHasActiveBirds(lot));
  }
  if (source.includes('animal')) {
    const animal = arr(animaux).find((item) => String(item.id) === id);
    return Boolean(animal && animalReadyForSale(animal));
  }
  if (source.includes('culture')) {
    const culture = arr(cultures).find((item) => String(item.id) === id);
    return Boolean(culture && cultureReadyForSale(culture));
  }
  if (source.includes('stock')) {
    const stock = arr(stocks).find((item) => String(item.id) === id);
    return Boolean(stock && stockReadyForSale(stock));
  }
  return true;
}

function lotOpportunity(lot = {}) {
  const qty = avicoleActiveCount(lot);
  const unitPrice = toNumber(lot.prix_vente_prevu || lot.prix_vente_estime || lot.sale_price || lot.prix_unitaire_vente);
  return {
    id: `DERIVED-AVICOLE-${lot.id}`,
    opportunity_key: `avicole:${lot.id}`,
    source_module: 'avicole',
    source_type: 'lot_avicole',
    source_id: lot.id,
    related_id: lot.id,
    title: `Lot avicole prêt à vendre: ${lot.name || lot.nom || lot.id}`,
    product_name: `${lot.name || lot.nom || lot.id} · ${lot.type || 'Lot avicole'}`,
    quantity: qty,
    unit: 'tete',
    unit_price: unitPrice,
    estimated_amount: Math.max(0, qty * unitPrice),
    status: 'ouverte',
    statut: 'ouverte',
    is_derived: true,
    created_from: 'avicole',
    notes: 'Source prête à convertir détectée depuis le module Avicole.',
  };
}

function animalOpportunity(animal = {}) {
  const unitPrice = toNumber(animal.prix_vente_prevu || animal.prix_vente_estime || animal.sale_price || animal.prix_unitaire_vente);
  return { id: `DERIVED-ANIMAL-${animal.id}`, opportunity_key: `animaux:${animal.id}`, source_module: 'animaux', source_type: 'animal', source_id: animal.id, related_id: animal.id, title: `Animal prêt à vendre: ${animal.name || animal.nom || animal.id}`, product_name: `${animal.name || animal.nom || animal.id} · ${animal.type || 'Animal'}`, quantity: 1, unit: 'tete', unit_price: unitPrice, estimated_amount: unitPrice, status: 'ouverte', statut: 'ouverte', is_derived: true, created_from: 'animaux', notes: 'Source prête à convertir détectée depuis le module Animaux.' };
}

function cultureOpportunity(culture = {}) {
  const qty = toNumber(culture.quantite_recoltee ?? culture.recolte_disponible ?? culture.stock_recolte ?? culture.quantity_available);
  const unitPrice = toNumber(culture.prix_vente_prevu || culture.prix_vente_estime || culture.sale_price || culture.prix_unitaire_vente);
  return { id: `DERIVED-CULTURE-${culture.id}`, opportunity_key: `cultures:${culture.id}`, source_module: 'cultures', source_type: 'culture', source_id: culture.id, related_id: culture.id, title: `Récolte prête à vendre: ${culture.nom || culture.name || culture.id}`, product_name: culture.nom || culture.name || culture.id, quantity: qty, unit: culture.unite || culture.unit || 'kg', unit_price: unitPrice, estimated_amount: Math.max(0, qty * unitPrice), status: 'ouverte', statut: 'ouverte', is_derived: true, created_from: 'cultures', notes: 'Source prête à convertir détectée depuis le module Cultures.' };
}

function stockOpportunity(stock = {}) {
  const qty = toNumber(stock.quantite ?? stock.quantity ?? stock.stock_disponible);
  const unitPrice = toNumber(stock.prix_vente || stock.sale_price || stock.prix_unitaire_vente);
  return { id: `DERIVED-STOCK-${stock.id}`, opportunity_key: `stock:${stock.id}`, source_module: 'stock', source_type: 'stock', source_id: stock.id, related_id: stock.id, title: `Stock prêt à vendre: ${stock.produit || stock.name || stock.id}`, product_name: stock.produit || stock.name || stock.id, quantity: qty, unit: stock.unite || stock.unit || 'unite', unit_price: unitPrice, estimated_amount: Math.max(0, qty * unitPrice), status: 'ouverte', statut: 'ouverte', is_derived: true, created_from: 'stock', notes: 'Source prête à convertir détectée depuis le module Stock.' };
}

function applyUnifiedPricing(opp = {}, { lots = [], animaux = [], alimentationLogs = [], productionLogs = [], vaccins = [], marketPrices = [] } = {}) {
  const source = lower(opp.source_module || opp.created_from || opp.module_source || '');
  const id = clean(opp.source_id || opp.related_id || opp.entity_id);
  const configuredUnit = toNumber(opp.unit_price ?? opp.prix_unitaire ?? opp.prix_vente);

  if ((source.includes('avicole') || lower(opp.source_type).includes('lot')) && id) {
    const lot = arr(lots).find((item) => String(item.id) === id);
    if (lot) {
      const pricing = recommendAvicoleLotPrice({ lot, alimentationLogs, productionLogs, marketPrices });
      const qty = Math.max(1, toNumber(opp.quantity ?? opp.quantite ?? avicoleActiveCount(lot)));
      const unit = configuredUnit > 0 ? configuredUnit : pricing.recommendedUnitPrice;
      return {
        ...opp,
        quantity: qty,
        quantite: qty,
        unit_price: unit,
        prix_unitaire: unit,
        estimated_amount: Math.max(0, qty * unit),
        pricing_alerts: pricing.alerts,
        pricing_source: pricing.costSource,
        pricing_margin_rate: pricing.marginRate,
      };
    }
  }

  if (source.includes('animal') && id) {
    const animal = arr(animaux).find((item) => String(item.id) === id);
    if (animal) {
      const pricing = recommendAnimalSalePrice({ animal, alimentationLogs, vaccins, marketPrices });
      const unit = configuredUnit > 0 ? configuredUnit : pricing.recommendedPrice;
      return {
        ...opp,
        quantity: 1,
        quantite: 1,
        unit_price: unit,
        prix_unitaire: unit,
        estimated_amount: unit,
        pricing_alerts: pricing.alerts,
        pricing_source: pricing.costSource,
        pricing_margin_rate: pricing.marginRate,
      };
    }
  }

  return opp;
}

export function deriveSalesOpportunities({
  opportunities = [],
  lots = [],
  animaux = [],
  cultures = [],
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  marketPrices = [],
} = {}) {
  const pricingContext = { lots, animaux, alimentationLogs, productionLogs, vaccins, marketPrices };
  const persisted = arr(opportunities)
    .filter(isOpenSalesOpportunity)
    .filter((opp) => persistedTargetStillActive(opp, { lots, animaux, cultures, stocks }))
    .map((opp) => applyUnifiedPricing(opp, pricingContext));
  const derived = [
    ...arr(lots).filter(lotReadyForSale).map(lotOpportunity),
    ...arr(animaux).filter(animalReadyForSale).map(animalOpportunity),
    ...arr(cultures).filter(cultureReadyForSale).map(cultureOpportunity),
    ...arr(stocks).filter(stockReadyForSale).map(stockOpportunity),
  ].map((opp) => applyUnifiedPricing(opp, pricingContext));
  const existingKeys = new Set(persisted.map(salesOpportunityKey));
  const dedupedDerived = derived.filter((opp) => !existingKeys.has(salesOpportunityKey(opp)));
  return [...persisted, ...dedupedDerived];
}
