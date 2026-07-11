import { FUMIER_SALE_PRICE_BY_PROFILE } from './farmAgronomyConstants';
import { toNumber } from './format';
import { makeId } from './ids';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function isManureStock(row = {}) {
  const text = norm(`${row.categorie || ''} ${row.category || ''} ${row.produit || ''} ${row.name || ''}`);
  return text.includes('fumier');
}

export function manureStockKey(profile = 'mixte') {
  return `fumier-stock:${profile}`;
}

export function manureOpportunityKey(stockId = '') {
  return `fumier-sale:${clean(stockId)}`;
}

export function resolveManureProfile(target = {}, lots = [], animaux = []) {
  if (target.module_lie === 'avicole') {
    const lotId = clean(target.related_id);
    const lot = (Array.isArray(lots) ? lots : []).find((row) => String(row.id) === lotId)
      || (Array.isArray(lots) ? lots : []).find((row) => (target.target_ids || []).includes(row.id));
    const lotType = norm(`${lot?.type || ''} ${lot?.activite || ''} ${lot?.name || ''} ${lot?.nom || ''}`);
    if (lotType.includes('chair') || lotType.includes('poulet')) {
      return { profile: 'chair', label: 'Fumier chair', activity: 'fumier_chair', unitPrice: FUMIER_SALE_PRICE_BY_PROFILE.chair };
    }
    return { profile: 'pondeuses', label: 'Fumier pondeuses', activity: 'fumier_pondeuses', unitPrice: FUMIER_SALE_PRICE_BY_PROFILE.pondeuses };
  }
  if (target.module_lie === 'animaux') {
    return { profile: 'bovins', label: 'Fumier bœufs', activity: 'fumier_bovins', unitPrice: FUMIER_SALE_PRICE_BY_PROFILE.bovins };
  }
  return { profile: 'mixte', label: 'Fumier', activity: 'fumier_chair', unitPrice: FUMIER_SALE_PRICE_BY_PROFILE.mixte };
}

export function findManureStock(stocks = [], profile = 'mixte') {
  const key = manureStockKey(profile);
  return (Array.isArray(stocks) ? stocks : []).find((row) => {
    if (String(row.stock_key || row.dedupe_key || '') === key) return true;
    if (!isManureStock(row)) return false;
    const text = norm(`${row.categorie || ''} ${row.category || ''} ${row.produit || ''}`);
    if (profile === 'pondeuses') return text.includes('pondeuse') || text.includes('oeuf');
    if (profile === 'chair') return text.includes('chair') || text.includes('poulet');
    if (profile === 'bovins') return text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf');
    return true;
  });
}

export function findManureOpportunity(opportunities = [], stockId = '') {
  const key = manureOpportunityKey(stockId);
  return (Array.isArray(opportunities) ? opportunities : []).find((row) => {
    if (String(row.opportunity_key || '') === key) return true;
    return String(row.source_id || row.related_id || '') === clean(stockId)
      && norm(`${row.source_type || ''} ${row.product_name || ''} ${row.title || ''}`).includes('fumier');
  });
}

