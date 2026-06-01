import { Beef, Bird, BrainCircuit, HeartPulse, LayoutDashboard, Milk, PackageCheck, Sprout, Utensils, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../components/HeyHorizonQuickAsk.jsx';
import { resolveElevageTab, navigateForIaFinding } from '../utils/commercialNavigation';
import { buildElevageHealthSnapshot, computeLotMargin, computeAnimalMargin, formatMargin } from './elevage/elevageVisionHelpers.js';
import AnimauxV2 from './AnimauxV2';
import AvicoleV10 from './AvicoleV10';
import ElevageProductionPanel from './elevage/ElevageProductionPanel.jsx';
import ElevageTransformationPanel from './elevage/ElevageTransformationPanel.jsx';
import ElevageAlimentationPanel from './elevage/ElevageAlimentationPanel.jsx';
import ElevageCyclesPanel from './elevage/ElevageCyclesPanel.jsx';
import ElevageSantePanel from './elevage/ElevageSantePanel.jsx';
import ElevageReproductionPanel from './elevage/ElevageReproductionPanel.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageLogRow, ElevageSection, ElevageStatCard } from './elevage/elevageUi.jsx';
import './elevage/elevage.module.css';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => lower(row.status || row.statut).includes(word));
const lotName = (row = {}) => lower(`${row.type || ''} ${row.type_lot || ''} ${row.production_type || ''} ${row.activity_type || ''} ${row.categorie || ''} ${row.name || ''} ${row.nom || ''}`);
const isPondeuse = (row = {}) => lotName(row).includes('pondeuse') || lotName(row).includes('ponte') || lotName(row).includes('oeuf') || lotName(row).includes('œuf');
const isChair = (row = {}) => lotName(row).includes('chair') || lotName(row).includes('broiler');
const isHealthLate = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(row.statut || row.status || row.etat));
const today = () => new Date().toISOString().slice(0, 10);

