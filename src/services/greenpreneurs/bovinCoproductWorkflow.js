/**
 * Flux coproduits bovins (suif, os) — événements ERP + stock + opportunités phase future.
 */
import { makeId } from '../../utils/ids.js';
import { toNumber } from '../../utils/format.js';
import {
  CIRCULAR_SIMULATION_MONTHLY_KG,
  VALORISATION_OPPORTUNITY_TEMPLATES,
} from '../../config/derfjGreenpreneurs.config.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

const CLOSED_EXIT = ['vendu', 'abattu', 'sorti', 'cloture', 'clôture'];

export function isBovinAnimal(animal = {}) {
  const text = norm(`${animal.espece || ''} ${animal.type || ''} ${animal.race || ''} ${animal.categorie || ''} ${animal.species || ''}`);
  return text.includes('bovin') || text.includes('boeuf') || text.includes('vache') || text.includes('taureau');
}

export function isBovinCoproductExitStatus(status = '') {
  const s = norm(status);
  return CLOSED_EXIT.some((w) => s.includes(w));
}

export function becameBovinCoproductExit(before = {}, after = {}) {
  if (!isBovinAnimal(after) && !isBovinAnimal(before)) return false;
  const wasExit = isBovinCoproductExitStatus(before.status || before.statut);
  const isExit = isBovinCoproductExitStatus(after.status || after.statut);
  return !wasExit && isExit;
}

export function estimateBovinCoproductKg(animal = {}, overrides = {}) {
  const carcass = toNumber(animal.poids_carcasse ?? animal.poids_sortie ?? animal.weight);
  const scale = carcass > 0 ? Math.min(2, Math.max(0.6, carcass / 180)) : 1;
  const suifKg = Number((toNumber(overrides.suifKg) || CIRCULAR_SIMULATION_MONTHLY_KG.suif_par_bovin * scale).toFixed(2));
  const osKg = Number((toNumber(overrides.osKg) || CIRCULAR_SIMULATION_MONTHLY_KG.os_par_bovin * scale).toFixed(2));
  return { suifKg, osKg, totalKg: Number((suifKg + osKg).toFixed(2)), sourceType: carcass > 0 ? 'erp_real' : 'simulation' };
}

function eventAlreadyExists(events = [], animalId, eventType) {
  return arr(events).some((row) => String(row.entity_id) === String(animalId) && norm(row.event_type) === norm(eventType));
}

function stockKey(produit, sourceRecordId) {
  return `${norm(produit)}::${sourceRecordId}`;
}

async function upsertCoproductStock({
  stocks = [],
  onCreateStock,
  onUpdateStock,
  produit,
  categorie,
  quantityDelta,
  sourceRecordId,
  animalLabel,
  farmId,
}) {
  const delta = toNumber(quantityDelta);
  if (!delta || delta <= 0 || (!onCreateStock && !onUpdateStock)) return null;

  const existing = arr(stocks).find((row) =>
    stockKey(row.produit, row.source_record_id || row.origine_id) === stockKey(produit, sourceRecordId),
  );

  if (existing?.id && onUpdateStock) {
    const prev = toNumber(existing.quantite ?? existing.quantity);
    await onUpdateStock(existing.id, {
      quantite: Number((prev + delta).toFixed(2)),
      last_movement_type: 'entree_coproduit',
      last_movement_label: `Coproduit bovin · ${animalLabel}`,
      last_movement_qty: delta,
      last_movement_at: new Date().toISOString(),
    });
    return existing.id;
  }

  if (!onCreateStock) return null;
  const id = makeId('STKCOP');
  await onCreateStock({
    id,
    produit,
    categorie,
    quantite: delta,
    unite: 'kg',
    source_module: 'elevage',
    source_type: 'coproduit_bovin',
    source_record_id: sourceRecordId,
    origine_label: animalLabel,
    notes: 'Coproduit généré à la sortie bovin',
    farm_id: farmId || '',
  });
  return id;
}

function hasValorisationOpportunity(opportunities = [], key) {
  const template = VALORISATION_OPPORTUNITY_TEMPLATES[key];
  if (!template) return false;
  return arr(opportunities).some((opp) => {
    const text = norm(`${opp.title || ''} ${opp.activity_type || ''} ${opp.phase || ''}`);
    return text.includes(norm(template.match)) || norm(opp.created_from) === norm(template.created_from);
  });
}

