import { BarChart3, Beef, ClipboardList, PackageCheck, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { ANIMAL_SPECIES_TABS, countAnimalsBySpecies, filterAnimalsBySpecies, restoreSpeciesOnAnimalPayload } from '../utils/animalSpecies';
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

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function AnimauxV2(props) {
  const [species, setSpecies] = useState('Bovin');
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

  const counts = useMemo(() => countAnimalsBySpecies(props.rows || []), [props.rows]);
  const speciesRows = useMemo(() => filterAnimalsBySpecies(props.rows || [], species), [props.rows, species]);
  const activeSpeciesRows = useMemo(() => speciesRows.filter(isOperationalAnimal), [speciesRows]);
  const historicalSpeciesRows = useMemo(() => speciesRows.filter((row) => !isOperationalAnimal(row)), [speciesRows]);

  const createLossEvent = async (before = {}, after = {}, source = 'modification animal') => {
    const becameDead = !isDead(before) && isDead(after);
    const valueIncreased = lossValueOf(after) > lossValueOf(before) && isDead(after);
    if (!becameDead && !valueIncreased) return;
    try {
      await (props.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: `EVT-ANI-${Date.now()}`, module: 'animaux', source_type: 'animal', source_id: after.id, title: `Perte animal · ${after.name || after.nom || after.boucle_numero || after.id}`, description: [`Source: ${source}`, `Espèce: ${after.type || after.espece || species}`, `Statut: ${before.status || before.statut || 'actif'} → ${after.status || after.statut || 'mort'}`, `Date décès: ${after.date_deces || today()}`, `Cause: ${after.cause_deces || 'non renseignée'}`, `Valeur estimée: ${lossValueOf(after)}`].join('\n'), severity: 'critique', status: 'nouveau', date: after.date_deces || today(), type_evenement: 'perte_animal', montant: lossValueOf(after) });
      await (props.onRefreshBusinessEvents || businessEventsCrud.refresh)?.();
    } catch (error) { console.warn('Perte animal non consignée en événement', error); }
  };

  const wrapCreate = async (payload) => {
    const restored = restoreSpeciesOnAnimalPayload(payload, species);
    await props.onCreate?.(restored);
    await createLossEvent({}, restored, 'création animal');
  };
  const wrapUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const restored = restoreSpeciesOnAnimalPayload(payload, species);
    const after = { ...before, ...restored, id };
    await props.onUpdate?.(id, restored);
    await createLossEvent(before, after, 'modification fiche animal');
  };
  const dataMap = { sales_orders: salesOrders, salesOrders, payments, finances: transactions, transactions, animaux: activeSpeciesRows };
  const selectedActivity = speciesActivityMap[species] || 'bovins';
  const commonWorkflowProps = { salesOrders, payments, transactions, deliveriesList: deliveries, deliveries, businessEvents, opportunities, onCreateBusinessEvent: props.onCreateBusinessEvent || businessEventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || businessEventsCrud.refresh, onUpdateBusinessEvent: props.onUpdateBusinessEvent || businessEventsCrud.update, onDeleteBusinessEvent: props.onDeleteBusinessEvent || businessEventsCrud.remove, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh };

  return <div className="space-y-6 animaux-mobile-structured"><style>{`@media (max-width: 640px){.animaux-mobile-structured .rounded-2xl{border-radius:18px}.animaux-mobile-structured table{font-size:12px}.animaux-mobile-structured th,.animaux-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.animaux-mobile-structured .text-2xl{font-size:1.35rem}.animaux-mobile-structured .grid{gap:.75rem}.animaux-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <ModuleSection icon={Beef} title="Cheptel par espèce" subtitle="Choisir d’abord l’espèce à piloter pour ne voir que les données utiles."><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{ANIMAL_SPECIES_TABS.map((tab) => <button key={tab} type="button" onClick={() => setSpecies(tab)} className={`rounded-2xl border px-4 py-3 text-left transition-all ${species === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Espèce</p><p className="font-black">{tab}s</p><p className="text-xs opacity-75">{counts[tab] || 0} animaux · {filterAnimalsBySpecies(props.rows || [], tab).filter(isOperationalAnimal).length} actifs</p></button>)}</div></ModuleSection>
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Vue active</p><p className="mt-1 text-xl font-black text-[#2f2415]">{species}s</p><p className="mt-1 text-sm text-[#8a7456]">Le suivi quotidien affiche uniquement les animaux actifs. Les animaux vendus, morts, perdus, volés, abattus ou sortis restent dans Cycle et historique.</p></div>
    <ObjectivePerformanceCard dataMap={dataMap} activity={selectedActivity} title={`Objectif ${species}s`} compact onNavigate={props.onNavigate} />
    <ModuleSection icon={PackageCheck} title={`${species}s : suivi quotidien`} subtitle={`Animaux actifs uniquement · ${historicalSpeciesRows.length} animal(aux) en historique.`}><AnimauxSpeciesFocused {...props} {...commonWorkflowProps} species={species} rows={activeSpeciesRows} onCreate={wrapCreate} onUpdate={wrapUpdate} /></ModuleSection>
    <ModuleSection icon={Scissors} title={`${species}s : abattage, transformation et stock`} subtitle="Sortie de l’animal actif, transformation éventuelle et création de stock vendable."><AnimalSlaughterStockBridge rows={activeSpeciesRows} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} businessEvents={businessEvents} onUpdate={props.onUpdate} onRefresh={props.onRefresh} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} /></ModuleSection>
    <ModuleSection icon={PackageCheck} title={`${species}s : frais liés à un animal`} subtitle="Frais directement rattachés aux animaux actifs."><DirectChargesBridge title={`Frais directs ${species.toLowerCase()}s`} subtitle="Ces frais améliorent le calcul du coût réel par animal actif." targetType="animaux" targets={activeSpeciesRows} businessEvents={businessEvents} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onUpdateBusinessEvent={props.onUpdateBusinessEvent || businessEventsCrud.update} onDeleteBusinessEvent={props.onDeleteBusinessEvent || businessEventsCrud.remove} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} /></ModuleSection>
    <ModuleSection icon={ClipboardList} title={`${species}s : cycle et historique`} subtitle="Entrées, sorties, ventes, pertes, clôtures et événements importants."><LifecycleHistoryPanel mode="animaux" rows={speciesRows} salesOrders={salesOrders} deliveries={deliveries} businessEvents={businessEvents} /></ModuleSection>
    <ModuleSection icon={BarChart3} title={`${species}s : évolution`} subtitle="Poids, croissance, alimentation, santé, ventes, marge et coût par animal, historique inclus."><AnimauxEvolution rows={speciesRows} alimentationLogs={props.alimentationLogs || []} vaccins={props.vaccins || []} businessEvents={businessEvents} opportunities={opportunities} salesOrders={salesOrders} payments={payments} transactions={transactions} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
