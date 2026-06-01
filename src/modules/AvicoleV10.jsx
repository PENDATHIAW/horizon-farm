import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Bird, ChevronDown, ClipboardList, Drumstick, Egg, HeartPulse, Info, PackageCheck, Scissors, Sprout, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import MiniMetricCard from '../components/MiniMetricCard.jsx';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { fmtNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../utils/avicoleMetrics';
import { isSaleReady, saleOpportunityKey } from '../utils/saleReadiness';
import { buildPersistedOpportunityPayload, findOpportunityForSource, mergeSaleReadySavePayload } from '../utils/saleReadyWorkflow';
import AvicoleSaleReadinessBridge from './AvicoleSaleReadinessBridge.jsx';
import AvicoleBase from './AvicoleBase.jsx';
import AvicoleCycleHealthPanel from './AvicoleCycleHealthPanel.jsx';
import AvicoleEvolution from './AvicoleEvolution.jsx';
import AvicoleJournalsBridge from './AvicoleJournalsBridge.jsx';
import AvicoleTransformationBridge from './AvicoleTransformationBridge.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import HeyHorizonAvicoleCard from './HeyHorizonAvicoleCard.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isPondeuse = (lot = {}) => { const text = lotText(lot); return text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf') || text.includes('œuf'); };
const isChair = (lot = {}) => { const text = lotText(lot); return text.includes('chair') || text.includes('broiler'); };
const labelOf = (lot = {}) => lot.name || lot.nom || lot.id || 'Lot avicole';
const currentOf = (lot = {}) => avicoleActiveCount(lot);
const filterByActivity = (rows = [], activity) => {
  if (activity === 'pondeuse') return rows.filter(isPondeuse);
  if (activity === 'chair') return rows.filter(isChair);
  return rows;
};
const uniqueRowsById = (rows = []) => Array.from(new Map(rows.map((row, index) => [String(row?.id || row?.name || row?.nom || index), row])).values());
const mortalityOf = (lot = {}) => num(lot.mortality ?? lot.morts ?? lot.dead_count);
const initialOf = (lot = {}) => num(lot.initial_count ?? lot.effectif_initial);
const mortalityRateOf = (lot = {}) => initialOf(lot) > 0 ? Math.round((mortalityOf(lot) / initialOf(lot)) * 100) : 0;
const lossValueOf = (lot = {}) => num(lot.valeur_perte_estimee ?? lot.perte_estimee ?? lot.pertes_mortalite_estimees);
const isLossClosedLot = (lot = {}) => ['perdu', 'perdu_mortalite', 'cloture_perte'].includes(norm(lot.status || lot.statut || '')) || (avicoleActiveCount(lot) <= 0 && initialOf(lot) > 0);
const draftActionToActivity = (draft = {}) => draft.form_type === 'egg_production' || norm(draft.raw_input).includes('pondeuse') || norm(draft.raw_input).includes('oeuf') || norm(draft.raw_input).includes('tablette') ? 'pondeuse' : 'chair';
const draftActionLabel = (formType = '') => formType === 'egg_production' ? 'Ramassage œufs' : formType === 'poultry_mortality' ? 'Mortalité' : 'Clôture / réforme';
const statusOf = (row = {}) => norm(row.status || row.statut || '');
const isReadyForSale = (lot = {}) => isSaleReady(lot);
const estimatedAmount = (lot = {}) => num(lot.prix_vente_reel ?? lot.sale_price ?? lot.prix_vente ?? lot.prix_vente_estime ?? lot.valeur_estimee ?? lot.valeur_marche);
const eggsOpportunityKey = (lot = {}, date = today()) => `avicole-eggs:${lot.id || lot.lot_id || ''}:${date}`;

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4 sm:p-6 min-w-0"><div className="min-w-0"><p className="flex items-center gap-2 text-lg font-black text-[#2f2415] break-words"><Icon size={20} aria-hidden="true" className="shrink-0" /> {title}</p>{subtitle ? <p className="mt-1 text-sm leading-relaxed text-[#8a7456] break-words">{subtitle}</p> : null}</div>{children}</section>;
}
function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8]"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} aria-hidden="true" /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-[#8a7456] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></button>{open ? <div className="border-t border-[#eadcc2] p-5">{children}</div> : null}</section>;
}
function LayerHelpBanner() {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-black text-amber-900"><Info size={17} aria-hidden="true" /> Journal de ponte</p><p className="mt-2 leading-relaxed">La production d’œufs se saisit dans <b>Ramassage œufs / Journal de ponte</b>. Les tablettes sont calculées sur la base de <b>30 œufs = 1 tablette</b>.</p></div>;
}
function ActivityEntryCard({ icon: Icon, active, title, rows = [], productionLogs = [], action, onClick }) {
  const activeRows = rows.filter(avicoleHasActiveBirds);
  const historicalRows = rows.length - activeRows.length;
  const effectif = activeRows.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0);
  const decisions = activeRows.map((lot) => buildAvicoleLotDecision(lot, productionLogs));
  const urgent = decisions.filter((decision) => decision.priority === 'haute').length;
  const averageSignal = decisions.length ? Math.round(decisions.reduce((sum, decision) => sum + (decision.type === 'pondeuse' ? Number(decision.layingRate || 0) : Number(decision.progress || 0)), 0) / decisions.length) : 0;
  return <button type="button" onClick={onClick} className={`rounded-3xl border p-5 text-left shadow-sm transition-all ${active ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#d6c3a0] bg-white hover:border-[#b6975f] hover:shadow-md'}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3 min-w-0"><div className={`rounded-2xl p-3 ${active ? 'bg-white/15 text-[#ffd86b]' : 'bg-[#fff3d8] text-[#9a6b12]'}`}><Icon size={22} aria-hidden="true" /></div><div className="min-w-0"><p className={`text-xl font-black break-words ${active ? 'text-white' : 'text-[#2f2415]'}`}>{title}</p></div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-[#ffd86b] text-[#2f2415]' : 'bg-[#2f2415] text-white'}`}>{action}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniMetricCard tone={active ? 'dark' : 'light'} label="Lots actifs" value={activeRows.length} /><MiniMetricCard tone={active ? 'dark' : 'light'} label="Historique" value={historicalRows} /><MiniMetricCard tone={active ? 'dark' : 'light'} label="Effectif" value={fmtNumber(effectif)} /><MiniMetricCard tone={active ? 'dark' : 'light'} label="Signal" value={`${averageSignal}%`} /></div>
    <div className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${active ? 'border-white/15 bg-white/10 text-white/80' : urgent ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{urgent ? `${urgent} action(s) prioritaire(s).` : 'Aucune urgence.'}</div>
  </button>;
}
export default function AvicoleV10(props) {
  const embedInElevage = Boolean(props.embedInElevage);
  const [activity, setActivity] = useState('pondeuse');
  const [horizonDraft, setHorizonDraft] = useState(null);
  const rows = uniqueRowsById(props.rows || []);
  const productionLogs = props.productionLogs || [];
  const salesOrders = props.salesOrders || [];
  const payments = props.payments || [];
  const transactions = props.transactions || [];
  const businessEvents = props.businessEvents || [];
  const opportunities = props.opportunities || [];
  const pondeuses = useMemo(() => rows.filter(isPondeuse), [rows]);
  const chair = useMemo(() => rows.filter(isChair), [rows]);
  const scopedRows = useMemo(() => filterByActivity(rows, activity), [rows, activity]);
  const activeScopedRows = useMemo(() => scopedRows.filter(avicoleHasActiveBirds), [scopedRows]);
  const historicalScopedRows = useMemo(() => scopedRows.filter((lot) => !avicoleHasActiveBirds(lot)), [scopedRows]);
  const scopedProductionLogs = useMemo(() => productionLogs.filter((log) => activity !== 'chair' || chair.some((lot) => String(lot.id) === String(log.lot_id || log.related_id))), [productionLogs, activity, chair]);

  useEffect(() => {
    if (embedInElevage) return undefined;
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'avicole' && ['egg_production', 'poultry_mortality', 'poultry_close'].includes(draft?.form_type)) {
        setActivity(draftActionToActivity(draft));
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-avicole-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, [embedInElevage]);

  const createOrReactivateLotOpportunity = async (lot = {}, source = 'lot prêt à vendre') => {
    if (!lot?.id || !isReadyForSale(lot) || !avicoleHasActiveBirds(lot)) return;
    const existing = findOpportunityForSource(opportunities, 'avicole', lot.id);
    const qty = currentOf(lot);
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
      extra: {
        entity_type: 'lot_avicole',
        lot_id: lot.id,
      },
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
    const payload = { opportunity_key: dedupeKey, dedupe_key: dedupeKey, title: `Vente ${tablettes} tablette(s) d’œufs`, libelle: `Vente ${tablettes} tablette(s) d’œufs`, source_module: 'avicole', created_from: 'avicole', source_type: 'oeufs', entity_type: 'lot_avicole', source_id: lot.id, entity_id: lot.id, lot_id: lot.id, product_name: productName, produit: productName, quantity: tablettes, quantite: tablettes, unite: 'tablette', unit: 'tablette', eggs_count: num(eggs), oeufs: num(eggs), status: 'ouverte', statut: 'ouverte', priority: 'normale', date, notes: note || `Ramassage ${eggs} œufs` };
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
      await props.onCreateBusinessEvent?.({ id: `EVT-AVI-${Date.now()}`, module: 'avicole', source_type: 'lot_avicole', source_id: after.id, title: `Pertes lot avicole · ${after.name || after.nom || after.id}`, description: [`Type: ${after.type || after.categorie || activity}`, `Morts: ${mortalityOf(before)} → ${mortalityOf(after)}${delta ? ` (+${delta})` : ''}`, `Taux morts: ${mortalityRateOf(after)}%`, `Effectif actif: ${avicoleActiveCount(after)}`, `Valeur estimée: ${lossValueOf(before)} → ${lossValueOf(after)}`].join('\n'), severity: isLossClosedLot(after) || mortalityRateOf(after) >= 5 ? 'critique' : 'warning', status: 'nouveau', date: today(), type_evenement: 'perte_avicole', montant: Math.max(0, lossValueOf(after) - lossValueOf(before)) || lossValueOf(after) });
      await props.onRefreshBusinessEvents?.();
    } catch (error) { console.warn('Perte avicole non consignée en événement', error); }
  };

  const wrappedCreate = async (payload) => { await props.onCreate?.(payload); await createMortalityEvent({}, payload, 'création lot avicole'); await createOrReactivateLotOpportunity(payload, 'création lot prêt à vendre'); };
  const wrappedUpdate = async (id, payload) => { const before = (props.rows || []).find((lot) => String(lot.id) === String(id)) || {}; const restored = mergeSaleReadySavePayload(before, payload); const after = { ...before, ...restored, id }; await props.onUpdate?.(id, restored); await createMortalityEvent(before, after, 'modification fiche lot'); if (!isReadyForSale(before) && isReadyForSale(after)) await createOrReactivateLotOpportunity(after, 'lot marqué prêt à vendre'); };
  const scopedOpportunities = opportunities.filter((op) => activity === 'pondeuse' ? norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('oeuf') || norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('pondeuse') : activity === 'chair' ? norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('chair') : true);
  const operationalProps = { ...props, activity, lockActivity: true, rows: activeScopedRows, productionLogs: scopedProductionLogs, salesOrders, payments, transactions, businessEvents, onCreate: wrappedCreate, onUpdate: wrappedUpdate, opportunities: scopedOpportunities, embedInElevage };
  const historyProps = { ...props, activity, lockActivity: true, rows: scopedRows, productionLogs: scopedProductionLogs, salesOrders, payments, transactions, businessEvents, onCreate: wrappedCreate, onUpdate: wrappedUpdate, opportunities: scopedOpportunities };
  const dataMap = { sales_orders: salesOrders, payments, finances: transactions, avicole: activeScopedRows, production_oeufs_logs: scopedProductionLogs, alimentation_logs: props.alimentationLogs || [], business_events: businessEvents };
  const selectedLabel = activity === 'pondeuse' ? 'Pondeuses' : 'Poulets de chair';

  return <div className={`space-y-6 ${embedInElevage ? 'elevage-module avicole-mobile-final' : 'avicole-mobile-final'}`}>
    <style>{`.avicole-mobile-final .objective-card-grid{align-items:stretch}@media(max-width:640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100%}}`}</style>
    {horizonDraft && !embedInElevage ? <div id="hey-horizon-avicole-card"><HeyHorizonAvicoleCard draft={horizonDraft} rows={activeScopedRows} onUpdate={wrappedUpdate} onCreateProduction={props.onCreateProduction} onRefreshProduction={props.onRefreshProduction} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefresh={props.onRefresh} onRefreshBusinessEvents={props.onRefreshBusinessEvents} onClose={() => setHorizonDraft(null)} onCreateEggOpportunity={createOrReactivateEggOpportunity} /></div> : null}
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Bird size={15} aria-hidden="true" /> Avicole</p>
      <h2 className="mt-1 text-2xl font-black text-[#2f2415]">{selectedLabel}</h2>
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4"><ActivityEntryCard active={activity === 'pondeuse'} icon={Egg} title="Pondeuses" rows={pondeuses} productionLogs={productionLogs} action="Ouvrir" onClick={() => setActivity('pondeuse')} /><ActivityEntryCard active={activity === 'chair'} icon={Drumstick} title="Poulets de chair" rows={chair} productionLogs={productionLogs} action="Ouvrir" onClick={() => setActivity('chair')} /></div>
    </div>

    {!embedInElevage ? <AvicoleCycleHealthPanel rows={rows} productionLogs={productionLogs} alimentationLogs={props.alimentationLogs || []} onNavigate={props.onNavigate} /> : null}
    <AvicoleSaleReadinessBridge rows={activeScopedRows} opportunities={scopedOpportunities} onUpdate={wrappedUpdate} onRefresh={props.onRefresh} onCreateOpportunity={props.onCreateOpportunity} onUpdateOpportunity={props.onUpdateOpportunity} onRefreshOpportunities={props.onRefreshOpportunities} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} />
    {embedInElevage ? (
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
        <p className="text-sm font-black text-[#2f2415]">Autres onglets métier</p>
        <p className="mt-1 text-sm leading-relaxed text-[#8a7456]">Production, transformation, cycles, alimentation et santé ont leurs propres espaces.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Production')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Egg size={15} className="shrink-0" /> Ramassage œufs <ArrowRight size={14} /></button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Transformation')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Scissors size={15} className="shrink-0" /> Abattage / mortalité <ArrowRight size={14} /></button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Cycles')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Sprout size={15} className="shrink-0" /> Cycles & ventes <ArrowRight size={14} /></button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Alimentation')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Utensils size={15} className="shrink-0" /> Alimentation & charges <ArrowRight size={14} /></button> : null}
          {props.onElevageTabChange ? <button type="button" onClick={() => props.onElevageTabChange('Santé')} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><HeartPulse size={15} className="shrink-0" /> Santé <ArrowRight size={14} /></button> : null}
        </div>
      </section>
    ) : null}
    {!embedInElevage && activity === 'pondeuse' ? <LayerHelpBanner /> : null}
    <div className="objective-card-grid grid grid-cols-1 gap-4">{activity === 'pondeuse' ? <ObjectivePerformanceCard dataMap={dataMap} activity="oeufs" title="Objectif œufs / pondeuses" compact onNavigate={props.onNavigate} /> : <ObjectivePerformanceCard dataMap={dataMap} activity="poulets_chair" title="Objectif poulets de chair" compact onNavigate={props.onNavigate} />}</div>
    <ModuleSection icon={PackageCheck} title={`Lots actifs · ${selectedLabel}`} subtitle={`${historicalScopedRows.length} lot(s) en historique.`}><AvicoleBase {...operationalProps} /></ModuleSection>
    {!embedInElevage && activity === 'pondeuse' ? <ModuleSection icon={Egg} title="Journal de ponte et charges"><AvicoleJournalsBridge {...operationalProps} rows={activeScopedRows} productionLogs={scopedProductionLogs} businessEvents={businessEvents} /><DirectChargesBridge title="Charges directes pondeuses" targetType="avicole" targets={activeScopedRows} businessEvents={businessEvents} onCreateBusinessEvent={props.onCreateBusinessEvent} onUpdateBusinessEvent={props.onUpdateBusinessEvent} onDeleteBusinessEvent={props.onDeleteBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} /></ModuleSection> : null}
    {!embedInElevage && activity === 'chair' ? <ModuleSection icon={Scissors} title="Transformation et stock"><AvicoleTransformationBridge {...operationalProps} rows={activeScopedRows} alimentationLogs={props.alimentationLogs || []} productionLogs={scopedProductionLogs} businessEvents={businessEvents} /></ModuleSection> : null}
    <CollapsibleSection icon={ClipboardList} title={`Cycle et historique · ${selectedLabel}`} defaultOpen={false}><LifecycleHistoryPanel mode="avicole" rows={scopedRows} salesOrders={salesOrders} deliveries={props.deliveriesList || props.deliveries || []} businessEvents={businessEvents} /></CollapsibleSection>
    <CollapsibleSection icon={BarChart3} title={`Évolution · ${selectedLabel}`} defaultOpen={false}><AvicoleEvolution rows={scopedRows} productionLogs={scopedProductionLogs} alimentationLogs={props.alimentationLogs || []} businessEvents={businessEvents} salesOrders={salesOrders} payments={payments} transactions={transactions} opportunities={historyProps.opportunities || []} onNavigate={props.onNavigate} /></CollapsibleSection>
  </div>;
}
