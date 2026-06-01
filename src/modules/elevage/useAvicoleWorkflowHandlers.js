import { makeId } from '../../utils/ids';
import { avicoleActiveCount } from '../../utils/avicoleMetrics';
import { isSaleReady, saleOpportunityKey } from '../../utils/saleReadiness';
import { buildPersistedOpportunityPayload, findOpportunityForSource, mergeSaleReadySavePayload } from '../../utils/saleReadyWorkflow';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isChair = (lot = {}) => { const text = lotText(lot); return text.includes('chair') || text.includes('broiler'); };
const labelOf = (lot = {}) => lot.name || lot.nom || lot.id || 'Lot avicole';
const mortalityOf = (lot = {}) => num(lot.mortality ?? lot.morts ?? lot.dead_count);
const initialOf = (lot = {}) => num(lot.initial_count ?? lot.effectif_initial);
const mortalityRateOf = (lot = {}) => initialOf(lot) > 0 ? Math.round((mortalityOf(lot) / initialOf(lot)) * 100) : 0;
const lossValueOf = (lot = {}) => num(lot.valeur_perte_estimee ?? lot.perte_estimee ?? lot.pertes_mortalite_estimees);
const isLossClosedLot = (lot = {}) => ['perdu', 'perdu_mortalite', 'cloture_perte'].includes(norm(lot.status || lot.statut || '')) || (avicoleActiveCount(lot) <= 0 && initialOf(lot) > 0);
const isReadyForSale = (lot = {}) => isSaleReady(lot);
const estimatedAmount = (lot = {}) => num(lot.prix_vente_reel ?? lot.sale_price ?? lot.prix_vente ?? lot.prix_vente_estime ?? lot.valeur_estimee ?? lot.valeur_marche);
const eggsOpportunityKey = (lot = {}, date = today()) => `avicole-eggs:${lot.id || lot.lot_id || ''}:${date}`;