async function ensureValorisationOpportunities({ opportunities = [], handlers = {}, animalLabel = '' }) {
  const { onCreateOpportunity, onRefreshOpportunities } = handlers;
  if (!onCreateOpportunity) return;

  for (const key of ['tallow_go', 'bovinia']) {
    if (hasValorisationOpportunity(opportunities, key)) continue;
    const template = VALORISATION_OPPORTUNITY_TEMPLATES[key];
    await onCreateOpportunity({
      id: makeId('OPP'),
      ...template,
      notes: `${template.notes} · déclenché après sortie bovin (${animalLabel})`,
      status: 'a_traiter',
      statut: 'a_traiter',
      date: today(),
      created_at: new Date().toISOString(),
    });
  }
  await onRefreshOpportunities?.();
}

/**
 * Émet suif/os en business_events (+ stock optionnel) lors d'une sortie bovin.
 */
export async function emitBovinCoproductSideEffects({
  animal = {},
  animalId = '',
  date = today(),
  handlers = {},
  context = {},
  relatedId = '',
  issueKey = '',
  farmId = '',
  sourceType,
  skipStock = false,
  skipOpportunities = false,
} = {}) {
  const id = animalId || animal.id;
  if (!id || !isBovinAnimal(animal)) return { emitted: false, reason: 'not_bovin' };

  const {
    onCreateBusinessEvent,
    onCreateStock,
    onUpdateStock,
    onCreateOpportunity,
    onRefreshOpportunities,
    onRefreshBusinessEvents,
  } = handlers;

  if (!onCreateBusinessEvent) return { emitted: false, reason: 'no_handler' };

  const events = context.businessEvents || context.business_events || context.existingEvents || [];
  if (eventAlreadyExists(events, id, 'coproduit_bovin_collecte')) {
    return { emitted: false, reason: 'already_emitted' };
  }

  const { suifKg, osKg, totalKg, sourceType: qtySource } = estimateBovinCoproductKg(animal);
  const resolvedSource = sourceType || qtySource;
  const animalLabel = animal.name || animal.nom || animal.boucle_numero || id;

  const emitOne = async (eventType, quantity, title) => {
    if (eventAlreadyExists(events, id, eventType)) return false;
    await onCreateBusinessEvent({
      id: makeId('EVT'),
      event_type: eventType,
      module_source: 'elevage',
      entity_type: 'animal',
      entity_id: id,
      related_id: relatedId,
      source_record_id: relatedId || id,
      title,
      description: `${quantity} kg · ${animalLabel}`,
      quantity,
      unit: 'kg',
      event_date: date,
      date,
      issue_key: issueKey,
      farm_id: farmId,
      source_type: resolvedSource,
      side_effects_managed: true,
    });
    return true;
  };

  const created = [];
  if (await emitOne('coproduit_bovin_collecte', totalKg, `Coproduits bovins · ${animalLabel}`)) created.push('coproduit_bovin_collecte');
  if (await emitOne('suif_collecte', suifKg, `Suif collecté · ${animalLabel}`)) created.push('suif_collecte');
  if (await emitOne('os_collectes', osKg, `Os collectés · ${animalLabel}`)) created.push('os_collectes');

  if (!created.length) return { emitted: false, reason: 'already_emitted', suifKg, osKg };

  if (!skipStock) {
    const stocks = context.stocks || [];
    await upsertCoproductStock({
      stocks,
      onCreateStock,
      onUpdateStock,
      produit: `Suif brut · ${animalLabel}`,
      categorie: 'suif',
      quantityDelta: suifKg,
      sourceRecordId: id,
      animalLabel,
      farmId,
    });
    await upsertCoproductStock({
      stocks,
      onCreateStock,
      onUpdateStock,
      produit: `Os bovin · ${animalLabel}`,
      categorie: 'os',
      quantityDelta: osKg,
      sourceRecordId: `${id}-os`,
      animalLabel,
      farmId,
    });
  }

  if (!skipOpportunities) {
    await ensureValorisationOpportunities({
      opportunities: context.opportunities || context.sales_opportunities || [],
      handlers: { onCreateOpportunity, onRefreshOpportunities },
      animalLabel,
    });
  }

  await onRefreshBusinessEvents?.();
  return { emitted: true, created, suifKg, osKg, sourceType: resolvedSource };
}
