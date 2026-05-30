import { BarChart3, Beef, ChevronDown, ClipboardList, PackageCheck, Scale, Scissors, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import { ANIMAL_SPECIES_TABS, countAnimalsBySpecies, filterAnimalsBySpecies, restoreSpeciesOnAnimalPayload } from '../utils/animalSpecies';
import AnimalCycleHealthPanel from './AnimalCycleHealthPanel.jsx';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AnimauxEvolution from './AnimauxEvolution.jsx';
import AnimauxSpeciesFocused from './AnimauxSpeciesFocused.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

const toNumber = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (row = {}) => String(row.status || row.statut || '').trim().toLowerCase();
const isDead = (row = {}) => statusOf(row) === 'mort';
const lossValueOf = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const speciesActivityMap = { Bovin: 'bovins', Ovin: 'ovins', Caprin: 'caprins' };
const fallbackRows = (provided, crud) => Array.isArray(provided) && provided.length ? provided : (crud.rows || []);
const isClosedAnimal = (row = {}) => {
  const status = statusOf(row);
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => status.includes(word));
};
const isOperationalAnimal = (row = {}) => !isClosedAnimal(row);
const labelOf = (row = {}) => row.name || row.nom || row.boucle_numero || row.tag || row.id || 'Animal';
const targetFrom = (draft = {}) => draft.draft_fields?.target_id || draft.draft_fields?.animal_id || '';
const findAnimal = (id = '', rows = []) => rows.find((row) => [row.id, row.boucle_numero, row.qr_code, row.tag].map((v) => String(v || '').toUpperCase()).includes(String(id || '').toUpperCase())) || null;
const speciesFromType = (type = '') => String(type || '').toLowerCase().includes('ovin') ? 'Ovin' : String(type || '').toLowerCase().includes('caprin') ? 'Caprin' : 'Bovin';
const isReadyForSale = (row = {}) => {
  const status = statusOf(row);
  return Boolean(row.pret_vente_confirme || row.ready_for_sale || row.sale_ready || row.pret_a_la_vente || row.ready_to_sell || row.pret_vente_recommande || status === 'pret_a_la_vente' || status === 'pret_vente' || status === 'pret a vendre');
};
const estimatedSaleAmount = (row = {}) => toNumber(row.prix_vente_reel ?? row.sale_price ?? row.prix_vente ?? row.prix_vente_estime_auto ?? row.prix_vente_estime ?? row.valeur_estimee ?? row.valeur_marche);
const opportunityDedupeKey = (row = {}) => `animal-sale:${row.id || row.boucle_numero || row.tag || ''}`;

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}
function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8]"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-[#8a7456] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-5">{children}</div> : null}</section>;
}

