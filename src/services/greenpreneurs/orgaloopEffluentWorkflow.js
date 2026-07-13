/**
 * Workflow terrain Orgaloop — collecte biosécurité → opportunité → vente tracée.
 */
import { makeId } from '../../utils/ids.js';
import { toNumber } from '../../utils/format.js';
import { ORGALOOP_EFFLUENT_CHANNEL } from '../../config/derfjGreenpreneurs.config.js';
import {
  buildOrgaloopEffluentOpportunity,
  isEffluentProduct,
  isOrgaloopEffluentSale,
  isOrgaloopChannelEnabled,
  isOrgaloopHybridStrategy,
  ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE,
} from './orgaloopEffluentChannel.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export function isOrgaloopEffluentPrimary() {
  return ORGALOOP_EFFLUENT_CHANNEL.strategy === 'vente_directe_orgaloop';
}

export function isOrgaloopHybridStrategyEnabled() {
  return ORGALOOP_EFFLUENT_CHANNEL.strategy === 'hybride_surplus_orgaloop';
}

export function orgaloopOpportunityKey(stockId = '') {
  return `orgaloop-effluent:${clean(stockId)}`;
}

export function isOrgaloopEffluentOpportunity(row = {}) {
  const text = norm(`${row.activity_type || ''} ${row.statut_activite || ''} ${row.canal || ''} ${row.marketplace || ''} ${row.created_from || ''} ${row.opportunity_key || ''}`);
  return text.includes('orgaloop') || text.includes('effluent_orgaloop');
}

export function findOrgaloopEffluentOpportunity(opportunities = [], stockId = '') {
  const key = orgaloopOpportunityKey(stockId);
  return arr(opportunities).find((row) =>
    String(row.opportunity_key || '') === key
    || (stockId && String(row.source_id || '') === clean(stockId) && isOrgaloopEffluentOpportunity(row))
    || (!stockId && isOrgaloopEffluentOpportunity(row)),
  );
}

function eventAlreadyExists(events = [], entityId, eventType) {
  return arr(events).some((row) => String(row.entity_id) === String(entityId) && norm(row.event_type) === norm(eventType));
}

function collectionEventType(profile = 'mixte') {
  if (profile === 'pondeuses' || profile === 'chair') return 'effluent_produit';
  return 'fumier_collecte';
}

/**
 * Remplace l'opportunité fumier générique par Orgaloop + events effluent.
 */
