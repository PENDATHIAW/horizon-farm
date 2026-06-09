import { BrainCircuit, HeartPulse, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { fmtNumber } from '../utils/format';
import { commitElevageEggProduction } from '../utils/elevageWorkflow.js';
import { aggregateSummaryLayingRate, formatOfficialLayingRate } from '../utils/elevageLayingRate.js';
import { rowsOf } from '../utils/moduleRows';
import VisionCyclesTab from './vision/VisionCyclesTab.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../components/HeyHorizonQuickAsk.jsx';
import { resolveElevageTab, navigateForIaFinding } from '../utils/commercialNavigation';
import { buildElevageHealthSnapshot, computeLotMargin, computeAnimalMargin, formatMargin } from './elevage/elevageVisionHelpers.js';
import { buildElevageStartupProgress, isElevageStartupMode } from './elevage/elevageStartupHelpers.js';
import ElevageStartupPanel from './elevage/ElevageStartupPanel.jsx';
import ElevageWorkflowPanels, { buildElevageHandlers, useElevageWorkflowContext } from './elevage/ElevageWorkflowPanels.jsx';
import ElevageActivityPnlPanel from './elevage/ElevageActivityPnlPanel.jsx';
import ElevageProfitabilityKpis from './elevage/ElevageProfitabilityKpis.jsx';
import ElevageInsightPanel from './elevage/ElevageInsightPanel.jsx';
import ElevageMobileToolbar from './elevage/ElevageMobileToolbar.jsx';
import ProductionHub from './elevage/ProductionHub.jsx';
import { buildProductionHubSnapshot } from '../utils/productionHubMetrics.js';
import { buildElevageActivityPnl, isBovinAnimal, isChairLot, isPondeuseLot } from '../utils/elevageActivityPnl.js';
import { buildElevageCostAwareInsights } from '../utils/elevageIaInsights.js';
import { buildElevageInvestorReport, exportElevageInvestorPdf } from '../utils/elevageExport.js';
import { buildElevageTransformationRows } from '../utils/elevageTransformationJournal.js';
import ElevageTransformationJournal from '../components/ElevageTransformationJournal.jsx';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AvicoleTransformationBridge from './AvicoleTransformationBridge.jsx';
import AnimauxV2 from './AnimauxV2';
import AvicoleV10 from './AvicoleV10';
import SanteV8 from './SanteV8';
import {
  openElevageHealthForm,
  scrollToHealthInterventionForm,
} from '../utils/elevageHealthNavigation.js';

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
function Tabs({ active, onChange, activeFarm }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="elevage" active={active} onChange={onChange} activeFarm={activeFarm} />
    </div>
  );
}
function ActionCard({ title, text, onClick }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:bg-[#dcfce7]"><b className="text-[#2f2415]">{title}</b><p className="mt-1 text-sm text-[#8a7456]">{text}</p></button>; }
function LogRow({ title, detail, value }) {
  return <div className="grid grid-cols-1 gap-1 border-b border-[#eadcc2]/70 py-3 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"><div><b className="text-sm text-[#2f2415]">{title}</b><p className="text-xs text-[#8a7456]">{detail}</p></div><span className="text-xs font-black text-[#8a7456]">{value}</span></div>;
}
function ElevageIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BrainCircuit size={20} /> Surveillance IA élevage</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Cohérence mortalité/effectif, ponte/stock, rentabilité lots — détecté automatiquement.</p>
      <div className="mt-4 space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
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
function BusinessHub({ title, intro, stats, children, extra }) { return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((s) => <Stat key={s.label} {...s} />)}</div>{extra}<section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">{intro}</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div></section></div>; }
function Summary({
  data, setTab, onApply, busyId, onNavigate, onOpenWorkflow, showStartup, startupProgress,
  advancedOpen, onToggleAdvanced, profitabilityOpen, onToggleProfitability, onExport,
}) {
  return <div className="space-y-5">
    {showStartup ? <ElevageStartupPanel progress={startupProgress} setTab={setTab} onNavigate={onNavigate} onOpenWorkflow={onOpenWorkflow} /> : null}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      <Stat label="Santé élevage" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
      <Stat label="Taux de ponte" value={data.layingRateLabel} tone={data.layingRateCalculable ? 'good' : 'warn'} />
      <Stat label="Animaux actifs" value={fmtNumber(data.activeAnimals)} />
      <Stat label="Production 7 j" value={fmtNumber(data.eggs7d)} tone="good" />
      <Stat label="Mortalité" value={fmtNumber(data.recentMortality)} tone={data.recentMortality ? 'warn' : 'good'} />
      <Stat label="Coût alim." value={`${Math.round(data.feedCost).toLocaleString('fr-FR')} F`} tone="warn" />
    </div>
    <ElevageInsightPanel insights={data.costAwareInsights} onApplyFinding={onApply} onNavigate={onNavigate} busyId={busyId} />
    <ElevageActivityPnlPanel pnl={data.activityPnl} onExport={onExport} />
    <ElevageProfitabilityKpis
      pondeuseLots={data.pondeuseLots}
      chairLots={data.chairLots}
      bovins={data.bovins}
      context={data.marginContext}
      open={profitabilityOpen}
      onToggle={onToggleProfitability}
    />
    <section className="hidden md:block rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-[#2f2415]">Actions terrain</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Saisies fiables avec impacts stock, finance et traçabilité.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ActionCard title="Enregistrer alimentation" text="Distribution liée au stock et au lot." onClick={() => onOpenWorkflow?.('feeding')} />
        <ActionCard title="Enregistrer ponte" text="Ramassage œufs avec entrée stock si configurée." onClick={() => onOpenWorkflow?.('eggs')} />
        <ActionCard title="Enregistrer mortalité" text="Impact effectif lot et alertes seuil." onClick={() => onOpenWorkflow?.('mortality')} />
        <ActionCard title="Enregistrer santé" text="Formulaire complet : intervention, preuve, stock, coût et rappel." onClick={() => onOpenWorkflow?.('health')} />
        <ActionCard title="Enregistrer poids" text="Pesée lot ou animal avec historique." onClick={() => onOpenWorkflow?.('weighing')} />
        <ActionCard title="Vendre / préparer vente" text="Lots prêts, opportunités Commercial." onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
      </div>
    </section>
    <CollapsibleAdvancedSection
      eyebrow="Analyse avancée"
      title="Détails marges et signaux ERP"
      description="Marges par lot, prédictions ERP — replié par défaut."
      open={advancedOpen}
      onToggle={onToggleAdvanced}
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Stat label="Lots pondeuses" value={fmtNumber(data.pondeuses)} tone="good" />
        <Stat label="Soins retard" value={fmtNumber(data.healthLate)} tone={data.healthLate ? 'warn' : 'good'} />
        <Stat label="Marges fiables" value={fmtNumber(data.reliableMargins)} tone="good" />
        <Stat label="Marges masquées" value={fmtNumber(data.unreliableMargins)} tone={data.unreliableMargins ? 'warn' : 'good'} />
        <Stat label="Lots à vendre" value={fmtNumber(data.lotsToSell.length)} tone={data.lotsToSell.length ? 'warn' : 'good'} />
        <Stat label="Sorties aliment" value={fmtNumber(data.feedLogs.length)} />
      </div>
      <ElevageIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} />
      <RentabilitySection lotMargins={data.lotMargins} onNavigate={onNavigate} />
    </CollapsibleAdvancedSection>
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">Parcours métier</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Production, transformation, alimentation, reproduction et santé — sans dupliquer Animaux/Avicole.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6"><ActionCard title="Cycles & bandes" text="Quand lancer, réformer, vendre." onClick={() => setTab('Cycles')} /><ActionCard title="Production" text="Œufs, ponte, rendements." onClick={() => setTab('Production')} /><ActionCard title="Transformation" text="Abattage, réforme, mortalité." onClick={() => setTab('Transformation')} /><ActionCard title="Alimentation" text="Distribution et consommation." onClick={() => setTab('Alimentation')} /><ActionCard title="Reproduction" text="Naissances et gestations." onClick={() => setTab('Reproduction')} /><ActionCard title="Santé" text="Soins, vaccins, alertes." onClick={() => setTab('Santé')} /></div></section>
  </div>;
}
function TransformationHub({ data, setTab, onNavigate, onOpenWorkflow, animalBridgeProps, avicoleBridgeProps }) {
  const salesCount = data.transformationSalesCount ?? data.transformationRows?.filter((r) => r.kind === 'vente').length ?? 0;
  return (
    <div className="space-y-5">
      <BusinessHub
        title="Transformation"
        intro="Ventes animaux et lots avicole, abattages, réformes et mortalités — journal centralisé."
        stats={[
          { label: 'Ventes journalisées', value: fmtNumber(salesCount), tone: salesCount ? 'good' : 'warn' },
          { label: 'Animaux sortis', value: fmtNumber(data.closedAnimals) },
          { label: 'Mortalité lots', value: fmtNumber(data.recentMortality), tone: data.recentMortality ? 'warn' : 'good' },
          { label: 'Lignes journal', value: fmtNumber(data.transformationRows?.length || 0) },
        ]}
      >
        <ActionCard title="+ Mortalité lot avicole" text="Workflow officiel — effectif, alertes, perte finance." onClick={() => onOpenWorkflow?.('mortality')} />
        <ActionCard title="+ Sortie / abattage animal" text="Abattage → stock viande (section ci-dessous)." onClick={() => setTab('Animaux')} />
        <ActionCard title="+ Clôturer lot" text="Réforme, prêt vente ou abattage lot." onClick={() => onOpenWorkflow?.('transform')} />
        <ActionCard title="Commercial — ventes" text="Créer commande liée animal / lot." onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        <ActionCard title="Lots à vendre" text={`${data.lotsToSell.length} lot(s) matures.`} onClick={() => setTab('Avicole')} />
      </BusinessHub>
      <ElevageTransformationJournal rows={data.transformationRows || []} onOpenCommercial={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
      {animalBridgeProps ? <AnimalSlaughterStockBridge {...animalBridgeProps} /> : null}
      {avicoleBridgeProps ? <AvicoleTransformationBridge {...avicoleBridgeProps} /> : null}
    </div>
  );
}
function FeedingHub({ data, setTab, onNavigate, onOpenWorkflow }) {
  const recent = data.feedLogs.slice(0, 8);
  return <BusinessHub title="Alimentation" intro="Distributions et consommations — workflow officiel vers stock_movements." stats={[{ label: 'Sorties aliment', value: fmtNumber(data.feedLogs.length) }, { label: 'Coût cumulé', value: `${Math.round(data.feedCost).toLocaleString('fr-FR')} F`, tone: 'warn' }, { label: 'Stock aliment', value: fmtNumber(data.feedStocks.length), tone: data.feedStocks.length ? 'good' : 'warn' }, { label: 'Prévisions IA', value: fmtNumber(data.healthPredictions.length), tone: data.healthPredictions.length ? 'warn' : 'good' }]} extra={recent.length ? <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h3 className="font-black text-[#2f2415]">Dernières distributions</h3>{recent.map((row) => <LogRow key={row.id || row.date} title={String(row.date || row.created_at || '—').slice(0, 10)} detail={row.produit || row.lot_nom || row.animal_id || 'Aliment'} value={`${fmtNumber(row.quantite || row.quantity || 0)} u.`} />)}</section> : null}><ActionCard title="+ Distribution aliment" text="Workflow officiel — stock, finance, alertes." onClick={() => onOpenWorkflow?.('feeding')} /><ActionCard title="Acheter aliment" text="Réapprovisionnement Achats & Stock." onClick={() => onNavigate?.('achats_stock')} /><ActionCard title="Avicole" text="Historique consommation lots." onClick={() => setTab('Avicole')} /></BusinessHub>;
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
  const [tab, setTab] = useState(() => resolveElevageTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [healthDraft, setHealthDraft] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profitabilityOpen, setProfitabilityOpen] = useState(false);

  useEffect(() => {
    if (props.initialTab) setTab(resolveElevageTab(props.initialTab));
  }, [props.initialTab]);
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
  const movementsCrud = useCrudModule('stock_movements');
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
  const stockMovements = rowsOf(props.stockMovements, movementsCrud, false);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const data = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const eggs7d = productionLogs.filter((row) => String(row.date || row.created_at || '').slice(0, 10) >= weekAgo).reduce((s, row) => s + Number(row.oeufs_produits || row.eggs_count || row.oeufs || 0), 0);
    const feedCost = feedLogs.reduce((s, row) => s + Number(row.montant_total || row.cout_total || row.cost || row.montant || 0), 0);
    const recentMortality = lots.reduce((s, lot) => s + Number(lot.mortality || 0), 0) + businessEvents.filter((row) => /mort|perte|deces|décès/.test(lower(`${row.event_type || ''} ${row.title || ''}`))).length;
    const lotsToSell = lots.filter((row) => ['pret_vente', 'prêt vente', 'a_vendre', 'à vendre', 'maturite', 'maturité'].some((x) => lower(`${row.status || ''} ${row.statut || ''} ${row.notes || ''}`).includes(x)));
    const marginContext = { feedLogs, alimentationLogs: feedLogs, productionLogs, healthEvents: health, businessEvents, vaccins: health };
    const lotMargins = [...lots.map((lot) => computeLotMargin(lot, marginContext)), ...animals.filter((a) => !isClosedAnimal(a)).slice(0, 5).map((animal) => computeAnimalMargin(animal, marginContext))].sort((a, b) => {
      if (a.reliable && !b.reliable) return -1;
      if (!a.reliable && b.reliable) return 1;
      return (a.margin ?? 0) - (b.margin ?? 0);
    });
    const reliableMargins = lotMargins.filter((r) => r.reliable).length;
    const unreliableMargins = lotMargins.filter((r) => !r.reliable).length;
    const healthSnap = buildElevageHealthSnapshot({ animaux: animals, lots, feedLogs, productionLogs, stocks, sante: health });
    const layingSummary = aggregateSummaryLayingRate(lots, productionLogs, 7);
    const activityPnl = buildElevageActivityPnl({
      lots,
      animaux: animals,
      feedLogs,
      productionLogs,
      healthEvents: health,
      businessEvents,
      salesOrders,
    });
    const costAwareInsights = buildElevageCostAwareInsights({
      lots,
      animaux: animals,
      feedLogs,
      productionLogs,
      healthEvents: health,
      stocks,
      findings: healthSnap.findings,
    });
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
      transformationRows: (() => {
        const trPayments = rowsOf(props.payments, paymentsCrud, periodFiltered);
        return buildElevageTransformationRows({ animals, lots, salesOrders, businessEvents, payments: trPayments });
      })(),
      transformationSalesCount: (() => {
        const trPayments = rowsOf(props.payments, paymentsCrud, periodFiltered);
        return buildElevageTransformationRows({ animals, lots, salesOrders, businessEvents, payments: trPayments }).filter((row) => row.kind === 'vente').length;
      })(),
      healthPredictions: healthSnap.predictions,
      layingRateLabel: formatOfficialLayingRate(layingSummary),
      layingRateCalculable: layingSummary.calculable,
      layingRate: layingSummary.rate,
      activityPnl,
      costAwareInsights,
      marginContext,
      pondeuseLots: lots.filter(isPondeuseLot),
      chairLots: lots.filter(isChairLot),
      bovins: animals.filter(isBovinAnimal),
      productionSnapshot: buildProductionHubSnapshot({
        lots,
        animaux: animals,
        productionLogs,
        stocks,
        feedLogs,
        healthEvents: health,
        transformationRows: (() => {
          const trPayments = rowsOf(props.payments, paymentsCrud, periodFiltered);
          return buildElevageTransformationRows({ animals, lots, salesOrders, businessEvents, payments: trPayments });
        })(),
        documents: rowsOf(props.documents, documentsCrud, periodFiltered),
        opportunities,
        marginContext: { feedLogs, alimentationLogs: feedLogs, productionLogs, healthEvents: health, businessEvents },
      }),
    };
  }, [animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents, props.payments, props.documents, paymentsCrud, documentsCrud, periodFiltered]);

  const workflowContext = useElevageWorkflowContext({
    lots,
    animaux: animals,
    stocks,
    transactions: rowsOf(props.transactions, financesCrud, periodFiltered),
    tasks: rowsOf(props.tasks, tasksCrud, false),
    alertes: rowsOf(props.alertes, alertsCrud, false),
    businessEvents,
    alimentationLogs: feedLogs,
    productionLogs,
    sante: health,
    stockMovements,
  });

  const elevageHandlers = buildElevageHandlers({
    onCreateAlimentation: props.onCreateAlimentation || feedCrud.create,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create,
    onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh,
    stockMovements,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateHealth: props.onCreateHealth || santeCrud.create,
    onUpdateHealth: props.onUpdateHealth || santeCrud.update,
    onUpdateLot: props.onUpdateLot || avicoleCrud.update,
    onUpdateAnimal: props.onUpdateAnimal || animauxCrud.update,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onCreateProduction: props.onCreateProduction || productionCrud.create,
    onCreateWeightRecord: props.onCreateWeightRecord,
  });

  const refreshAfterWorkflow = useCallback(async () => {
    await Promise.allSettled([
      feedCrud.refresh?.(),
      productionCrud.refresh?.(),
      stockCrud.refresh?.(),
      movementsCrud.refresh?.(),
      avicoleCrud.refresh?.(),
      animauxCrud.refresh?.(),
      santeCrud.refresh?.(),
      eventsCrud.refresh?.(),
      financesCrud.refresh?.(),
      alertsCrud.refresh?.(),
      tasksCrud.refresh?.(),
    ]);
  }, [feedCrud, productionCrud, stockCrud, movementsCrud, avicoleCrud, animauxCrud, santeCrud, eventsCrud, financesCrud, alertsCrud, tasksCrud]);

  const commitEggProduction = useCallback(async (formPartial = {}) => {
    const result = await commitElevageEggProduction({
      form: formPartial,
      context: workflowContext,
      handlers: elevageHandlers,
    });
    await refreshAfterWorkflow();
    if (result.packagingGap) toast(result.packagingGap, { icon: 'ℹ️' });
    return result;
  }, [workflowContext, elevageHandlers, refreshAfterWorkflow]);

  const clearHealthDraft = useCallback(() => setHealthDraft(null), []);

  const openWorkflow = useCallback((modal, context = {}) => {
    if (modal === 'health') {
      openElevageHealthForm({
        setTab,
        setHealthDraft,
        context: {
          animalId: context.animalId || context.animal_id,
          lotId: context.lotId || context.lot_id,
          typeIntervention: context.typeIntervention || context.type_intervention,
          date: context.date,
          nom: context.nom,
          notes: context.notes,
        },
        onAfterOpen: () => {
          scrollToHealthInterventionForm();
          toast.success('Intervention santé — formulaire complet ouvert');
        },
      });
      return;
    }
    setActiveModal(modal);
  }, []);
  const closeWorkflow = useCallback(() => setActiveModal(null), []);

  const startupProgress = useMemo(() => buildElevageStartupProgress({
    lots,
    animaux: animals,
    feedStocks: data.feedStocks,
    feedLogs,
    health,
    productionLogs,
    opportunities,
    salesOrders,
  }), [lots, animals, data.feedStocks, feedLogs, health, productionLogs, opportunities, salesOrders]);

  const showStartup = useMemo(() => isElevageStartupMode({
    lots,
    animaux: animals,
    feedLogs,
    health,
    productionLogs,
  }), [lots, animals, feedLogs, health, productionLogs]);

  const pondeuseLots = useMemo(() => lots.filter(isPondeuse), [lots]);

  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
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

  const shared = { onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const animalProps = { rows: animals, alimentationLogs: feedLogs, vaccins: health, salesOrders, payments: rowsOf(props.payments, paymentsCrud, periodFiltered), opportunities, businessEvents, onCreate: props.onCreateAnimal || animauxCrud.create, onUpdate: props.onUpdateAnimal || animauxCrud.update, onDelete: props.onDeleteAnimal || animauxCrud.remove, onRefresh: props.onRefreshAnimals || animauxCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const avicoleProps = { rows: lots, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), alimentationLogs: feedLogs, productionLogs, stocks, stockMovements, opportunities, businessEvents, onCreate: props.onCreateLot || avicoleCrud.create, onUpdate: props.onUpdateLot || avicoleCrud.update, onDelete: props.onDeleteLot || avicoleCrud.remove, onRefresh: props.onRefreshLots || avicoleCrud.refresh, onCreateProduction: props.onCreateProduction || productionCrud.create, onUpdateProduction: props.onUpdateProduction || productionCrud.update, onDeleteProduction: props.onDeleteProduction || productionCrud.remove, onRefreshProduction: props.onRefreshProduction || productionCrud.refresh, onCommitEggProduction: commitEggProduction, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create, onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, ...shared };
  const healthProps = { rows: health, vets: rowsOf(props.veterinaires, vetsCrud, false), animaux: animals, lots, stocks, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), documents: rowsOf(props.documents, documentsCrud, periodFiltered), tasks: rowsOf(props.tasks, tasksCrud, false), alertes: rowsOf(props.alertes, alertsCrud, false), healthDraft, onClearHealthDraft: clearHealthDraft, onCreate: props.onCreateHealth || santeCrud.create, onUpdate: props.onUpdateHealth || santeCrud.update, onDelete: props.onDeleteHealth || santeCrud.remove, onRefresh: props.onRefreshHealth || santeCrud.refresh, onCreateVet: props.onCreateVet || vetsCrud.create, onUpdateVet: props.onUpdateVet || vetsCrud.update, onDeleteVet: props.onDeleteVet || vetsCrud.remove, onRefreshVets: props.onRefreshVets || vetsCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onNavigate: props.onNavigate };
  const content = tab === 'Cycles' ? (
    <VisionCyclesTab
      dataMap={{ ...props.dataMap, animaux: animals, lots, production_oeufs_logs: productionLogs, alimentation_logs: feedLogs, stock: stocks }}
      lots={lots}
      animaux={animals}
      productionLogs={productionLogs}
      onNavigate={props.onNavigate}
    />
  ) : tab === 'Résumé' ? (
    <Summary
      data={data}
      setTab={setTab}
      onApply={applyFinding}
      busyId={busyId}
      onNavigate={props.onNavigate}
      onOpenWorkflow={openWorkflow}
      showStartup={showStartup}
      startupProgress={startupProgress}
      advancedOpen={advancedOpen}
      onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
      profitabilityOpen={profitabilityOpen}
      onToggleProfitability={() => setProfitabilityOpen((v) => !v)}
      onExport={() => {
        const report = buildElevageInvestorReport({
          lots,
          animaux: animals,
          feedLogs,
          productionLogs,
          healthEvents: health,
          stocks,
          businessEvents,
          salesOrders,
          findings: data.healthFindings,
          periodLabel: props.periodLabel,
          farmLabel: props.activeFarm?.name,
        });
        exportElevageInvestorPdf(report);
        toast.success('Rapport Élevage généré');
      }}
    />
  ) : tab === 'Animaux' ? <AnimauxV2 {...animalProps} /> : tab === 'Avicole' ? <AvicoleV10 {...avicoleProps} /> : tab === 'Alimentation' ? <FeedingHub data={data} setTab={setTab} onNavigate={props.onNavigate} onOpenWorkflow={openWorkflow} /> : tab === 'Santé' ? <SanteV8 {...healthProps} /> : tab === 'Reproduction' ? <ReproductionHub data={data} setTab={setTab} /> : tab === 'Production' ? <ProductionHub snapshot={data.productionSnapshot} setTab={setTab} onNavigate={props.onNavigate} onOpenWorkflow={openWorkflow} /> : tab === 'Transformation' ? <TransformationHub data={data} setTab={setTab} onNavigate={props.onNavigate} onOpenWorkflow={openWorkflow} animalBridgeProps={animalProps} avicoleBridgeProps={avicoleProps} /> : tab === 'Annexe' ? <ModuleAnnexeTab moduleId="elevage" onNavigate={props.onNavigate} /> : <ModuleGraphiquesTab moduleId="elevage" periodFiltered={periodFiltered} lots={lots} animaux={animals} productionLogs={productionLogs} alimentationLogs={feedLogs} transactions={rowsOf(props.transactions, financesCrud, periodFiltered)} salesOrders={salesOrders} onNavigate={props.onNavigate} />;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm text-[#8a7456]">Animaux, avicole, alimentation, santé, reproduction, transformation — IA proactive et rentabilité fiable.</p>{props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}<HeyHorizonQuickAsk moduleKey="elevage" onNavigate={props.onNavigate} onOpenAssistant={props.onOpenAssistant} className="mt-2" /></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé module </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div></div></section>
      <Tabs active={tab} onChange={setTab} activeFarm={props.activeFarm} />
      {content}
      <ElevageWorkflowPanels
        activeModal={activeModal}
        onClose={closeWorkflow}
        context={workflowContext}
        handlers={elevageHandlers}
        feedStocks={data.feedStocks}
        lots={lots}
        animaux={animals}
        pondeuseLots={pondeuseLots}
        onSuccess={refreshAfterWorkflow}
      />
      <ElevageMobileToolbar onOpenWorkflow={openWorkflow} onNavigate={props.onNavigate} />
    </div>
  );
}