function HeyHorizonAnimalCard({ draft, rows, species, onCreate, onUpdate, onCreateBusinessEvent, onRefresh, onRefreshBusinessEvents, onClose }) {
  const fields = draft?.draft_fields || {};
  const formType = draft?.form_type;
  const [targetId, setTargetId] = useState(targetFrom(draft));
  const [weight, setWeight] = useState(fields.weight_kg || '');
  const [date, setDate] = useState(fields.date || today());
  const [status, setStatus] = useState(fields.status || 'mort');
  const [name, setName] = useState(fields.name || '');
  const [type, setType] = useState(speciesFromType(fields.type || species));
  const [note, setNote] = useState(fields.notes || draft?.raw_input || '');
  const [saving, setSaving] = useState(false);
  const animal = useMemo(() => findAnimal(targetId, rows), [targetId, rows]);
  const title = formType === 'animal_weighing' ? 'Pesée animal' : formType === 'animal_loss' ? 'Incident / sortie animal' : 'Création animal';
  const submit = async () => {
    try {
      setSaving(true);
      if (formType === 'animal_creation') {
        const id = fields.id || makeId(type === 'Ovin' ? 'OVI' : type === 'Caprin' ? 'CAP' : 'BOV');
        await onCreate?.({ id, boucle_numero: id, name: name || id, nom: name || id, type, espece: type, status: 'actif', statut: 'actif', health_status: 'sain', date_entree_ferme: date, date_derniere_pesee: date, poids: toNumber(weight), poids_entree: toNumber(weight), notes: note, source_module: 'hey_horizon' });
        await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'creation_animal', module_source: 'animaux', entity_type: 'animal', entity_id: id, title: `Animal créé · ${id}`, description: note, event_date: date, severity: 'info' });
      } else {
        if (!targetId) throw new Error('Animal obligatoire');
        const patch = formType === 'animal_weighing'
          ? { poids: toNumber(weight), poids_actuel: toNumber(weight), date_derniere_pesee: date, last_weight: toNumber(weight), last_weight_date: date, notes_pesee: note }
          : { status, statut: status, date_deces: status === 'mort' ? date : undefined, date_sortie: date, cause_deces: note, notes_sortie: note };
        await onUpdate?.(animal?.id || targetId, patch);
        await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: formType === 'animal_weighing' ? 'pesee_animal' : 'perte_animal', module_source: 'animaux', entity_type: 'animal', entity_id: animal?.id || targetId, source_id: animal?.id || targetId, title: `${title} · ${targetId}`, description: note || draft?.raw_input || '', event_date: date, severity: formType === 'animal_loss' ? 'critical' : 'info', amount: formType === 'animal_loss' ? lossValueOf(animal || {}) : 0 });
      }
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success(`${title} enregistrée`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Action animal impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><Scale size={15} /> Fiche animal</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">{title}</h3></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {formType === 'animal_creation' ? <><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Espèce</span><select value={type} onChange={(e) => setType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option>Bovin</option><option>Ovin</option><option>Caprin</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Nom / repère</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></> : <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Animal</span><select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value={targetId}>{animal ? `${labelOf(animal)} · ${targetId}` : targetId || 'Choisir'}</option>{rows.filter((row) => String(row.id) !== String(targetId)).map((row) => <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>)}</select></label>}
      {formType === 'animal_loss' ? <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Statut</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="mort">Mort</option><option value="perdu">Perdu</option><option value="vole">Volé</option></select></label> : <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Poids kg</span><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>}
      <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
      <label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
    </div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider'}</button></div>
  </section>;
}