export function useAvicoleWorkflowHandlers({ props, opportunities = [], activity = 'pondeuse' }) {
  const createOrReactivateLotOpportunity = async (lot = {}, source = 'lot prêt à vendre') => {
    if (!lot?.id || !isReadyForSale(lot) || avicoleActiveCount(lot) <= 0) return;
    const existing = findOpportunityForSource(opportunities, 'avicole', lot.id);
    const qty = avicoleActiveCount(lot);
    const amount = estimatedAmount(lot);
    const productName = isChair(lot) ? `Poulets de chair · ${labelOf(lot)}` : `Lot pondeuses · ${labelOf(lot)}`;
    const payload = buildPersistedOpportunityPayload({
      sourceModule: 'avicole',
      sourceType: isChair(lot) ? 'poulets_chair' : 'lot_pondeuses',
      sourceId: lot.id,
      title: `Vente ${productName}`,
      productName,
      quantity: qty,
      unit: 'tête',
      unitPrice: qty > 0 ? amount / qty : amount,
      amount,
      notes: `${source} · effectif disponible ${qty}`,
      priority: 'haute',
      extra: { entity_type: 'lot_avicole', lot_id: lot.id },
    });
    if (existing?.id) await props.onUpdateOpportunity?.(existing.id, { ...payload, status: 'ouverte', statut: 'ouverte', updated_at: new Date().toISOString() });
    else await props.onCreateOpportunity?.({ id: makeId('OPP'), ...payload });
    await props.onRefreshOpportunities?.();
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'opportunite_vente_avicole', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, title: `Opportunité vente créée · ${labelOf(lot)}`, description: `${productName} prêt à vendre. Opportunité disponible dans Ventes.`, event_date: today(), severity: 'info', amount, linked_opportunity_key: saleOpportunityKey('avicole', lot.id), saisies_evitees: 1 });
    await props.onRefreshBusinessEvents?.();
  };

  const createOrReactivateEggOpportunity = async (lot = {}, eggs = 0, date = today(), note = '') => {
    if (!lot?.id || num(eggs) <= 0) return;
    const tablettes = Math.floor(num(eggs) / 30);
    if (tablettes <= 0) return;
    const dedupeKey = eggsOpportunityKey(lot, date);
    const existing = opportunities.find((opp) => String(opp.opportunity_key || opp.dedupe_key || '') === dedupeKey);
    const productName = `Œufs · ${labelOf(lot)}`;
    const payload = { opportunity_key: dedupeKey, dedupe_key: dedupeKey, title: `Vente ${tablettes} tablette(s) d'œufs`, libelle: `Vente ${tablettes} tablette(s) d'œufs`, source_module: 'avicole', created_from: 'avicole', source_type: 'oeufs', entity_type: 'lot_avicole', source_id: lot.id, entity_id: lot.id, lot_id: lot.id, product_name: productName, produit: productName, quantity: tablettes, quantite: tablettes, unite: 'tablette', unit: 'tablette', eggs_count: num(eggs), oeufs: num(eggs), status: 'ouverte', statut: 'ouverte', priority: 'normale', date, notes: note || `Ramassage ${eggs} œufs` };
    if (existing?.id) await props.onUpdateOpportunity?.(existing.id, { ...payload, status: 'ouverte', statut: 'ouverte', updated_at: new Date().toISOString() });
    else await props.onCreateOpportunity?.({ id: makeId('OPP'), ...payload });
    await props.onRefreshOpportunities?.();
  };

  const createMortalityEvent = async (before = {}, after = {}, source = 'modification lot avicole') => {
    const mortalityIncreased = mortalityOf(after) > mortalityOf(before);
    const valueIncreased = lossValueOf(after) > lossValueOf(before);
    const becameClosed = !isLossClosedLot(before) && isLossClosedLot(after);
    if (!mortalityIncreased && !valueIncreased && !becameClosed) return;
    const delta = Math.max(0, mortalityOf(after) - mortalityOf(before));
    try {
      await props.onCreateBusinessEvent?.({ id: `EVT-AVI-${Date.now()}`, module: 'avicole', source_type: 'lot_avicole', source_id: after.id, title: `Pertes lot avicole · ${after.name || after.nom || after.id}`, description: [`Type: ${after.type || after.categorie || activity}`, `Morts: ${mortalityOf(before)} → ${mortalityOf(after)}${delta ? ` (+${delta})` : ''}`, `Taux morts: ${mortalityRateOf(after)}%`, `Effectif actif: ${avicoleActiveCount(after)}`, `Valeur estimée: ${lossValueOf(before)} → ${lossValueOf(after)}`, `Source: ${source}`].join('\n'), severity: isLossClosedLot(after) || mortalityRateOf(after) >= 5 ? 'critique' : 'warning', status: 'nouveau', date: today(), type_evenement: 'perte_avicole', montant: Math.max(0, lossValueOf(after) - lossValueOf(before)) || lossValueOf(after) });
      await props.onRefreshBusinessEvents?.();
    } catch (error) { console.warn('Perte avicole non consignée en événement', error); }
  };

  const wrappedCreate = async (payload) => {
    await props.onCreate?.(payload);
    await createMortalityEvent({}, payload, 'création lot avicole');
    await createOrReactivateLotOpportunity(payload, 'création lot prêt à vendre');
  };

  const wrappedUpdate = async (id, payload) => {
    const before = (props.rows || []).find((lot) => String(lot.id) === String(id)) || {};
    const restored = mergeSaleReadySavePayload(before, payload);
    const after = { ...before, ...restored, id };
    await props.onUpdate?.(id, restored);
    await createMortalityEvent(before, after, 'modification fiche lot');
    if (!isReadyForSale(before) && isReadyForSale(after)) await createOrReactivateLotOpportunity(after, 'lot marqué prêt à vendre');
  };

  return { wrappedCreate, wrappedUpdate, createOrReactivateEggOpportunity };
}