function Stat(props) { return <ElevageStatCard {...props} />; }
function Tabs({ active, onChange }) {
  return (
    <div className="elevage-tabs-wrap space-y-2">
      <ModuleTabsBar moduleId="elevage" active={active} onChange={onChange} wrap />
    </div>
  );
}
function ActionCard(props) { return <ElevageActionCard {...props} />; }
function LogRow(props) { return <ElevageLogRow {...props} />; }
function ElevageIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BrainCircuit size={20} /> Surveillance IA élevage</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Cohérence mortalité/effectif, ponte/stock, rentabilité lots — détecté automatiquement.</p>
      <div className="mt-4 space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0 flex-1"><b className="block text-sm text-[#2f2415] break-words">{f.title}</b><p className="mt-1 text-xs leading-relaxed text-amber-800 break-words">{f.recommended_action || f.description}</p></div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => navigateForIaFinding(f, onNavigate)} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Voir</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : 'Appliquer'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 3).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm">
            <b className="text-[#2f2415]">{p.title}</b>
            <p className="text-xs text-[#8a7456]">{p.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
function RentabilitySection({ lotMargins = [], onNavigate }) {
  if (!lotMargins.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Zap size={20} /> Rentabilité lots</h2><button type="button" onClick={() => onNavigate?.('objectifs_croissance')} className="rounded-xl border border-[#d6c3a0] px-3 py-1.5 text-xs font-black">Vision</button></div>
      <p className="mb-3 text-xs text-[#8a7456]">Marge affichée uniquement si poussins, alimentation et vaccins sont renseignés.</p>
      {lotMargins.slice(0, 8).map((row) => (
        <LogRow key={row.id} title={row.name} detail={row.reliable ? `Coûts + revenus OK` : `Manque : ${row.missing.join(', ')}`} value={formatMargin(row)} />
      ))}
    </section>
  );
}
function BusinessHub({ title, intro, stats, children, extra }) {
  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>{stats.map((s) => <Stat key={s.label} {...s} />)}</div>
      {extra}
      <ElevageSection title={title} subtitle={intro}>
        <div className={ELEVAGE_ACTION_GRID}>{children}</div>
      </ElevageSection>
    </div>
  );
}
function Summary({ data, setTab, onApply, busyId, onNavigate }) {
  return <div className="space-y-5">
    <div className={ELEVAGE_STAT_GRID}>
      <Stat label="Santé élevage" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
      <Stat label="Animaux actifs" value={fmtNumber(data.activeAnimals)} />
      <Stat label="Lots pondeuses" value={fmtNumber(data.pondeuses)} tone="good" />
      <Stat label="Production 7 j" value={fmtNumber(data.eggs7d)} tone="good" />
      <Stat label="Mortalité" value={fmtNumber(data.recentMortality)} tone={data.recentMortality ? 'warn' : 'good'} />
      <Stat label="Soins retard" value={fmtNumber(data.healthLate)} tone={data.healthLate ? 'warn' : 'good'} />
      <Stat label="Marges fiables" value={fmtNumber(data.reliableMargins)} tone="good" />
      <Stat label="Marges masquées" value={fmtNumber(data.unreliableMargins)} tone={data.unreliableMargins ? 'warn' : 'good'} />
      <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
      <Stat label="Lots à vendre" value={fmtNumber(data.lotsToSell.length)} tone={data.lotsToSell.length ? 'warn' : 'good'} />
      <Stat label="Sorties aliment" value={fmtNumber(data.feedLogs.length)} />
      <Stat label="Coût alim." value={`${Math.round(data.feedCost).toLocaleString('fr-FR')} F`} tone="warn" />
    </div>
    <ElevageIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} />
    <RentabilitySection lotMargins={data.lotMargins} onNavigate={onNavigate} />
    <ElevageSection title="Parcours métier" subtitle="Production, transformation, alimentation, reproduction et santé — sans dupliquer Animaux/Avicole.">
      <div className={ELEVAGE_ACTION_GRID}>
        <ActionCard title="Cycles & bandes" text="Quand lancer, réformer, vendre." onClick={() => setTab('Cycles')} />
        <ActionCard title="Production" text="Œufs, ponte, rendements." onClick={() => setTab('Production')} />
        <ActionCard title="Transformation" text="Abattage, réforme, mortalité." onClick={() => setTab('Transformation')} />
        <ActionCard title="Alimentation" text="Distribution et consommation." onClick={() => setTab('Alimentation')} />
        <ActionCard title="Reproduction" text="Naissances et gestations." onClick={() => setTab('Reproduction')} />
        <ActionCard title="Santé" text="Soins, vaccins, alertes." onClick={() => setTab('Santé')} />
      </div>
    </ElevageSection>
  </div>;
}
function ProductionHub({ data, setTab, onNavigate, animalProps, avicoleProps, horizonDraft, onCloseDraft }) {
  const recent = data.productionLogs.slice(0, 8);
  return (
    <ElevageProductionPanel
      data={data}
      setTab={setTab}
      animalProps={animalProps}
      avicoleProps={avicoleProps}
      horizonDraft={horizonDraft}
      onCloseDraft={onCloseDraft}
      recent={recent}
      stats={[
        { label: 'Ramassages', value: fmtNumber(data.productionLogs.length), tone: 'good' },
        { label: 'Lots pondeuses', value: fmtNumber(data.pondeuses), tone: 'good' },
        { label: 'Lots chair', value: fmtNumber(data.chair) },
        { label: '7 derniers jours', value: fmtNumber(data.eggs7d), tone: 'good' },
      ]}
    />
  );
}
function TransformationHub({ data, setTab, onNavigate, animalProps, avicoleProps, horizonDraft, onCloseDraft }) {
  return (
    <ElevageTransformationPanel
      data={data}
      setTab={setTab}
      animalProps={animalProps}
      avicoleProps={avicoleProps}
      horizonDraft={horizonDraft}
      onCloseDraft={onCloseDraft}
      stats={[
        { label: 'Animaux sortis', value: fmtNumber(data.closedAnimals) },
        { label: 'Mortalité lots', value: fmtNumber(data.recentMortality), tone: data.recentMortality ? 'warn' : 'good' },
        { label: 'Lots chair', value: fmtNumber(data.chair) },
        { label: 'Ventes liées', value: fmtNumber(data.salesOrders.length) },
      ]}
    />
  );
}
function FeedingHub({ data, setTab, onNavigate, animalProps, avicoleProps }) {
  return (
    <ElevageAlimentationPanel
      data={data}
      setTab={setTab}
      animalProps={animalProps}
      avicoleProps={avicoleProps}
      onNavigate={onNavigate}
    />
  );
}
function ReproductionHub({ data, setTab, animalProps, horizonDraft, onCloseDraft }) {
  return (
    <ElevageReproductionPanel
      data={data}
      setTab={setTab}
      animalProps={animalProps}
      horizonDraft={horizonDraft}
      onCloseDraft={onCloseDraft}
    />
  );
}

