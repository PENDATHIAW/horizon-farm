import { useMemo, useState } from 'react';
import { BarChart3, Bird, ClipboardList, Drumstick, Egg, PackageCheck, Scissors } from 'lucide-react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { fmtNumber } from '../utils/format';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../utils/avicoleMetrics';
import AvicoleBase from './AvicoleBase.jsx';
import AvicoleEvolution from './AvicoleEvolution.jsx';
import AvicoleJournalsBridge from './AvicoleJournalsBridge.jsx';
import AvicoleTransformationBridge from './AvicoleTransformationBridge.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

const EGGS_PER_TABLET = 30;
const DEFAULT_EGG_TABLET_PRICE = 2250;
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isPondeuse = (lot = {}) => { const text = lotText(lot); return text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf') || text.includes('œuf'); };
const isChair = (lot = {}) => { const text = lotText(lot); return text.includes('chair') || text.includes('broiler'); };
const filterByActivity = (rows = [], activity) => {
  if (activity === 'pondeuse') return rows.filter(isPondeuse);
  if (activity === 'chair') return rows.filter(isChair);
  return rows;
};
const mortalityOf = (lot = {}) => num(lot.mortality);
const initialOf = (lot = {}) => num(lot.initial_count ?? lot.effectif_initial);
const mortalityRateOf = (lot = {}) => initialOf(lot) > 0 ? Math.round((mortalityOf(lot) / initialOf(lot)) * 100) : 0;
const lossValueOf = (lot = {}) => num(lot.valeur_perte_estimee ?? lot.perte_estimee ?? lot.pertes_mortalite_estimees);
const isLossClosedLot = (lot = {}) => ['perdu', 'perdu_mortalite', 'cloture_perte'].includes(norm(lot.status || lot.statut || '')) || (avicoleActiveCount(lot) <= 0 && initialOf(lot) > 0);
const monthKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const logMonth = (row = {}) => String(row.date || row.created_at || row.updated_at || row.date_commande || row.date_paiement || '').slice(0, 7);
const eggProduced = (row = {}) => num(row.oeufs_produits ?? row.eggs ?? row.total_oeufs ?? row.quantite ?? row.quantity);
const eggBroken = (row = {}) => num(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
const money = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total ?? row.montant_paye ?? 0);
const tabletPriceForLots = (lots = []) => {
  const configured = lots.map((lot) => num(lot.prix_tablette_oeufs ?? lot.prix_tablette ?? lot.prix_vente_tablette ?? lot.egg_tablet_price)).find((value) => value > 0);
  return configured || DEFAULT_EGG_TABLET_PRICE;
};
const isEggRevenueText = (row = {}) => {
  const text = norm(`${row.activite || ''} ${row.source_module || ''} ${row.source_type || ''} ${row.type_vente || ''} ${row.product_type || ''} ${row.product_name || ''} ${row.produit || ''} ${row.libelle || ''} ${row.description || ''} ${row.title || ''} ${row.notes || ''}`);
  return text.includes('oeuf') || text.includes('œuf') || text.includes('tablette') || text.includes('plateau') || text.includes('pondeuse') || text.includes('ponte');
};
const isFinanceIncome = (row = {}) => {
  const text = norm(`${row.type || ''} ${row.nature || ''} ${row.category || ''} ${row.categorie || ''} ${row.libelle || ''} ${row.description || ''}`);
  return text.includes('entree') || text.includes('entrée') || text.includes('revenu') || text.includes('encaisse') || text.includes('recette') || text.includes('vente');
};
const hasRealEggRevenue = ({ salesOrders = [], transactions = [], currentMonth = monthKey(new Date()) }) => {
  const sales = salesOrders.some((row) => logMonth(row) === currentMonth && money(row) > 0 && isEggRevenueText(row));
  const finance = transactions.some((row) => logMonth(row) === currentMonth && money(row) > 0 && isFinanceIncome(row) && isEggRevenueText(row));
  return sales || finance;
};
const buildEggObjectiveRows = ({ lots = [], productionLogs = [], currentMonth = monthKey(new Date()) }) => {
  const lotIds = new Set(lots.map((lot) => String(lot.id || '').trim()).filter(Boolean));
  const monthLogs = productionLogs.filter((log) => {
    const lotId = String(log.lot_id || log.related_id || log.source_record_id || log.entity_id || '').trim();
    return lotIds.has(lotId) && logMonth(log) === currentMonth;
  });
  const sellableEggs = monthLogs.reduce((sum, log) => sum + Math.max(0, eggProduced(log) - eggBroken(log)), 0);
  const tablets = Math.floor(sellableEggs / EGGS_PER_TABLET);
  const remainingEggs = sellableEggs % EGGS_PER_TABLET;
  const unitPrice = tabletPriceForLots(lots);
  const estimatedAmount = tablets * unitPrice;
  if (estimatedAmount <= 0) return [];
  return [{
    id: `OBJ-OEUFS-${currentMonth}`,
    date: `${currentMonth}-15`,
    created_at: `${currentMonth}-15T00:00:00.000Z`,
    source_module: 'avicole',
    source_type: 'oeufs_tablettes_estimees',
    activite: 'oeufs',
    product_name: `Tablettes d’œufs estimées (${fmtNumber(tablets)} tablette(s) + ${fmtNumber(remainingEggs)} œuf(s))`,
    libelle: 'Valorisation mensuelle tablettes œufs pondeuses',
    montant_total: estimatedAmount,
    total: estimatedAmount,
    amount: estimatedAmount,
    tablettes: tablets,
    oeufs_vendables: sellableEggs,
    oeufs_restants: remainingEggs,
    prix_unitaire_tablette: unitPrice,
    statut: 'estime',
  }];
};

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function Mini({ label, value, active = false }) {
  return <div className={`rounded-xl border p-3 ${active ? 'border-white/15 bg-white/10' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className={`text-[10px] ${active ? 'text-white/60' : 'text-[#8a7456]'}`}>{label}</p><p className={`mt-1 font-black ${active ? 'text-white' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

function ActivityEntryCard({ icon: Icon, active, title, subtitle, rows = [], productionLogs = [], action, onClick }) {
  const activeRows = rows.filter(avicoleHasActiveBirds);
  const historicalRows = rows.length - activeRows.length;
  const effectif = activeRows.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0);
  const decisions = activeRows.map((lot) => buildAvicoleLotDecision(lot, productionLogs));
  const urgent = decisions.filter((decision) => decision.priority === 'haute').length;
  const averageSignal = decisions.length ? Math.round(decisions.reduce((sum, decision) => sum + (decision.type === 'pondeuse' ? Number(decision.layingRate || 0) : Number(decision.progress || 0)), 0) / decisions.length) : 0;
  return <button type="button" onClick={onClick} className={`rounded-3xl border p-5 text-left shadow-sm transition-all ${active ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#d6c3a0] bg-white hover:border-[#b6975f] hover:shadow-md'}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 min-w-0"><div className={`rounded-2xl p-3 ${active ? 'bg-white/15 text-[#ffd86b]' : 'bg-[#fff3d8] text-[#9a6b12]'}`}><Icon size={22} /></div><div className="min-w-0"><p className={`text-xl font-black break-words ${active ? 'text-white' : 'text-[#2f2415]'}`}>{title}</p><p className={`mt-1 text-sm leading-relaxed ${active ? 'text-white/75' : 'text-[#8a7456]'}`}>{subtitle}</p></div></div>
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-[#ffd86b] text-[#2f2415]' : 'bg-[#2f2415] text-white'}`}>{action}</span>
    </div>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2"><Mini active={active} label="Lots actifs" value={activeRows.length} /><Mini active={active} label="Historique" value={historicalRows} /><Mini active={active} label="Effectif" value={fmtNumber(effectif)} /><Mini active={active} label="Signal IA" value={`${averageSignal}%`} /></div>
    <div className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${active ? 'border-white/15 bg-white/10 text-white/80' : urgent ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{urgent ? `${urgent} action(s) IA prioritaire(s) à vérifier.` : 'Aucune urgence IA prioritaire sur cette activité.'}</div>
  </button>;
}

export default function AvicoleV10(props) {
  const [activity, setActivity] = useState('pondeuse');
  const rows = props.rows || [];
  const productionLogs = props.productionLogs || [];
  const salesOrders = props.salesOrders || [];
  const payments = props.payments || [];
  const transactions = props.transactions || [];
  const businessEvents = props.businessEvents || [];
  const pondeuses = useMemo(() => rows.filter(isPondeuse), [rows]);
  const chair = useMemo(() => rows.filter(isChair), [rows]);
  const scopedRows = useMemo(() => filterByActivity(rows, activity), [rows, activity]);
  const activeScopedRows = useMemo(() => scopedRows.filter(avicoleHasActiveBirds), [scopedRows]);
  const historicalScopedRows = useMemo(() => scopedRows.filter((lot) => !avicoleHasActiveBirds(lot)), [scopedRows]);
  const scopedProductionLogs = useMemo(() => productionLogs.filter((log) => activity !== 'chair' || chair.some((lot) => String(lot.id) === String(log.lot_id || log.related_id))), [productionLogs, activity, chair]);
  const currentMonth = monthKey(new Date());
  const realEggRevenueExists = useMemo(() => hasRealEggRevenue({ salesOrders, transactions, currentMonth }), [salesOrders, transactions, currentMonth]);
  const eggObjectiveRows = useMemo(() => realEggRevenueExists ? [] : buildEggObjectiveRows({ lots: pondeuses, productionLogs, currentMonth }), [realEggRevenueExists, pondeuses, productionLogs, currentMonth]);
  const objectiveSalesOrders = useMemo(() => activity === 'pondeuse' && !realEggRevenueExists ? [...salesOrders, ...eggObjectiveRows] : salesOrders, [activity, realEggRevenueExists, salesOrders, eggObjectiveRows]);

  const createMortalityEvent = async (before = {}, after = {}, source = 'modification lot avicole') => {
    const mortalityIncreased = mortalityOf(after) > mortalityOf(before);
    const valueIncreased = lossValueOf(after) > lossValueOf(before);
    const becameClosed = !isLossClosedLot(before) && isLossClosedLot(after);
    if (!mortalityIncreased && !valueIncreased && !becameClosed) return;
    const delta = Math.max(0, mortalityOf(after) - mortalityOf(before));
    try {
      await props.onCreateBusinessEvent?.({
        id: `EVT-AVI-${Date.now()}`,
        module: 'avicole',
        source_type: 'lot_avicole',
        source_id: after.id,
        title: `Pertes lot avicole · ${after.name || after.nom || after.id}`,
        description: [`Source: ${source}`, `Type: ${after.type || after.categorie || activity}`, `Morts: ${mortalityOf(before)} → ${mortalityOf(after)}${delta ? ` (+${delta})` : ''}`, `Taux morts: ${mortalityRateOf(after)}%`, `Effectif actif: ${avicoleActiveCount(after)}`, `Valeur estimée: ${lossValueOf(before)} → ${lossValueOf(after)}`].join('\n'),
        severity: isLossClosedLot(after) || mortalityRateOf(after) >= 5 ? 'critique' : 'warning',
        status: 'nouveau',
        date: today(),
        type_evenement: 'perte_avicole',
        montant: Math.max(0, lossValueOf(after) - lossValueOf(before)) || lossValueOf(after),
      });
      await props.onRefreshBusinessEvents?.();
    } catch (error) {
      console.warn('Perte avicole non consignée en événement', error);
    }
  };

  const wrappedCreate = async (payload) => { await props.onCreate?.(payload); await createMortalityEvent({}, payload, 'création lot avicole'); };
  const wrappedUpdate = async (id, payload) => { const before = (props.rows || []).find((lot) => String(lot.id) === String(id)) || {}; const after = { ...before, ...payload, id }; await props.onUpdate?.(id, payload); await createMortalityEvent(before, after, 'modification fiche lot'); };

  const scopedOpportunities = (props.opportunities || []).filter((op) => activity === 'pondeuse' ? norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('oeuf') || norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('pondeuse') : activity === 'chair' ? norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('chair') : true);
  const operationalProps = { ...props, activity, lockActivity: true, rows: activeScopedRows, productionLogs: scopedProductionLogs, salesOrders, payments, transactions, businessEvents, onCreate: wrappedCreate, onUpdate: wrappedUpdate, opportunities: scopedOpportunities };
  const historyProps = { ...props, activity, lockActivity: true, rows: scopedRows, productionLogs: scopedProductionLogs, salesOrders, payments, transactions, businessEvents, onCreate: wrappedCreate, onUpdate: wrappedUpdate, opportunities: scopedOpportunities };
  const dataMap = { sales_orders: objectiveSalesOrders, payments, finances: transactions, avicole: activeScopedRows, production_oeufs_logs: scopedProductionLogs, alimentation_logs: props.alimentationLogs || [], business_events: businessEvents };
  const selectedLabel = activity === 'pondeuse' ? 'Pondeuses' : 'Poulets de chair';

  return <div className="space-y-6 avicole-mobile-final">
    <style>{`.avicole-mobile-final .objective-card-grid{align-items:stretch}@media(max-width:640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Bird size={15} /> Séparation avicole</p>
      <h2 className="mt-1 text-2xl font-black text-[#2f2415]">Choisis l’activité à piloter</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Le choix ci-dessous pilote tout le module : objectifs, fiches, ponte, abattage, historique et évolution.</p>
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ActivityEntryCard active={activity === 'pondeuse'} icon={Egg} title="Pondeuses" subtitle="Ponte, tablettes d’œufs, baisse de ponte et réforme progressive dès 17 mois." rows={pondeuses} productionLogs={productionLogs} action="Voir pondeuses" onClick={() => setActivity('pondeuse')} />
        <ActivityEntryCard active={activity === 'chair'} icon={Drumstick} title="Poulets de chair" subtitle="Poids moyen, cycle court, vente dès 35-45 jours si objectif atteint." rows={chair} productionLogs={productionLogs} action="Voir chair" onClick={() => setActivity('chair')} />
      </div>
    </div>

    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Vue active</p><p className="mt-1 text-xl font-black text-[#2f2415]">{selectedLabel}</p><p className="mt-1 text-sm text-[#8a7456]">La vue opérationnelle affiche uniquement les lots avec effectif actif. Les lots à 0 sont conservés dans Cycle et historique.</p></div>

    <div className="objective-card-grid grid grid-cols-1 gap-4">
      {activity === 'pondeuse' ? <ObjectivePerformanceCard dataMap={dataMap} activity="oeufs" title="Objectif œufs / pondeuses" compact onNavigate={props.onNavigate} /> : <ObjectivePerformanceCard dataMap={dataMap} activity="poulets_chair" title="Objectif poulets de chair" compact onNavigate={props.onNavigate} />}
    </div>

    <ModuleSection icon={PackageCheck} title={`Vue opérationnelle · ${selectedLabel}`} subtitle={activity === 'pondeuse' ? `Lots pondeuses actifs uniquement · ${historicalScopedRows.length} lot(s) en historique.` : `Lots chair actifs uniquement · ${historicalScopedRows.length} lot(s) en historique.`}><AvicoleBase {...operationalProps} /></ModuleSection>
    {activity === 'pondeuse' ? <ModuleSection icon={Egg} title="Ponte, œufs et charges directes" subtitle="Ramassage, stock d’œufs vendables et frais ponctuels liés aux pondeuses actives."><AvicoleJournalsBridge {...operationalProps} rows={activeScopedRows} productionLogs={scopedProductionLogs} businessEvents={businessEvents} /><DirectChargesBridge title="Charges directes pondeuses" subtitle="Frais liés aux lots pondeuses actifs." targetType="avicole" targets={activeScopedRows} businessEvents={businessEvents} onCreateBusinessEvent={props.onCreateBusinessEvent} onUpdateBusinessEvent={props.onUpdateBusinessEvent} onDeleteBusinessEvent={props.onDeleteBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} /></ModuleSection> : null}
    {activity === 'chair' ? <ModuleSection icon={Scissors} title="Abattage, transformation et stock" subtitle="Sortie des sujets chair actifs, poids, transformation et stock viande vendable."><AvicoleTransformationBridge {...operationalProps} rows={activeScopedRows} alimentationLogs={props.alimentationLogs || []} productionLogs={scopedProductionLogs} businessEvents={businessEvents} /></ModuleSection> : null}
    <ModuleSection icon={ClipboardList} title={`Cycle et historique · ${selectedLabel}`} subtitle="Entrées, sorties, clôtures, ventes, effectifs à zéro et événements importants."><LifecycleHistoryPanel mode="avicole" rows={scopedRows} salesOrders={salesOrders} deliveries={props.deliveriesList || props.deliveries || []} businessEvents={businessEvents} /></ModuleSection>
    <ModuleSection icon={BarChart3} title={`Évolution avicole · ${selectedLabel}`} subtitle={activity === 'pondeuse' ? 'Évolution ponte, coûts, production et mortalité, historique inclus.' : 'Évolution poids, coûts, ventes et mortalité, historique inclus.'}><AvicoleEvolution rows={scopedRows} productionLogs={scopedProductionLogs} alimentationLogs={props.alimentationLogs || []} businessEvents={businessEvents} salesOrders={salesOrders} payments={payments} transactions={transactions} opportunities={historyProps.opportunities || []} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