export function enhanceManureWorkflowForOrgaloop(workflow, { profileMeta } = {}) {
  if (!workflow || !isOrgaloopChannelEnabled()) return workflow;

  const meta = profileMeta?.profile ? profileMeta : workflow.profile || {};
  const profile = meta.profile || 'mixte';
  const stockId = workflow.stockId;

  const sacsCollected = toNumber(workflow.event?.fumier_sacs) || toNumber(workflow.stock?.last_movement_qty);
  const nextQty = toNumber(workflow.stock?.quantite);
  const unitPrice = toNumber(workflow.stock?.prix_unitaire ?? workflow.stock?.prixUnit) || toNumber(meta.unitPrice);
  const estimatedAmount = Math.max(0, nextQty * unitPrice);
  const opportunityKey = orgaloopOpportunityKey(stockId);
  const platformName = ORGALOOP_EFFLUENT_CHANNEL.platformName;

  const orgaloopBase = buildOrgaloopEffluentOpportunity({
    profile,
    sacs: nextQty,
    stockId,
    surplus: isOrgaloopHybridStrategy(),
  });

  const opportunity = {
    ...(workflow.opportunityExistingId ? { id: workflow.opportunityExistingId } : { id: workflow.opportunity?.id || makeId('OPP') }),
    opportunity_key: opportunityKey,
    dedupe_key: opportunityKey,
    ...orgaloopBase,
    source_module: 'stock',
    entity_type: 'stock',
    source_id: stockId,
    entity_id: stockId,
    related_id: stockId,
    quantity: nextQty,
    quantite: nextQty,
    unit_price: unitPrice,
    prix_unitaire: unitPrice,
    estimated_amount: estimatedAmount,
    montant_estime: estimatedAmount,
    valeur_estimee: estimatedAmount,
    estimated_value: estimatedAmount,
    status: 'ouverte',
    statut: 'ouverte',
    priority: 'moyenne',
    date: workflow.event?.date || today(),
    notes: isOrgaloopHybridStrategy()
      ? `${nextQty} sac(s) — fertilisation cultures prioritaire, surplus sur ${platformName}.`
      : `${nextQty} sac(s) — publication directe ${platformName} · ${ORGALOOP_EFFLUENT_CHANNEL.strategyLabel}`,
    ...(workflow.opportunityExistingId ? { updated_at: now() } : { created_at: now() }),
  };

  const effluentEvent = {
    id: makeId('EVT'),
    event_type: collectionEventType(profile),
    module_source: 'sante',
    entity_type: 'stock',
    entity_id: stockId,
    source_type: 'intervention_biosecurite',
    source_id: workflow.event?.source_id || '',
    title: `Effluent collecté · ${sacsCollected} sac(s) → ${platformName}`,
    description: [
      workflow.event?.description || '',
      `Canal vente : ${platformName} (vente directe, pas de stockage long terme).`,
    ].filter(Boolean).join('\n'),
    severity: 'info',
    status: 'nouveau',
    event_date: workflow.event?.event_date || today(),
    date: workflow.event?.date || today(),
    quantity: sacsCollected * 25,
    unit: 'kg',
    fumier_sacs: sacsCollected,
    fumier_profile: profile,
    canal: 'orgaloop',
    marketplace: 'orgaloop',
    amount: estimatedAmount,
    montant: estimatedAmount,
    linked_stock_id: stockId,
    linked_opportunity_key: opportunityKey,
    side_effects_managed: true,
  };

  if (workflow.event) {
    workflow.event.description = [
      workflow.event.description,
      `Valorisation prévue via ${platformName}.`,
    ].filter(Boolean).join('\n');
    workflow.event.canal = 'orgaloop';
    workflow.event.marketplace = 'orgaloop';
  }

  return {
    ...workflow,
    opportunity,
    opportunityExistingId: workflow.opportunityExistingId || '',
    extraEvents: [effluentEvent],
    orgaloopEnhanced: true,
  };
}

/** Crée une opportunité Orgaloop libre (pipeline commercial). */
export async function ensureOrgaloopEffluentOpportunity({
  opportunities = [],
  sacs = 0,
  profile = 'mixte',
  stockId = '',
  handlers = {},
} = {}) {
  if (!isOrgaloopChannelEnabled() || !handlers.onCreateOpportunity) return null;

  const existing = findOrgaloopEffluentOpportunity(opportunities, stockId);
  if (existing?.id) return existing;

  const payload = {
    id: makeId('OPP'),
    opportunity_key: stockId ? orgaloopOpportunityKey(stockId) : `orgaloop-effluent:libre:${today()}`,
    ...ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE,
    ...buildOrgaloopEffluentOpportunity({ profile, sacs, stockId }),
    quantity: sacs,
    quantite: sacs,
    date: today(),
    created_at: now(),
  };

  await handlers.onCreateOpportunity(payload);
  await handlers.onRefreshOpportunities?.();
  return payload;
}

