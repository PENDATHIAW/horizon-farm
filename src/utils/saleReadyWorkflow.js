import { toNumber } from './format';
import { isSaleReady, saleOpportunityKey, saleReadyPatch } from './saleReadiness';

const clean = (value) => String(value || '').trim();

export function mergeSaleReadySavePayload(before = {}, payload = {}) {
  const merged = { ...before, ...payload };
  if (!isSaleReady(merged)) return payload;
  return { ...payload, ...saleReadyPatch(merged) };
}

export function buildPersistedOpportunityPayload({
  sourceModule,
  sourceType,
  sourceId,
  title,
  productName,
  quantity = 1,
  unit = 'tete',
  unitPrice = 0,
  amount = 0,
  notes = '',
  priority = 'normale',
  status = 'ouverte',
  extra = {},
}) {
  const id = clean(sourceId);
  const key = saleOpportunityKey(sourceModule, id);
  const qty = Math.max(0, toNumber(quantity));
  const price = toNumber(unitPrice);
  const estimated = toNumber(amount) || Math.max(0, qty * price);
  return {
    ...extra,
    opportunity_key: key,
    dedupe_key: key,
    opportunity_type: sourceType,
    source_module: sourceModule,
    created_from: sourceModule,
    source_type: sourceType,
    source_id: id,
    related_id: id,
    entity_id: id,
    title,
    libelle: title,
    product_name: productName,
    produit: productName,
    description: notes,
    notes,
    reason: notes,
    quantity: qty,
    quantite: qty,
    unit,
    unite: unit,
    unit_price: price,
    estimated_value: estimated,
    estimated_amount: estimated,
    montant_estime: estimated,
    status,
    statut: status,
    priority,
    detected_at: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
  };
}

export function findOpportunityForSource(opportunities = [], sourceModule, sourceId) {
  const key = saleOpportunityKey(sourceModule, sourceId);
  const legacyKeys = [
    key,
    key.replace(/^animaux:/, 'animal-sale:'),
    key.replace(/^avicole:/, 'avicole-sale:'),
  ];
  return (Array.isArray(opportunities) ? opportunities : []).find((opp) => {
    const oppKey = clean(opp.opportunity_key || opp.dedupe_key || '');
    if (legacyKeys.includes(oppKey)) return true;
    const module = clean(opp.source_module || opp.created_from || '');
    const id = clean(opp.source_id || opp.entity_id || opp.related_id || opp.lot_id || opp.animal_id || '');
    return module.includes(sourceModule) && id === clean(sourceId);
  }) || null;
}
