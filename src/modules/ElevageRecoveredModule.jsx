import { Beef, Bird, HeartPulse, LayoutDashboard } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtNumber } from '../utils/format';
import AnimauxV2 from './AnimauxV2';
import AvicoleV10 from './AvicoleV10';
import SanteV8 from './SanteV8';

const arr = (value) => Array.isArray(value) ? value : [];
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
  const tabs = [
    ['Résumé', LayoutDashboard],
    ['Animaux', Beef],
    ['Avicole', Bird],
    ['Santé', HeartPulse],
  ];
  return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map(([tab, Icon]) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition inline-flex items-center gap-2 ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}><Icon size={16} />{tab}</button>)}</div></div>;
}
function Summary({ data, setTab }) {
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Animaux actifs" value={fmtNumber(data.activeAnimals)} /><Stat label="Bovins/Ovins/Caprins" value={fmtNumber(data.animals.length)} /><Stat label="Lots pondeuses" value={fmtNumber(data.pondeuses)} tone="good" /><Stat label="Lots chair" value={fmtNumber(data.chair)} /><Stat label="Soins en retard" value={fmtNumber(data.healthLate)} tone={data.healthLate ? 'warn' : 'good'} /></div>
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">Fonctionnalités récupérées</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Ce module remet dans Élevage les anciens workflows riches : création et modification d’animaux, pesée, perte/sortie, opportunité de vente automatique, abattage/transformation, frais directs, lots avicoles, ponte, chair, santé, tâches, alertes, documents et événements métier.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button onClick={() => setTab('Animaux')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Animaux</b><p className="mt-1 text-sm text-[#8a7456]">Bovins, ovins, caprins, fiches, cycles et actions.</p></button><button onClick={() => setTab('Avicole')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Avicole</b><p className="mt-1 text-sm text-[#8a7456]">Pondeuses, chair, production, mortalité, ventes.</p></button><button onClick={() => setTab('Santé')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Santé</b><p className="mt-1 text-sm text-[#8a7456]">Vaccins, traitements, vétérinaires, alertes et coûts.</p></button></div></section>
  </div>;
}

export default function ElevageRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const data = useMemo(() => {
    const animals = arr(props.animaux);
    const lots = arr(props.lots);
    const health = arr(props.sante);
    return { animals, lots, activeAnimals: animals.filter((row) => !isClosedAnimal(row)).length, pondeuses: lots.filter(isPondeuse).length, chair: lots.filter(isChair).length, healthLate: health.filter(isHealthLate).length };
  }, [props.animaux, props.lots, props.sante]);
  const animalProps = { rows: arr(props.animaux), alimentationLogs: arr(props.alimentationLogs), vaccins: arr(props.sante), salesOrders: arr(props.salesOrders), payments: arr(props.payments), opportunities: arr(props.opportunities), businessEvents: arr(props.businessEvents), onCreate: props.onCreateAnimal, onUpdate: props.onUpdateAnimal, onDelete: props.onDeleteAnimal, onRefresh: props.onRefreshAnimals, onCreateOpportunity: props.onCreateOpportunity, onUpdateOpportunity: props.onUpdateOpportunity, onRefreshOpportunities: props.onRefreshOpportunities, onCreateBusinessEvent: props.onCreateBusinessEvent, onRefreshBusinessEvents: props.onRefreshBusinessEvents, onNavigate: props.onNavigate };
  const avicoleProps = { rows: arr(props.lots), transactions: arr(props.transactions), alimentationLogs: arr(props.alimentationLogs), productionLogs: arr(props.productionLogs), opportunities: arr(props.opportunities), businessEvents: arr(props.businessEvents), onCreate: props.onCreateLot, onUpdate: props.onUpdateLot, onDelete: props.onDeleteLot, onRefresh: props.onRefreshLots, onCreateProduction: props.onCreateProduction, onUpdateProduction: props.onUpdateProduction, onDeleteProduction: props.onDeleteProduction, onRefreshProduction: props.onRefreshProduction, onCreateOpportunity: props.onCreateOpportunity, onUpdateOpportunity: props.onUpdateOpportunity, onRefreshOpportunities: props.onRefreshOpportunities, onCreateBusinessEvent: props.onCreateBusinessEvent, onRefreshBusinessEvents: props.onRefreshBusinessEvents, onNavigate: props.onNavigate };
  const healthProps = { rows: arr(props.sante), vets: arr(props.veterinaires), animaux: arr(props.animaux), lots: arr(props.lots), stocks: arr(props.stocks), transactions: arr(props.transactions), documents: arr(props.documents), tasks: arr(props.tasks), alertes: arr(props.alertes), onCreate: props.onCreateHealth, onUpdate: props.onUpdateHealth, onDelete: props.onDeleteHealth, onRefresh: props.onRefreshHealth, onCreateVet: props.onCreateVet, onUpdateVet: props.onUpdateVet, onDeleteVet: props.onDeleteVet, onRefreshVets: props.onRefreshVets, onCreateTask: props.onCreateTask, onUpdateTask: props.onUpdateTask, onRefreshTasks: props.onRefreshTasks, onCreateAlert: props.onCreateAlert, onUpdateAlert: props.onUpdateAlert, onRefreshAlertes: props.onRefreshAlertes, onCreateFinanceTransaction: props.onCreateFinanceTransaction, onRefreshFinances: props.onRefreshFinances, onCreateDocument: props.onCreateDocument, onRefreshDocuments: props.onRefreshDocuments, onNavigate: props.onNavigate };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm text-[#8a7456]">Parcours fusionné qui conserve les anciens workflows opérationnels animaux, avicoles et santé.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Animaux' ? <AnimauxV2 {...animalProps} /> : tab === 'Avicole' ? <AvicoleV10 {...avicoleProps} /> : <SanteV8 {...healthProps} />}</div>;
}
