import { makeId } from '../../utils/ids';
import { isSaleReady, saleOpportunityKey } from '../../utils/saleReadiness';
import { buildPersistedOpportunityPayload, findOpportunityForSource, mergeSaleReadySavePayload } from '../../utils/saleReadyWorkflow';
import { restoreSpeciesOnAnimalPayload } from '../../utils/animalSpecies';

const toNumber = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (row = {}) => String(row.status || row.statut || '').trim().toLowerCase();
const isDead = (row = {}) => statusOf(row) === 'mort';
const lossValueOf = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const labelOf = (row = {}) => row.name || row.nom || row.boucle_numero || row.tag || row.id || 'Animal';
const isClosedAnimal = (row = {}) => {
  const status = statusOf(row);
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => status.includes(word));
};
const isReadyForSale = (row = {}) => isSaleReady(row);
const estimatedSaleAmount = (row = {}) => toNumber(row.prix_vente_reel ?? row.sale_price ?? row.prix_vente ?? row.prix_vente_estime_auto ?? row.prix_vente_estime ?? row.valeur_estimee ?? row.valeur_marche);
const isBirthAcquisition = (row = {}) => ['naissance_ferme', 'reproduction_interne'].includes(String(row.mode_acquisition || '').toLowerCase());

export function useAnimalWorkflowHandlers({ props, species = 'Bovin', opportunities = [], businessEventsCrud }) {
  const createOrReactivateSaleOpportunity = async (animal = {}, source = 'prêt à vendre') => {
    if (!animal?.id || !isReadyForSale(animal) || isClosedAnimal(animal)) return;
    const existing = findOpportunityForSource(opportunities, 'animaux', animal.id);
    const amount = estimatedSaleAmount(animal);
    const payload = buildPersistedOpportunityPayload({
      sourceModule: 'animaux',
      sourceType: 'animal',
      sourceId: animal.id,
      title: `Vente ${labelOf(animal)}`,
      productName: labelOf(animal),
      quantity: 1,
      unit: 'tête',
      unitPrice: amount,
      amount,
      notes: `${source} · ${animal.type || animal.espece || species}`,
      priority: amount > 0 ? 'haute' : 'normale',
      extra: { entity_type: 'animal', animal_id: animal.id },
    });
    if (existing?.id) await props.onUpdateOpportunity?.(existing.id, { ...payload, status: 'ouverte', statut: 'ouverte', updated_at: new Date().toISOString() });
    else await props.onCreateOpportunity?.({ id: makeId('OPP'), ...payload });
    await props.onRefreshOpportunities?.();
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'opportunite_vente_animal', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, title: `Opportunité vente créée · ${labelOf(animal)}`, description: `Animal prêt à vendre. Opportunité disponible dans Ventes. Montant estimé: ${amount || 0}`, event_date: today(), severity: 'info', amount, linked_opportunity_key: saleOpportunityKey('animaux', animal.id), saisies_evitees: 1 });
    await props.onRefreshBusinessEvents?.();
  };

  const createLossEvent = async (before = {}, after = {}) => {
    const becameDead = !isDead(before) && isDead(after);
    const valueIncreased = lossValueOf(after) > lossValueOf(before) && isDead(after);
    if (!becameDead && !valueIncreased) return;
    try {
      await props.onCreateBusinessEvent?.({ id: `EVT-ANI-${Date.now()}`, module: 'animaux', source_type: 'animal', source_id: after.id, title: `Perte animal · ${after.name || after.nom || after.boucle_numero || after.id}`, description: [`Espèce: ${after.type || after.espece || species}`, `Statut: ${before.status || before.statut || 'actif'} → ${after.status || after.statut || 'mort'}`, `Date décès: ${after.date_deces || today()}`, `Cause: ${after.cause_deces || 'non renseignée'}`, `Valeur estimée: ${lossValueOf(after)}`].join('\n'), severity: 'critique', status: 'nouveau', date: after.date_deces || today(), type_evenement: 'perte_animal', montant: lossValueOf(after) });
      await props.onRefreshBusinessEvents?.();
    } catch (error) { console.warn('Perte animal non consignée en événement', error); }
  };

  const wrapCreate = async (payload) => {
    const restored = restoreSpeciesOnAnimalPayload(payload, species);
    await props.onCreate?.(restored);
    await createLossEvent({}, restored);
    if (!isBirthAcquisition(restored)) {
      await createOrReactivateSaleOpportunity(restored, 'création animal prêt à vendre');
    }
  };

  const wrapUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const restored = mergeSaleReadySavePayload(before, restoreSpeciesOnAnimalPayload(payload, species));
    const after = { ...before, ...restored, id };
    await props.onUpdate?.(id, restored);
    await createLossEvent(before, after);
    if (!isReadyForSale(before) && isReadyForSale(after)) await createOrReactivateSaleOpportunity(after, 'animal marqué prêt à vendre');
  };

  return { wrapCreate, wrapUpdate };
}