export default function ElevageRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveElevageTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);
  const [horizonDraft, setHorizonDraft] = useState(null);

  useEffect(() => {
    if (props.initialTab) setTab(resolveElevageTab(props.initialTab));
  }, [props.initialTab]);

  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      const module = event.detail?.module;
      if (module === 'avicole' && draft?.form_type === 'egg_production') {
        setTab('Production');
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-avicole-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        return;
      }
      if (module === 'avicole' && ['poultry_mortality', 'poultry_close'].includes(draft?.form_type)) {
        setTab('Transformation');
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-avicole-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        return;
      }
      if (module === 'animaux' && draft?.form_type === 'animal_weighing') {
        setTab('Production');
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        return;
      }
      if (module === 'animaux' && draft?.form_type === 'animal_loss') {
        setTab('Transformation');
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        return;
      }
      if (module === 'animaux' && draft?.form_type === 'animal_creation') {
        setTab('Reproduction');
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
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
  const periodFiltered = Boolean(props.periodFiltered);

  const animals = rowsOf(props.animaux, animauxCrud, false);
  const lots = rowsOf(props.lots, avicoleCrud, false);
  const health = rowsOf(props.sante, santeCrud, periodFiltered);
  const productionLogs = rowsOf(props.productionLogs, productionCrud, periodFiltered);
  const feedLogs = rowsOf(props.alimentationLogs, feedCrud, periodFiltered);
  const stocks = rowsOf(props.stocks, stockCrud, false);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const data = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const eggs7d = productionLogs.filter((row) => String(row.date || row.created_at || '').slice(0, 10) >= weekAgo).reduce((s, row) => s + Number(row.oeufs_produits || row.eggs_count || row.oeufs || 0), 0);
    const feedCost = feedLogs.reduce((s, row) => s + Number(row.cout_total || row.cost || row.montant || 0), 0);
    const recentMortality = lots.reduce((s, lot) => s + Number(lot.mortality || 0), 0) + businessEvents.filter((row) => /mort|perte|deces|décès/.test(lower(`${row.event_type || ''} ${row.title || ''}`))).length;
    const lotsToSell = lots.filter((row) => ['pret_vente', 'prêt vente', 'a_vendre', 'à vendre', 'maturite', 'maturité'].some((x) => lower(`${row.status || ''} ${row.statut || ''} ${row.notes || ''}`).includes(x)));
    const lotMargins = [...lots.map(computeLotMargin), ...animals.filter((a) => !isClosedAnimal(a)).slice(0, 5).map(computeAnimalMargin)].sort((a, b) => {
      if (a.reliable && !b.reliable) return -1;
      if (!a.reliable && b.reliable) return 1;
      return (a.margin ?? 0) - (b.margin ?? 0);
    });
    const reliableMargins = lotMargins.filter((r) => r.reliable).length;
    const unreliableMargins = lotMargins.filter((r) => !r.reliable).length;
    const healthSnap = buildElevageHealthSnapshot({ animaux: animals, lots, feedLogs, productionLogs, stocks, sante: health });
    return {
      animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents,
      activeAnimals: animals.filter((row) => !isClosedAnimal(row)).length,
      closedAnimals: animals.filter(isClosedAnimal).length,
      pondeuses: lots.filter(isPondeuse).length,
      chair: lots.filter(isChair).length,
      healthLate: health.filter(isHealthLate).length,
      feedStocks: stocks.filter((row) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(lower(`${row.produit || row.name || row.nom || ''} ${row.categorie || row.category || ''}`))),
      females: animals.filter((row) => ['femelle', 'female', 'vache', 'brebis', 'chevre', 'chèvre'].some((x) => lower(`${row.sexe || ''} ${row.type || ''} ${row.espece || ''}`).includes(x))).length,
      birthLikeEvents: businessEvents.filter((row) => /naissance|mise bas|veau|agneau|chevreau/.test(lower(`${row.event_type || ''} ${row.title || ''} ${row.description || ''}`))).length,
      livestockEvents: businessEvents.filter((row) => /animal|avicole|elevage|élevage|sante|santé/.test(lower(`${row.module_source || ''} ${row.event_type || ''} ${row.title || ''}`))),
      eggs7d, feedCost, recentMortality, lotsToSell,
      lotMargins, reliableMargins, unreliableMargins,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
    };
  }, [animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents]);

  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  };
  const handleTabChange = (next) => {
    setTab(next);
    if (!['Production', 'Transformation', 'Reproduction'].includes(next)) setHorizonDraft(null);
  };
  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else toast.success('Module ouvert');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const shared = { onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate, embedInElevage: true, onElevageTabChange: handleTabChange };
  const animalProps = { rows: animals, alimentationLogs: feedLogs, vaccins: health, salesOrders, payments: rowsOf(props.payments, paymentsCrud, periodFiltered), opportunities, businessEvents, onCreate: props.onCreateAnimal || animauxCrud.create, onUpdate: props.onUpdateAnimal || animauxCrud.update, onDelete: props.onDeleteAnimal || animauxCrud.remove, onRefresh: props.onRefreshAnimals || animauxCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const avicoleProps = { rows: lots, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), alimentationLogs: feedLogs, productionLogs, opportunities, businessEvents, onCreate: props.onCreateLot || avicoleCrud.create, onUpdate: props.onUpdateLot || avicoleCrud.update, onDelete: props.onDeleteLot || avicoleCrud.remove, onRefresh: props.onRefreshLots || avicoleCrud.refresh, onCreateProduction: props.onCreateProduction || productionCrud.create, onUpdateProduction: props.onUpdateProduction || productionCrud.update, onDeleteProduction: props.onDeleteProduction || productionCrud.remove, onRefreshProduction: props.onRefreshProduction || productionCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const healthProps = { rows: health, vets: rowsOf(props.veterinaires, vetsCrud, false), animaux: animals, lots, stocks, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), documents: rowsOf(props.documents, documentsCrud, periodFiltered), tasks: rowsOf(props.tasks, tasksCrud, false), alertes: rowsOf(props.alertes, alertsCrud, false), onCreate: props.onCreateHealth || santeCrud.create, onUpdate: props.onUpdateHealth || santeCrud.update, onDelete: props.onDeleteHealth || santeCrud.remove, onRefresh: props.onRefreshHealth || santeCrud.refresh, onCreateVet: props.onCreateVet || vetsCrud.create, onUpdateVet: props.onUpdateVet || vetsCrud.update, onDeleteVet: props.onDeleteVet || vetsCrud.remove, onRefreshVets: props.onRefreshVets || vetsCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onNavigate: props.onNavigate };
  const content = tab === 'Cycles' ? (
    <ElevageCyclesPanel
      dataMap={{ ...props.dataMap, animaux: animals, lots, production_oeufs_logs: productionLogs, alimentation_logs: feedLogs, stock: stocks }}
      lots={lots}
      animaux={animals}
      productionLogs={productionLogs}
      alimentationLogs={feedLogs}
      feedLogs={feedLogs}
      animalProps={animalProps}
      avicoleProps={avicoleProps}
      onNavigate={props.onNavigate}
    />
  ) : tab === 'Résumé' ? <Summary data={data} setTab={handleTabChange} onApply={applyFinding} busyId={busyId} onNavigate={props.onNavigate} /> : tab === 'Animaux' ? <AnimauxV2 {...animalProps} /> : tab === 'Avicole' ? <AvicoleV10 {...avicoleProps} /> : tab === 'Alimentation' ? <FeedingHub data={data} setTab={handleTabChange} onNavigate={props.onNavigate} animalProps={animalProps} avicoleProps={avicoleProps} /> : tab === 'Santé' ? <ElevageSantePanel healthProps={healthProps} onNavigate={props.onNavigate} /> : tab === 'Reproduction' ? <ReproductionHub data={data} setTab={handleTabChange} animalProps={animalProps} horizonDraft={horizonDraft} onCloseDraft={() => setHorizonDraft(null)} /> : tab === 'Production' ? <ProductionHub data={data} setTab={handleTabChange} onNavigate={props.onNavigate} animalProps={animalProps} avicoleProps={avicoleProps} horizonDraft={horizonDraft} onCloseDraft={() => setHorizonDraft(null)} /> : tab === 'Transformation' ? <TransformationHub data={data} setTab={handleTabChange} onNavigate={props.onNavigate} animalProps={animalProps} avicoleProps={avicoleProps} horizonDraft={horizonDraft} onCloseDraft={() => setHorizonDraft(null)} /> : tab === 'Annexe' ? <ModuleAnnexeTab moduleId="elevage" dataMap={{ ...props.dataMap, animaux: animals, lots, production_oeufs_logs: productionLogs, alimentation_logs: feedLogs, stock: stocks }} onNavigate={props.onNavigate} /> : <ModuleGraphiquesTab moduleId="elevage" periodFiltered={periodFiltered} lots={lots} animaux={animals} productionLogs={productionLogs} alimentationLogs={feedLogs} transactions={rowsOf(props.transactions, financesCrud, periodFiltered)} salesOrders={salesOrders} onNavigate={props.onNavigate} />;
  return <div className="elevage-module space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm leading-relaxed text-[#8a7456]">Animaux, avicole, alimentation, santé, reproduction, transformation — IA proactive et rentabilité fiable.</p>{props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}<HeyHorizonQuickAsk moduleKey="elevage" onNavigate={props.onNavigate} onOpenAssistant={props.onOpenAssistant} className="mt-2" /></div><div className="shrink-0 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé module </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div></div></section><Tabs active={tab} onChange={handleTabChange} />{content}</div>;
}