export function buildManureCollectionWorkflow({
  intervention = {},
  target = {},
  sacs = 0,
  profileMeta = {},
  stocks = [],
  opportunities = [],
  date = today(),
} = {}) {
  const qty = Math.max(0, toNumber(sacs));
  if (qty <= 0 || !intervention?.id) return null;

  const meta = profileMeta?.profile ? profileMeta : resolveManureProfile(target);
  const materialType = clean(intervention.biosecurity_material_type || intervention.matiere_type || 'fumier') || 'fumier';
  const sanitaryStatus = clean(intervention.biosecurity_status || intervention.statut_sanitaire || 'normal') || 'normal';
  const destination = clean(intervention.biosecurity_destination || intervention.destination || '');
  const nextStep = clean(intervention.biosecurity_next_step || intervention.prochaine_action || intervention.prochaine_etape || '');
  const unitWeightKg = toNumber(intervention.poids_estime_par_sac || intervention.weight_per_bag_kg);
  const totalWeightKg = toNumber(intervention.poids_total_calcule || intervention.poids_total_kg) || (unitWeightKg > 0 ? qty * unitWeightKg : 0);
  const destinationBlocked = ['suspect', 'contamine', 'contaminé'].includes(norm(sanitaryStatus)) && norm(destination) === 'parcelle';
  const stockKey = manureStockKey(meta.profile);
  const productName = `${materialType === 'fumier' ? meta.label : materialType} (sacs)`;
  const existingStock = findManureStock(stocks, meta.profile);
  const nextQty = toNumber(existingStock?.quantite) + qty;
  const unitPrice = toNumber(existingStock?.prixUnit ?? existingStock?.prix_unitaire) || meta.unitPrice;

  const stockPayload = {
    stock_key: stockKey,
    dedupe_key: stockKey,
    produit: productName,
    name: productName,
    categorie: 'fumier',
    category: meta.activity,
    activite_liee: meta.activity,
    quantite: nextQty,
    quantity: nextQty,
    poids_total_kg: toNumber(existingStock?.poids_total_kg) + totalWeightKg,
    total_weight_kg: toNumber(existingStock?.total_weight_kg) + totalWeightKg,
    poids_estime_par_sac: unitWeightKg,
    unite: 'sac',
    unit: 'sac',
    seuil: 0,
    prixUnit: unitPrice,
    prix_unitaire: unitPrice,
    prix_vente: unitPrice,
    prix_vente_unitaire: unitPrice,
    vendable: true,
    pret_a_la_vente: true,
    ready_for_sale: true,
    sale_ready: true,
    source_module: 'sante',
    source_type: 'intervention_biosecurite',
    source_id: intervention.id,
    source_record_id: stockKey,
    related_id: intervention.id,
    linked_health_intervention_id: intervention.id,
    date_entree: date,
    last_movement_type: 'entree_fumier',
    last_movement_qty: qty,
    last_movement_label: `Collecte nettoyage · ${target.target_summary || intervention.id}`,
    last_movement_at: now(),
    material_type: materialType,
    statut_sanitaire: sanitaryStatus,
    sanitary_status: sanitaryStatus,
    destination_prevue: destination,
    prochaine_etape: nextStep,
    destination_blocked: destinationBlocked,
    notes: `${qty} sac(s) collectés lors du nettoyage (${intervention.zone_traitee || target.target_summary || '—'}).${totalWeightKg ? ` Poids estimé ${Math.round(totalWeightKg)} kg.` : ''}`,
  };

  const stockId = existingStock?.id || makeId('STK');
  const opportunityKey = manureOpportunityKey(stockId);
  const existingOpportunity = findManureOpportunity(opportunities, stockId);
  const estimatedAmount = Math.max(0, nextQty * unitPrice);

  const opportunityPayload = {
    opportunity_key: opportunityKey,
    dedupe_key: opportunityKey,
    opportunity_type: 'fumier',
    title: `Vente ${productName}`,
    libelle: `Vente ${productName}`,
    source_module: 'stock',
    created_from: 'sante',
    source_type: 'fumier',
    entity_type: 'stock',
    source_id: stockId,
    entity_id: stockId,
    related_id: stockId,
    product_name: productName,
    produit: productName,
    quantity: nextQty,
    quantite: nextQty,
    poids_total_kg: toNumber(existingStock?.poids_total_kg) + totalWeightKg,
    unit: 'sac',
    unite: 'sac',
    unit_price: unitPrice,
    prix_unitaire: unitPrice,
    estimated_amount: estimatedAmount,
    montant_estime: estimatedAmount,
    valeur_estimee: estimatedAmount,
    status: 'ouverte',
    statut: 'ouverte',
    priority: 'moyenne',
    date,
    blocked_reason: destinationBlocked ? 'Matière suspecte/contaminée non utilisable en parcelle sans validation.' : '',
    notes: `${nextQty} sac(s) disponibles · ${target.target_summary || ''}${destination ? ` · destination ${destination}` : ''}`.trim(),
  };

  return {
    profile: meta,
    stockExistingId: existingStock?.id || '',
    stockId,
    opportunityExistingId: existingOpportunity?.id || '',
    stock: existingStock?.id ? stockPayload : { id: stockId, ...stockPayload },
    opportunity: existingOpportunity?.id
      ? { ...opportunityPayload, updated_at: now() }
      : { id: makeId('OPP'), ...opportunityPayload, created_at: now() },
    event: {
      id: makeId('EVT'),
      event_type: 'entree_fumier',
      module_source: 'sante',
      entity_type: 'stock',
      entity_id: stockId,
      source_type: 'intervention_biosecurite',
      source_id: intervention.id,
      title: `Fumier collecté · ${qty} sac(s)`,
      description: [
        `Intervention: ${intervention.nom || intervention.type_intervention || intervention.id}`,
        `Cible: ${target.target_summary || '—'}`,
        `Stock: ${nextQty} sac(s) · ${productName}`,
        'Opportunité de vente préparée.',
      ].join('\n'),
      severity: 'info',
      status: 'nouveau',
      event_date: date,
      date,
      amount: estimatedAmount,
      montant: estimatedAmount,
      linked_stock_id: stockId,
      linked_opportunity_key: opportunityKey,
      fumier_sacs: qty,
      fumier_profile: meta.profile,
      material_type: materialType,
      statut_sanitaire: sanitaryStatus,
      destination,
      prochaine_etape: nextStep,
      poids_estime_par_sac: unitWeightKg,
      poids_total_kg: totalWeightKg,
      destination_blocked: destinationBlocked,
      saisies_evitees: 3,
    },
    task: nextStep ? {
      id: makeId('TSK'),
      title: nextStep,
      module_lie: 'sante',
      related_id: intervention.id,
      source_module: 'sante',
      source_record_id: intervention.id,
      task_dedupe_key: `biosecurity-next:${intervention.id}:${norm(nextStep)}`,
      due_date: date,
      priority: destinationBlocked ? 'haute' : 'moyenne',
      status: 'a_faire',
    } : null,
    alert: !destination || destinationBlocked ? {
      id: makeId('ALT'),
      title: destinationBlocked ? 'Destination culture bloquée' : 'Destination matière organique manquante',
      message: destinationBlocked
        ? 'Matière suspecte ou contaminée : validation obligatoire avant usage en parcelle.'
        : 'Choisir compostage, stockage, parcelle ou évacuation.',
      module_source: 'sante',
      entity_type: 'intervention_biosecurite',
      entity_id: intervention.id,
      severity: destinationBlocked ? 'haute' : 'moyenne',
      status: 'nouvelle',
      alert_dedupe_key: `biosecurity-organic:${intervention.id}`,
    } : null,
  };
}