export default function AnimauxV2(props) {
  const [species, setSpecies] = useState('Bovin');
  const [horizonDraft, setHorizonDraft] = useState(null);
  const salesOrdersCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const financesCrud = useCrudModule('finances');
  const deliveriesCrud = useCrudModule('deliveries');
  const businessEventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');

  const salesOrders = fallbackRows(props.salesOrders || props.sales_orders, salesOrdersCrud);
  const payments = fallbackRows(props.payments || props.paymentsList, paymentsCrud);
  const transactions = fallbackRows(props.transactions || props.finances, financesCrud);
  const deliveries = fallbackRows(props.deliveriesList || props.deliveries, deliveriesCrud);
  const businessEvents = fallbackRows(props.businessEvents || props.events, businessEventsCrud);
  const opportunities = fallbackRows(props.opportunities || props.salesOpportunities, opportunitiesCrud);

  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'animaux' && draft?.form_type === 'entity_lookup') {
        const target = targetFrom(draft);
        const animal = findAnimal(target, props.rows || []);
        if (animal) setSpecies(speciesFromType(animal.espece || animal.type || species));
        toast.success(animal ? `Fiche ${target} trouvée` : `Recherche ${target}`);
        window.setTimeout(() => document.getElementById('animaux-module-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return;
      }
      if (event.detail?.module === 'animaux' && ['animal_weighing', 'animal_loss', 'animal_creation'].includes(draft?.form_type)) {
        setHorizonDraft(draft);
        const wanted = draft?.draft_fields?.type ? speciesFromType(draft.draft_fields.type) : species;
        setSpecies(wanted);
        window.setTimeout(() => document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, [species, props.rows]);

  const counts = useMemo(() => countAnimalsBySpecies(props.rows || []), [props.rows]);
  const speciesRows = useMemo(() => filterAnimalsBySpecies(props.rows || [], species), [props.rows, species]);
  const activeSpeciesRows = useMemo(() => speciesRows.filter(isOperationalAnimal), [speciesRows]);
  const historicalSpeciesRows = useMemo(() => speciesRows.filter((row) => !isOperationalAnimal(row)), [speciesRows]);

  const createOrReactivateSaleOpportunity = async (animal = {}, source = 'prêt à vendre') => {
    if (!animal?.id || !isReadyForSale(animal) || isClosedAnimal(animal)) return;
    const dedupeKey = opportunityDedupeKey(animal);
    const existing = opportunities.find((opp) => String(opp.opportunity_key || opp.dedupe_key || opp.source_record_id || opp.source_id || '') === dedupeKey || (String(opp.source_module || opp.created_from || '').includes('animaux') && String(opp.source_id || opp.entity_id || opp.animal_id || '') === String(animal.id)));
    const amount = estimatedSaleAmount(animal);
    const payload = {
      opportunity_key: dedupeKey,
      dedupe_key: dedupeKey,
      title: `Vente ${labelOf(animal)}`,
      libelle: `Vente ${labelOf(animal)}`,
      source_module: 'animaux',
      created_from: 'animaux',
      source_type: 'animal',
      entity_type: 'animal',
      source_id: animal.id,
      entity_id: animal.id,
      animal_id: animal.id,
      product_name: labelOf(animal),
      produit: labelOf(animal),
      quantity: 1,
      quantite: 1,
      unite: 'tête',
      unit: 'tête',
      montant_estime: amount,
      estimated_amount: amount,
      valeur_estimee: amount,
      status: 'ouverte',
      statut: 'ouverte',
      priority: amount > 0 ? 'haute' : 'normale',
      date: today(),
      notes: `${source} · ${animal.type || animal.espece || species}`,
    };
    if (existing?.id) await (props.onUpdateOpportunity || opportunitiesCrud.update)?.(existing.id, { ...payload, status: 'ouverte', statut: 'ouverte', updated_at: new Date().toISOString() });
    else await (props.onCreateOpportunity || opportunitiesCrud.create)?.({ id: makeId('OPP'), ...payload });
    await (props.onRefreshOpportunities || opportunitiesCrud.refresh)?.();
    await (props.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: makeId('EVT'), event_type: 'opportunite_vente_animal', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, title: `Opportunité vente créée · ${labelOf(animal)}`, description: `Animal prêt à vendre. Opportunité disponible dans Ventes. Montant estimé: ${amount || 0}`, event_date: today(), severity: 'info', amount, linked_opportunity_key: dedupeKey, saisies_evitees: 1 });
    await (props.onRefreshBusinessEvents || businessEventsCrud.refresh)?.();
  };

  const createLossEvent = async (before = {}, after = {}) => {
    const becameDead = !isDead(before) && isDead(after);
    const valueIncreased = lossValueOf(after) > lossValueOf(before) && isDead(after);
    if (!becameDead && !valueIncreased) return;
    try {
      await (props.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: `EVT-ANI-${Date.now()}`, module: 'animaux', source_type: 'animal', source_id: after.id, title: `Perte animal · ${after.name || after.nom || after.boucle_numero || after.id}`, description: [`Espèce: ${after.type || after.espece || species}`, `Statut: ${before.status || before.statut || 'actif'} → ${after.status || after.statut || 'mort'}`, `Date décès: ${after.date_deces || today()}`, `Cause: ${after.cause_deces || 'non renseignée'}`, `Valeur estimée: ${lossValueOf(after)}`].join('\n'), severity: 'critique', status: 'nouveau', date: after.date_deces || today(), type_evenement: 'perte_animal', montant: lossValueOf(after) });
      await (props.onRefreshBusinessEvents || businessEventsCrud.refresh)?.();
    } catch (error) { console.warn('Perte animal non consignée en événement', error); }
  };

  const wrapCreate = async (payload) => {
    const restored = restoreSpeciesOnAnimalPayload(payload, species);
    await props.onCreate?.(restored);
    await createLossEvent({}, restored);
    await createOrReactivateSaleOpportunity(restored, 'création animal prêt à vendre');
  };
  const wrapUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const restored = restoreSpeciesOnAnimalPayload(payload, species);
    const after = { ...before, ...restored, id };
    await props.onUpdate?.(id, restored);
    await createLossEvent(before, after);
    if (!isReadyForSale(before) && isReadyForSale(after)) await createOrReactivateSaleOpportunity(after, 'animal marqué prêt à vendre');
  };
  const dataMap = { sales_orders: salesOrders, salesOrders, payments, finances: transactions, transactions, animaux: activeSpeciesRows };
  const selectedActivity = speciesActivityMap[species] || 'bovins';
  const commonWorkflowProps = { salesOrders, payments, transactions, deliveriesList: deliveries, deliveries, businessEvents, opportunities, onCreateBusinessEvent: props.onCreateBusinessEvent || businessEventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || businessEventsCrud.refresh, onUpdateBusinessEvent: props.onUpdateBusinessEvent || businessEventsCrud.update, onDeleteBusinessEvent: props.onDeleteBusinessEvent || businessEventsCrud.remove, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh };

  return <div id="animaux-module-root" className="space-y-6 animaux-mobile-structured"><style>{`@media (max-width: 640px){.animaux-mobile-structured .rounded-2xl{border-radius:18px}.animaux-mobile-structured table{font-size:12px}.animaux-mobile-structured th,.animaux-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.animaux-mobile-structured .text-2xl{font-size:1.35rem}.animaux-mobile-structured .grid{gap:.75rem}.animaux-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    {horizonDraft ? <div id="hey-horizon-animal-card"><HeyHorizonAnimalCard draft={horizonDraft} rows={props.rows || []} species={species} onCreate={wrapCreate} onUpdate={wrapUpdate} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefresh={props.onRefresh} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} onClose={() => setHorizonDraft(null)} /></div> : null}
    <ModuleSection icon={Beef} title="Cheptel"><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{ANIMAL_SPECIES_TABS.map((tab) => <button key={tab} type="button" onClick={() => setSpecies(tab)} className={`rounded-2xl border px-4 py-3 text-left transition-all ${species === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Espèce</p><p className="font-black">{tab}s</p><p className="text-xs opacity-75">{counts[tab] || 0} animaux · {filterAnimalsBySpecies(props.rows || [], tab).filter(isOperationalAnimal).length} actifs</p></button>)}</div></ModuleSection>
    <AnimalCycleHealthPanel rows={props.rows || []} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} salesOrders={salesOrders} onNavigate={props.onNavigate} />
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Espèce active</p><p className="mt-1 text-xl font-black text-[#2f2415]">{species}s</p><p className="mt-1 text-sm text-[#8a7456]">{activeSpeciesRows.length} actif(s) · {historicalSpeciesRows.length} en historique</p></div>
    <ObjectivePerformanceCard dataMap={dataMap} activity={selectedActivity} title={`Objectif ${species}s`} compact onNavigate={props.onNavigate} />
    <ModuleSection icon={PackageCheck} title={`${species}s`} subtitle={`${historicalSpeciesRows.length} animal(aux) en historique.`}><AnimauxSpeciesFocused {...props} {...commonWorkflowProps} species={species} rows={activeSpeciesRows} onCreate={wrapCreate} onUpdate={wrapUpdate} /></ModuleSection>
    <ModuleSection icon={Scissors} title="Transformation et stock"><AnimalSlaughterStockBridge rows={activeSpeciesRows} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} businessEvents={businessEvents} onUpdate={props.onUpdate} onRefresh={props.onRefresh} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} /></ModuleSection>
    <ModuleSection icon={PackageCheck} title="Charges directes"><DirectChargesBridge title={`Charges directes ${species.toLowerCase()}s`} targetType="animaux" targets={activeSpeciesRows} businessEvents={businessEvents} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onUpdateBusinessEvent={props.onUpdateBusinessEvent || businessEventsCrud.update} onDeleteBusinessEvent={props.onDeleteBusinessEvent || businessEventsCrud.remove} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} /></ModuleSection>
    <CollapsibleSection icon={ClipboardList} title={`Cycle et historique · ${species}s`} defaultOpen={false}><LifecycleHistoryPanel mode="animaux" rows={speciesRows} salesOrders={salesOrders} deliveries={deliveries} businessEvents={businessEvents} /></CollapsibleSection>
    <CollapsibleSection icon={BarChart3} title={`Évolution · ${species}s`} defaultOpen={false}><AnimauxEvolution rows={speciesRows} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} businessEvents={businessEvents} opportunities={opportunities} salesOrders={salesOrders} payments={payments} transactions={transactions} onNavigate={props.onNavigate} /></CollapsibleSection>
  </div>;
}