/** Marque une opportunité comme publiée sur Orgaloop (plateforme externe). */
export async function markEffluentPublishedOnOrgaloop({
  opportunity = {},
  handlers = {},
} = {}) {
  const platformName = ORGALOOP_EFFLUENT_CHANNEL.platformName;
  const stockId = opportunity.source_id || opportunity.entity_id || opportunity.id;

  if (handlers.onUpdateOpportunity && opportunity.id) {
    await handlers.onUpdateOpportunity(opportunity.id, {
      status: 'en_cours',
      statut: 'en_cours',
      canal: 'orgaloop',
      marketplace: 'orgaloop',
      published_on_orgaloop_at: now(),
      notes: `${opportunity.notes || ''}\nPublié sur ${platformName} le ${today()}.`.trim(),
    });
  }

  if (handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({
      id: makeId('EVT'),
      event_type: 'effluent_stocke',
      module_source: 'commercial',
      entity_type: 'opportunity',
      entity_id: opportunity.id || stockId,
      source_id: stockId,
      title: `Publié sur ${platformName}`,
      description: `Annonce effluent publiée sur la plateforme ${platformName}.`,
      canal: 'orgaloop',
      marketplace: 'orgaloop',
      quantity: toNumber(opportunity.quantity ?? opportunity.quantite) * 25,
      fumier_sacs: toNumber(opportunity.quantity ?? opportunity.quantite),
      event_date: today(),
      date: today(),
      severity: 'info',
      side_effects_managed: true,
    });
  }

  await handlers.onRefreshOpportunities?.();
  await handlers.onRefreshBusinessEvents?.();
}

/** À la validation vente — trace effluent_vendu_orgaloop. */
export async function emitOrgaloopEffluentSaleSideEffects({
  order = {},
  items = [],
  form = {},
  handlers = {},
  context = {},
} = {}) {
  if (!isOrgaloopChannelEnabled() || !handlers.onCreateBusinessEvent) return { emitted: false };

  const saleRow = {
    ...order,
    canal: form.canal || order.canal || order.channel || order.marketplace,
    marketplace: form.marketplace || order.marketplace,
    product_name: order.product_name || items[0]?.product_name,
    quantity: order.quantity ?? items[0]?.quantity,
    quantite: order.quantity ?? items[0]?.quantity,
    unit: order.unit ?? items[0]?.unit,
    unite: order.unit ?? items[0]?.unit,
    fumier_sacs: form.fumier_sacs || order.fumier_sacs,
  };

  const isOrgaloopSale = isOrgaloopEffluentSale(saleRow)
    || (norm(form.canal || order.canal) === 'orgaloop' && isEffluentProduct(saleRow));

  if (!isOrgaloopSale) return { emitted: false, reason: 'not_orgaloop_effluent' };

  const orderId = order.id;
  const events = context.businessEvents || context.business_events || [];
  if (eventAlreadyExists(events, orderId, 'effluent_vendu_orgaloop')) {
    return { emitted: false, reason: 'already_emitted' };
  }

  const qty = toNumber(saleRow.quantity ?? saleRow.quantite ?? 1);
  const isSacs = norm(`${saleRow.unit || saleRow.unite || ''}`).includes('sac') || saleRow.fumier_sacs;
  const kg = isSacs ? qty * 25 : qty;

  await handlers.onCreateBusinessEvent({
    id: makeId('EVT'),
    event_type: 'effluent_vendu_orgaloop',
    module_source: 'commercial',
    entity_type: 'sales_order',
    entity_id: orderId,
    source_record_id: orderId,
    title: `Vente effluent ${ORGALOOP_EFFLUENT_CHANNEL.platformName}`,
    description: `${kg} kg vendus via ${ORGALOOP_EFFLUENT_CHANNEL.platformName} · ${order.product_name || 'effluent'}`,
    quantity: kg,
    unit: 'kg',
    fumier_sacs: isSacs ? qty : Math.round(kg / 25),
    montant: toNumber(order.montant_total),
    amount: toNumber(order.montant_total),
    canal: 'orgaloop',
    marketplace: 'orgaloop',
    event_date: order.date || today(),
    date: order.date || today(),
    severity: 'info',
    side_effects_managed: true,
  });

  await handlers.onRefreshBusinessEvents?.();
  return { emitted: true, soldKg: kg };
}
