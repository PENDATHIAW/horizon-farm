import { ArrowRight, BarChart3, Beef, ChevronDown, ClipboardList, Egg, HeartPulse, PackageCheck, Scissors, Utensils } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import { isSaleReady, saleOpportunityKey } from '../utils/saleReadiness';
import { buildPersistedOpportunityPayload, findOpportunityForSource, mergeSaleReadySavePayload } from '../utils/saleReadyWorkflow';
import { ANIMAL_SPECIES_TABS, countAnimalsBySpecies, filterAnimalsBySpecies, restoreSpeciesOnAnimalPayload } from '../utils/animalSpecies';
import AnimalCycleHealthPanel from './AnimalCycleHealthPanel.jsx';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AnimauxEvolution from './AnimauxEvolution.jsx';
import AnimauxSpeciesFocused from './AnimauxSpeciesFocused.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import HeyHorizonAnimalCard from './HeyHorizonAnimalCard.jsx';
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
const isReadyForSale = (row = {}) => isSaleReady(row);
const estimatedSaleAmount = (row = {}) => toNumber(row.prix_vente_reel ?? row.sale_price ?? row.prix_vente ?? row.prix_vente_estime_auto ?? row.prix_vente_estime ?? row.valeur_estimee ?? row.valeur_marche);

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4 sm:p-6 min-w-0"><div className="min-w-0"><p className="flex items-center gap-2 text-lg font-black text-[#2f2415] break-words"><Icon size={20} className="shrink-0" /> {title}</p>{subtitle ? <p className="mt-1 text-sm leading-relaxed text-[#8a7456] break-words">{subtitle}</p> : null}</div>{children}</section>;
}
function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8]"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-[#8a7456] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-5">{children}</div> : null}</section>;
}

