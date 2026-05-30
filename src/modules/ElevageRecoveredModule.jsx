import { Beef, Bird, HeartPulse, LayoutDashboard, Milk, PackageCheck, Sprout, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
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
const today = () => new Date().toISOString().slice(0, 10);

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="elevage" active={active} onChange={onChange} />
    </div>
  );
}
function ActionCard({ title, text, onClick }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:bg-[#dcfce7]"><b className="text-[#2f2415]">{title}</b><p className="mt-1 text-sm text-[#8a7456]">{text}</p></button>; }
function BusinessHub({ title, intro, stats, children }) { return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((s) => <Stat key={s.label} {...s} />)}</div><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">{intro}</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div></section></div>; }
function Summary({ data, setTab }) {
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-10"><Stat label="Animaux actifs" value={fmtNumber(data.activeAnimals)} /><Stat label="Lots pondeuses" value={fmtNumber(data.pondeuses)} tone="good" /><Stat label="Lots chair" value={fmtNumber(data.chair)} /><Stat label="Ramassages œufs" value={fmtNumber(data.productionLogs.length)} tone="good" /><Stat label="Production 7 j" value={fmtNumber(data.eggs7d)} tone="good" /><Stat label="Sorties aliment" value={fmtNumber(data.feedLogs.length)} /><Stat label="Coût alim. est." value={`${Math.round(data.feedCost).toLocaleString('fr-FR')} F`} tone="warn" /><Stat label="Mortalité récente" value={fmtNumber(data.recentMortality)} tone={data.recentMortality ? 'warn' : 'good'} /><Stat label="Lots à vendre" value={fmtNumber(data.lotsToSell.length)} tone={data.lotsToSell.length ? 'warn' : 'good'} /><Stat label="Soins en retard" value={fmtNumber(data.healthLate)} tone={data.healthLate ? 'warn' : 'good'} /></div>
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">Élevage épuré par métier</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Les fiches Animaux et Avicole restent les référentiels. Les actions lourdes sont rangées par usage : production, transformation, alimentation, reproduction et santé.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><ActionCard title="Production" text="Ramassage œufs, ponte, rendement et productions issues de l’élevage." onClick={() => setTab('Production')} /><ActionCard title="Transformation" text="Abattage, réforme, sortie productive et préparation à la vente." onClick={() => setTab('Transformation')} /><ActionCard title="Alimentation" text="Distribution, consommation et sorties d’aliments liées aux animaux et lots." onClick={() => setTab('Alimentation')} /></div></section>
  </div>;
}
function ProductionHub({ data, setTab }) {
  return <BusinessHub title="Production" intro="Ici on regroupe ce que l’élevage produit : œufs, ponte, croissance et rendements. Les formulaires restent ceux des moteurs existants Avicole/Animaux." stats={[{ label: 'Ramassages', value: fmtNumber(data.productionLogs.length), tone: 'good' }, { label: 'Lots pondeuses', value: fmtNumber(data.pondeuses), tone: 'good' }, { label: 'Lots chair', value: fmtNumber(data.chair) }, { label: 'Animaux actifs', value: fmtNumber(data.activeAnimals) }]}><ActionCard title="+ Ramassage œufs" text="Ouvre la fiche existante de production œufs avec la date du jour." onClick={() => emitHorizonForm('avicole', 'egg_production', 'Ramassage œufs', { date: today() })} /><ActionCard title="Voir production avicole" text="Consulter ponte, chair, production, mortalité et historique du moteur Avicole." onClick={() => setTab('Avicole')} /><ActionCard title="Voir fiches animaux" text="Consulter croissance, pesées, statut et historique animal." onClick={() => setTab('Animaux')} /></BusinessHub>;
}
function TransformationHub({ data, setTab }) {
  return <BusinessHub title="Transformation" intro="Ici on range les sorties productives : abattage, réforme, mortalité/sortie, préparation à la vente. On réutilise les actions existantes d’Animaux et Avicole au lieu de créer un doublon." stats={[{ label: 'Animaux sortis', value: fmtNumber(data.closedAnimals) }, { label: 'Lots chair', value: fmtNumber(data.chair) }, { label: 'Opportunités', value: fmtNumber(data.opportunities.length), tone: 'good' }, { label: 'Ventes liées', value: fmtNumber(data.salesOrders.length) }]}><ActionCard title="+ Déclarer sortie / abattage animal" text="Ouvre la fiche existante de perte, sortie ou abattage côté Animaux." onClick={() => emitHorizonForm('animaux', 'animal_loss', 'Sortie / abattage animal', { date: today() })} /><ActionCard title="+ Clôturer / réformer lot avicole" text="Ouvre le workflow existant de clôture, réforme ou sortie avicole." onClick={() => emitHorizonForm('avicole', 'poultry_close', 'Clôture / réforme avicole', { date: today() })} /><ActionCard title="Voir moteur Animaux" text="Retrouver les fiches et actions historiques déjà existantes." onClick={() => setTab('Animaux')} /></BusinessHub>;
}
function FeedingHub({ data, setTab }) {
  return <BusinessHub title="Alimentation" intro="Ici on range les distributions et consommations d’aliments. Les achats restent connectés au stock, mais l’usage terrain côté élevage est visible ici." stats={[{ label: 'Sorties aliment', value: fmtNumber(data.feedLogs.length) }, { label: 'Lots suivis', value: fmtNumber(data.lots.length) }, { label: 'Animaux suivis', value: fmtNumber(data.animals.length) }, { label: 'Stock aliment', value: fmtNumber(data.feedStocks.length), tone: data.feedStocks.length ? 'good' : 'warn' }]}><ActionCard title="+ Distribution aliment" text="Ouvre le workflow existant de mouvement/consommation d’aliment." onClick={() => emitHorizonForm('stock', 'stock_movement', 'Distribution aliment', { date: today(), category: 'alimentation' })} /><ActionCard title="Voir alimentation avicole" text="Consulter consommations et historiques dans le moteur Avicole." onClick={() => setTab('Avicole')} /><ActionCard title="Voir alimentation animaux" text="Consulter consommations et historiques dans le moteur Animaux." onClick={() => setTab('Animaux')} /></BusinessHub>;
}
function ReproductionHub({ data, setTab }) {
  return (
    <BusinessHub
      title="Reproduction"
      intro="Saillies, gestations, mises bas et naissances — branchées sur les fiches Animaux existantes (mode naissance / reproduction interne)."
      stats={[
        { label: 'Femelles', value: fmtNumber(data.females) },
        { label: 'Naissances', value: fmtNumber(data.birthLikeEvents), tone: 'good' },
        { label: 'Événements', value: fmtNumber(data.livestockEvents.length) },
        { label: 'À suivre', value: fmtNumber(data.females) > data.birthLikeEvents ? data.females - data.birthLikeEvents : 0, tone: 'warn' },
      ]}
    >
      <ActionCard title="+ Naissance / mise bas" text="Ouvre la fiche animal en mode naissance sur la ferme avec mère et portée." onClick={() => emitHorizonForm('animaux', 'animal_create', 'Naissance / mise bas', { date: today(), mode_acquisition: 'naissance_ferme' })} />
      <ActionCard title="+ Reproduction interne" text="Enregistrer un animal issu de reproduction interne avec lien mère/père." onClick={() => emitHorizonForm('animaux', 'animal_create', 'Reproduction interne', { date: today(), mode_acquisition: 'reproduction_interne' })} />
      <ActionCard title="Voir femelles reproductrices" text="Consulter statut reproduction, mère, père et notes sur les fiches Animaux." onClick={() => setTab('Animaux')} />
      <ActionCard title="Historique naissances" text="Événements métier naissance / mise bas / portée déjà enregistrés." onClick={() => setTab('Animaux')} />
    </BusinessHub>
  );
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
  const productionLogs = rowsOf(props.productionLogs, productionCrud);
  const feedLogs = rowsOf(props.alimentationLogs, feedCrud);
  const stocks = rowsOf(props.stocks, stockCrud);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud);
  const salesOrders = rowsOf(props.salesOrders, salesCrud);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud);
  const data = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const eggs7d = productionLogs.filter((row) => String(row.date || row.created_at || '').slice(0, 10) >= weekAgo).reduce((s, row) => s + Number(row.oeufs_produits || row.eggs_count || row.oeufs || 0), 0);
    const feedCost = feedLogs.reduce((s, row) => s + Number(row.cout_total || row.cost || row.montant || 0), 0);
    const recentMortality = lots.reduce((s, lot) => s + Number(lot.mortality || 0), 0) + businessEvents.filter((row) => /mort|perte|deces|décès/.test(lower(`${row.event_type || ''} ${row.title || ''}`))).length;
    const lotsToSell = lots.filter((row) => ['pret_vente', 'prêt vente', 'a_vendre', 'à vendre', 'maturite', 'maturité'].some((x) => lower(`${row.status || ''} ${row.statut || ''} ${row.notes || ''}`).includes(x)));
    return { animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents, activeAnimals: animals.filter((row) => !isClosedAnimal(row)).length, closedAnimals: animals.filter(isClosedAnimal).length, pondeuses: lots.filter(isPondeuse).length, chair: lots.filter(isChair).length, healthLate: health.filter(isHealthLate).length, feedStocks: stocks.filter((row) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(lower(`${row.produit || row.name || row.nom || ''} ${row.categorie || row.category || ''}`))), females: animals.filter((row) => ['femelle', 'female', 'vache', 'brebis', 'chevre', 'chèvre'].some((x) => lower(`${row.sexe || ''} ${row.type || ''} ${row.espece || ''}`).includes(x))).length, birthLikeEvents: businessEvents.filter((row) => /naissance|mise bas|veau|agneau|chevreau/.test(lower(`${row.event_type || ''} ${row.title || ''} ${row.description || ''}`))).length, livestockEvents: businessEvents.filter((row) => /animal|avicole|elevage|élevage|sante|santé/.test(lower(`${row.module_source || ''} ${row.event_type || ''} ${row.title || ''}`))), eggs7d, feedCost, recentMortality, lotsToSell };
  }, [animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents]);

  const shared = { onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const animalProps = { rows: animals, alimentationLogs: feedLogs, vaccins: health, salesOrders, payments: rowsOf(props.payments, paymentsCrud), opportunities, businessEvents, onCreate: props.onCreateAnimal || animauxCrud.create, onUpdate: props.onUpdateAnimal || animauxCrud.update, onDelete: props.onDeleteAnimal || animauxCrud.remove, onRefresh: props.onRefreshAnimals || animauxCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const avicoleProps = { rows: lots, transactions: rowsOf(props.transactions, financesCrud), alimentationLogs: feedLogs, productionLogs, opportunities, businessEvents, onCreate: props.onCreateLot || avicoleCrud.create, onUpdate: props.onUpdateLot || avicoleCrud.update, onDelete: props.onDeleteLot || avicoleCrud.remove, onRefresh: props.onRefreshLots || avicoleCrud.refresh, onCreateProduction: props.onCreateProduction || productionCrud.create, onUpdateProduction: props.onUpdateProduction || productionCrud.update, onDeleteProduction: props.onDeleteProduction || productionCrud.remove, onRefreshProduction: props.onRefreshProduction || productionCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const healthProps = { rows: health, vets: rowsOf(props.veterinaires, vetsCrud), animaux: animals, lots, stocks, transactions: rowsOf(props.transactions, financesCrud), documents: rowsOf(props.documents, documentsCrud), tasks: rowsOf(props.tasks, tasksCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreate: props.onCreateHealth || santeCrud.create, onUpdate: props.onUpdateHealth || santeCrud.update, onDelete: props.onDeleteHealth || santeCrud.remove, onRefresh: props.onRefreshHealth || santeCrud.refresh, onCreateVet: props.onCreateVet || vetsCrud.create, onUpdateVet: props.onUpdateVet || vetsCrud.update, onDeleteVet: props.onDeleteVet || vetsCrud.remove, onRefreshVets: props.onRefreshVets || vetsCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onNavigate: props.onNavigate };
  const content = tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Animaux' ? <AnimauxV2 {...animalProps} /> : tab === 'Avicole' ? <AvicoleV10 {...avicoleProps} /> : tab === 'Alimentation' ? <FeedingHub data={data} setTab={setTab} /> : tab === 'Santé' ? <SanteV8 {...healthProps} /> : tab === 'Reproduction' ? <ReproductionHub data={data} setTab={setTab} /> : tab === 'Production' ? <ProductionHub data={data} setTab={setTab} /> : tab === 'Transformation' ? <TransformationHub data={data} setTab={setTab} /> : <ModuleGraphiquesTab moduleId="elevage" lots={lots} animaux={animals} productionLogs={productionLogs} alimentationLogs={feedLogs} transactions={rowsOf(props.transactions, financesCrud)} salesOrders={salesOrders} onNavigate={props.onNavigate} />;
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm text-[#8a7456]">Parcours fusionné et rangé par usage : fiches, production, transformation, alimentation, reproduction et santé.</p></section><Tabs active={tab} onChange={setTab} />{content}</div>;
}
