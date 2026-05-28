import { Beef, Bird, HeartPulse, LayoutDashboard } from 'lucide-react';
import { useMemo, useState } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { fmtNumber } from '../utils/format';
import AnimauxV2 from './AnimauxV2';
import AvicoleV10 from './AvicoleV10';
import SanteV8 from './SanteV8';

const arr = (value) => Array.isArray(value) ? value : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const lower = (value) => String(value || '').toLowerCase();
const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => lower(row.status || row.statut).includes(word));
const lotName = (row = {}) => lower(`${row.type || ''} ${row.type_lot || ''} ${row.production_type || ''} ${row.activity_type || ''} ${row.categorie || ''} ${row.name || ''} ${row.nom || ''}`);
const isPondeuse = (row = {}) => lotName(row).includes('pondeuse') || lotName(row).includes('ponte') || lotName(row).includes('oeuf') || lotName(row).includes('œuf');
const isChair = (row = {}) => lotName(row).includes('chair') || lotName(row).includes('broiler');
const isHealthLate = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(row.statut || row.status || row.etat));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange }) {
  const tabs = [['Résumé', LayoutDashboard], ['Animaux', Beef], ['Avicole', Bird], ['Santé', HeartPulse]];
  return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map(([tab, Icon]) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition inline-flex items-center gap-2 ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}><Icon size={16} />{tab}</button>)}</div></div>;
}
function Summary({ data, setTab }) {
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Animaux actifs" value={fmtNumber(data.activeAnimals)} /><Stat label="Bovins/Ovins/Caprins" value={fmtNumber(data.animals.length)} /><Stat label="Lots pondeuses" value={fmtNumber(data.pondeuses)} tone="good" /><Stat label="Lots chair" value={fmtNumber(data.chair)} /><Stat label="Soins en retard" value={fmtNumber(data.healthLate)} tone={data.healthLate ? 'warn' : 'good'} /></div>
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">Fonctionnalités récupérées</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Ce module remet dans Élevage les anciens workflows riches : création et modification d’animaux, pesée, perte/sortie, opportunité de vente automatique, abattage/transformation, frais directs, lots avicoles, ponte, chair, santé, tâches, alertes, documents et événements métier.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button type="button" onClick={() => setTab('Animaux')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Animaux</b><p className="mt-1 text-sm text-[#8a7456]">Bovins, ovins, caprins, fiches, cycles et actions.</p></button><button type="button" onClick={() => setTab('Avicole')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Avicole</b><p className="mt-1 text-sm text-[#8a7456]">Pondeuses, chair, production, mortalité, ventes.</p></button><button type="button" onClick={() => setTab('Santé')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Santé</b><p className="mt-1 text-sm text-[#8a7456]">Vaccins, traitements, vétérinaires, alertes et coûts.</p></button></div></section>
  </div>;
}

export default function ElevageRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const santeCrud = useCrudModule('sante');
  const vetsCrud = useCrudModule('veterinaires');
  const feedCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const eventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const financesCrud = useCrudModule('finances');
  const stockCrud = useCrudModule('stock');
  const documentsCrud = useCrudModule('documents');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');

  const animals = rowsOf(props.animaux, animauxCrud);
  const lots = rowsOf(props.lots, avicoleCrud);
  const health = rowsOf(props.sante, santeCrud);
  const data = useMemo(() => ({ animals, lots, activeAnimals: animals.filter((row) => !isClosedAnimal(row)).length, pondeuses: lots.filter(isPondeuse).length, chair: lots.filter(isChair).length, healthLate: health.filter(isHealthLate).length }), [animals, lots, health]);

  const shared = { onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const animalProps = { rows: animals, alimentationLogs: rowsOf(props.alimentationLogs, feedCrud), vaccins: health, salesOrders: rowsOf(props.salesOrders, salesCrud), payments: rowsOf(props.payments, paymentsCrud), opportunities: rowsOf(props.opportunities, opportunitiesCrud), businessEvents: rowsOf(props.businessEvents, eventsCrud), onCreate: props.onCreateAnimal || animauxCrud.create, onUpdate: props.onUpdateAnimal || animauxCrud.update, onDelete: props.onDeleteAnimal || animauxCrud.remove, onRefresh: props.onRefreshAnimals || animauxCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const avicoleProps = { rows: lots, transactions: rowsOf(props.transactions, financesCrud), alimentationLogs: rowsOf(props.alimentationLogs, feedCrud), productionLogs: rowsOf(props.productionLogs, productionCrud), opportunities: rowsOf(props.opportunities, opportunitiesCrud), businessEvents: rowsOf(props.businessEvents, eventsCrud), onCreate: props.onCreateLot || avicoleCrud.create, onUpdate: props.onUpdateLot || avicoleCrud.update, onDelete: props.onDeleteLot || avicoleCrud.remove, onRefresh: props.onRefreshLots || avicoleCrud.refresh, onCreateProduction: props.onCreateProduction || productionCrud.create, onUpdateProduction: props.onUpdateProduction || productionCrud.update, onDeleteProduction: props.onDeleteProduction || productionCrud.remove, onRefreshProduction: props.onRefreshProduction || productionCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const healthProps = { rows: health, vets: rowsOf(props.veterinaires, vetsCrud), animaux: animals, lots, stocks: rowsOf(props.stocks, stockCrud), transactions: rowsOf(props.transactions, financesCrud), documents: rowsOf(props.documents, documentsCrud), tasks: rowsOf(props.tasks, tasksCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreate: props.onCreateHealth || santeCrud.create, onUpdate: props.onUpdateHealth || santeCrud.update, onDelete: props.onDeleteHealth || santeCrud.remove, onRefresh: props.onRefreshHealth || santeCrud.refresh, onCreateVet: props.onCreateVet || vetsCrud.create, onUpdateVet: props.onUpdateVet || vetsCrud.update, onDeleteVet: props.onDeleteVet || vetsCrud.remove, onRefreshVets: props.onRefreshVets || vetsCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onNavigate: props.onNavigate };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm text-[#8a7456]">Parcours fusionné qui conserve les anciens workflows opérationnels animaux, avicoles et santé.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Animaux' ? <AnimauxV2 {...animalProps} /> : tab === 'Avicole' ? <AvicoleV10 {...avicoleProps} /> : <SanteV8 {...healthProps} />}</div>;
}