export default function AnimauxV2(props) {
  const embedInElevage = Boolean(props.embedInElevage);
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
        if (embedInElevage && ['animal_weighing', 'animal_loss'].includes(draft?.form_type)) return;
        setHorizonDraft(draft);
        const wanted = draft?.draft_fields?.type ? speciesFromType(draft.draft_fields.type) : species;
        setSpecies(wanted);
        window.setTimeout(() => document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, [species, props.rows, embedInElevage]);

  const counts = useMemo(() => countAnimalsBySpecies(props.rows || []), [props.rows]);
  const speciesRows = useMemo(() => filterAnimalsBySpecies(props.rows || [], species), [props.rows, species]);
  const activeSpeciesRows = useMemo(() => speciesRows.filter(isOperationalAnimal), [speciesRows]);
  const historicalSpeciesRows = useMemo(() => speciesRows.filter((row) => !isOperationalAnimal(row)), [speciesRows]);

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
      extra: {
        entity_type: 'animal',
        animal_id: animal.id,
      },
    });
    if (existing?.id) await (props.onUpdateOpportunity || opportunitiesCrud.update)?.(existing.id, { ...payload, status: 'ouverte', statut: 'ouverte', updated_at: new Date().toISOString() });
    else await (props.onCreateOpportunity || opportunitiesCrud.create)?.({ id: makeId('OPP'), ...payload });
    await (props.onRefreshOpportunities || opportunitiesCrud.refresh)?.();
    await (props.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: makeId('EVT'), event_type: 'opportunite_vente_animal', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, title: `Opportunité vente créée · ${labelOf(animal)}`, description: `Animal prêt à vendre. Opportunité disponible dans Ventes. Montant estimé: ${amount || 0}`, event_date: today(), severity: 'info', amount, linked_opportunity_key: saleOpportunityKey('animaux', animal.id), saisies_evitees: 1 });
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
    const restored = mergeSaleReadySavePayload(before, restoreSpeciesOnAnimalPayload(payload, species));
    const after = { ...before, ...restored, id };
    await props.onUpdate?.(id, restored);
    await createLossEvent(before, after);
    if (!isReadyForSale(before) && isReadyForSale(after)) await createOrReactivateSaleOpportunity(after, 'animal marqué prêt à vendre');
  };
  const dataMap = { sales_orders: salesOrders, salesOrders, payments, finances: transactions, transactions, animaux: activeSpeciesRows };
  const selectedActivity = speciesActivityMap[species] || 'bovins';
  const commonWorkflowProps = { salesOrders, payments, transactions, deliveriesList: deliveries, deliveries, businessEvents, opportunities, onCreateBusinessEvent: props.onCreateBusinessEvent || businessEventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || businessEventsCrud.refresh, onUpdateBusinessEvent: props.onUpdateBusinessEvent || businessEventsCrud.update, onDeleteBusinessEvent: props.onDeleteBusinessEvent || businessEventsCrud.remove, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh };

  return <div id="animaux-module-root" className={`space-y-6 ${embedInElevage ? 'elevage-module animaux-mobile-structured' : 'animaux-mobile-structured'}`}><style>{`@media (max-width: 640px){.animaux-mobile-structured .rounded-2xl{border-radius:18px}.animaux-mobile-structured table{font-size:12px}.animaux-mobile-structured th,.animaux-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.animaux-mobile-structured .text-2xl{font-size:1.35rem}.animaux-mobile-structured .grid{gap:.75rem}.animaux-mobile-structured .overflow-x-auto{max-width:100%}}`}</style>
    {horizonDraft ? <div id="hey-horizon-animal-card"><HeyHorizonAnimalCard draft={horizonDraft} rows={props.rows || []} species={species} onCreate={wrapCreate} onUpdate={wrapUpdate} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefresh={props.onRefresh} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} onClose={() => setHorizonDraft(null)} /></div> : null}
    <ModuleSection icon={Beef} title="Cheptel"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{ANIMAL_SPECIES_TABS.map((tab) => <button key={tab} type="button" onClick={() => setSpecies(tab)} className={`min-w-0 rounded-2xl border px-4 py-4 text-left transition-all ${species === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Espèce</p><p className="font-black break-words">{tab}s</p><p className="text-xs opacity-75 break-words">{counts[tab] || 0} animaux · {filterAnimalsBySpecies(props.rows || [], tab).filter(isOperationalAnimal).length} actifs</p></button>)}</div></ModuleSection>
    {!embedInElevage ? <AnimalCycleHealthPanel rows={props.rows || []} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} salesOrders={salesOrders} onNavigate={props.onNavigate} /> : (
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
        <p className="text-sm font-black text-[#2f2415]">Pilotage, alimentation & santé</p>
        <p className="mt-1 text-sm leading-relaxed text-[#8a7456]">Cycles de vente, distributions et alertes santé sont dans les onglets dédiés.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Cycles')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><ClipboardList size={15} className="shrink-0" /> Cycles bovins → Cycles</button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Alimentation')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Utensils size={15} className="shrink-0" /> Aliment & charges → Alimentation</button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Santé')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><HeartPulse size={15} className="shrink-0" /> Soins & vaccins → Santé <ArrowRight size={14} className="shrink-0" /></button> : null}
        </div>
      </section>
    )}
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Espèce active</p><p className="mt-1 text-xl font-black text-[#2f2415]">{species}s</p><p className="mt-1 text-sm text-[#8a7456]">{activeSpeciesRows.length} actif(s) · {historicalSpeciesRows.length} en historique</p></div>
    <ObjectivePerformanceCard dataMap={dataMap} activity={selectedActivity} title={`Objectif ${species}s`} compact onNavigate={props.onNavigate} />
    <ModuleSection icon={PackageCheck} title={`${species}s`} subtitle={`${historicalSpeciesRows.length} animal(aux) en historique.`}><AnimauxSpeciesFocused {...props} {...commonWorkflowProps} species={species} rows={activeSpeciesRows} onCreate={wrapCreate} onUpdate={wrapUpdate} /></ModuleSection>
    {embedInElevage ? (
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
        <p className="text-sm font-black text-[#2f2415]">Production & transformation</p>
        <p className="mt-1 text-sm text-[#8a7456]">Pesées, abattage et sorties animaux sont gérés dans les onglets dédiés.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Production')} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415] sm:flex-none sm:justify-start"><Egg size={15} className="shrink-0" /> <span className="break-words text-left">Pesées → Production</span> <ArrowRight size={14} className="shrink-0" /></button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Transformation')} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415] sm:flex-none sm:justify-start"><Scissors size={15} className="shrink-0" /> <span className="break-words text-left">Abattage / sorties → Transformation</span> <ArrowRight size={14} className="shrink-0" /></button> : null}
        </div>
      </section>
    ) : (
      <ModuleSection icon={Scissors} title="Transformation et stock"><AnimalSlaughterStockBridge rows={activeSpeciesRows} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} businessEvents={businessEvents} onUpdate={props.onUpdate} onRefresh={props.onRefresh} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} /></ModuleSection>
    )}
    {!embedInElevage ? (
      <ModuleSection icon={PackageCheck} title="Charges directes"><DirectChargesBridge title={`Charges directes ${species.toLowerCase()}s`} targetType="animaux" targets={activeSpeciesRows} businessEvents={businessEvents} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onUpdateBusinessEvent={props.onUpdateBusinessEvent || businessEventsCrud.update} onDeleteBusinessEvent={props.onDeleteBusinessEvent || businessEventsCrud.remove} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} /></ModuleSection>
    ) : null}
    <CollapsibleSection icon={ClipboardList} title={`Cycle et historique · ${species}s`} defaultOpen={false}><LifecycleHistoryPanel mode="animaux" rows={speciesRows} salesOrders={salesOrders} deliveries={deliveries} businessEvents={businessEvents} /></CollapsibleSection>
    <CollapsibleSection icon={BarChart3} title={`Évolution · ${species}s`} defaultOpen={false}><AnimauxEvolution rows={speciesRows} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} businessEvents={businessEvents} opportunities={opportunities} salesOrders={salesOrders} payments={payments} transactions={transactions} onNavigate={props.onNavigate} /></CollapsibleSection>
  </div>;
}
