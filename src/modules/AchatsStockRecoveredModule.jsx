import { BrainCircuit, Handshake, PackageCheck, ShoppingBag, Warehouse, Zap } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../components/module/ModuleListHub.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createSupplierFollowUpTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { aggregateSupplierDebts, buildAchatsStockCoherenceRows, buildAchatsStockHealthSnapshot } from './achatsStock/achatsStockVisionHelpers.js';
import { resolveAchatsStockTab, navigateForIaFinding } from '../utils/commercialNavigation';
import StocksV5 from './StocksV5';
import FournisseursReadable from './FournisseursReadable';

const arr = (v) => Array.isArray(v) ? v : [];
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const valueOf = (r = {}) => qty(r) * n(r.prix_unitaire ?? r.unit_price ?? r.price ?? r.cout_unitaire);
const isFeed = (r = {}) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(low(`${r.produit || r.name || r.nom || ''} ${r.categorie || r.category || ''}`));
const isPurchaseTx = (r = {}) => /achat|stock|fournisseur|approvisionnement|reception|réception/.test(low(`${r.type || ''} ${r.categorie || ''} ${r.category || ''} ${r.libelle || ''} ${r.title || ''} ${r.module_lie || ''} ${r.source_module || ''}`));
const supplierDebt = (r = {}) => n(r.dettes ?? r.dette ?? r.solde ?? r.balance ?? r.reste_a_payer);
const label = (r = {}) => r.produit || r.name || r.nom || r.libelle || r.title || 'Produit';

function Stat({ label: statLabel, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{statLabel}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="achats_stock" active={active} onChange={onChange} />;
}

function StockIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA stock & achats">
      <p className="mb-3 text-sm text-[#8a7456]">Cohérence achat → stock → alimentation → finance → fournisseurs.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => navigateForIaFinding(f, onNavigate)} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Voir</button>
              <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Commercial</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : f.auto_action === 'create_task' ? 'Créer tâche' : f.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><b>{p.title}</b><p className="text-xs text-[#8a7456]">{p.description}</p></div>
        ))}
      </div>
    </Section>
  );
}

function CoherencePanel({ rows = [], onApply, busyId, setTab }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab(row.type === 'dette' ? 'Fournisseurs' : row.type === 'achat_stock' ? 'Achats' : 'Stock')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}

function SupplierDebtPanel({ suppliers = [], onRelance, busyId, setTab }) {
  if (!suppliers.length) return null;
  return (
    <Section icon={Handshake} title="Fournisseurs à payer">
      {suppliers.slice(0, 6).map((s) => (
        <div key={s.id || s.name} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab('Fournisseurs')} className="text-left"><b className="text-[#2f2415]">{s.name}</b><p className="text-xs text-[#8a7456]">Dette {fmtCurrency(s.total)}</p></button>
          <button type="button" disabled={busyId === (s.id || s.name)} onClick={() => onRelance?.(s)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === (s.id || s.name) ? '…' : 'Créer tâche paiement'}</button>
        </div>
      ))}
    </Section>
  );
}

function LowStockPanel({ items = [], setTab }) {
  if (!items.length) return null;
  return (
    <Section icon={PackageCheck} title="Produits sous seuil">
      {items.slice(0, 6).map((row) => (
        <button key={row.id || label(row)} type="button" onClick={() => setTab('Stock')} className="flex w-full items-center justify-between border-b border-[#eadcc2]/70 py-3 text-left last:border-b-0 hover:bg-[#fffdf8]">
          <span><b className="text-[#2f2415]">{label(row)}</b><p className="text-xs text-[#8a7456]">{fmtNumber(qty(row))} u. · seuil {fmtNumber(threshold(row))}</p></span>
          <span className="text-xs font-black text-amber-700">Réappro</span>
        </button>
      ))}
    </Section>
  );
}

function AchatsHub({ data, onNavigate, setTab, onRepairPurchase }) {
  const orphanPurchases = data.purchasesWithoutStock || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => { emitHorizonForm('stock', 'stock_purchase', 'Nouvel achat stock', { date: new Date().toISOString().slice(0, 10) }); setTab('Stock'); }} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">+ Achat stock</button>
      </div>
      {orphanPurchases.length ? (
        <Section icon={ShoppingBag} title="Achats finance sans entrée stock (réparation)">
          <p className="mb-3 text-sm text-[#8a7456]">Les nouveaux achats stockables se saisissent dans Stock. Corrigez ici l&apos;historique seulement.</p>
          {orphanPurchases.slice(0, 8).map((row) => (
            <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div><b className="text-[#2f2415]">{row.libelle || row.id}</b><p className="text-xs text-[#8a7456]">{row.date} · {fmtCurrency(n(row.montant ?? row.amount))}</p></div>
              <button type="button" onClick={() => onRepairPurchase?.(row)} className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-black text-amber-900">Créer entrée stock depuis cette dépense</button>
            </div>
          ))}
        </Section>
      ) : null}
      <ModuleListHub
      title="Achats & approvisionnements"
      intro="Mouvements d'achat détectés dans la finance et liés au stock."
      stats={[
        { label: 'Achats', value: fmtNumber(data.purchases.length) },
        { label: 'Montant', value: fmtCurrency(data.purchaseAmount), tone: 'warn' },
        { label: 'Sans stock', value: fmtNumber(data.purchasesWithoutStock.length), tone: data.purchasesWithoutStock.length ? 'warn' : 'good' },
        { label: 'Dettes', value: fmtCurrency(data.debt), tone: data.debt ? 'warn' : 'good' },
      ]}
      rows={data.purchases.map((row) => ({
        id: row.id || `${row.date}-${row.libelle}`,
        title: row.libelle || row.title || 'Achat',
        detail: `${row.date || row.created_at || '—'} · ${row.categorie || row.category || 'Approvisionnement'}`,
        value: fmtCurrency(n(row.montant ?? row.amount)),
        module: 'finance_pilotage',
      }))}
      emptyLabel="Aucun achat enregistré."
      onNavigate={onNavigate}
      actionModule="finance_pilotage"
    />
    </div>
  );
}

function MouvementsHub({ data, onNavigate }) {
  const movements = [...data.feedLogs, ...data.stockEvents].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')));
  return (
    <ModuleListHub
      title="Mouvements stock & alimentation"
      intro="Entrées, sorties, distributions aliment et événements stock."
      stats={[
        { label: 'Mouvements', value: fmtNumber(movements.length) },
        { label: 'Sorties aliment', value: fmtNumber(data.feedLogs.length) },
        { label: 'Sous seuil', value: fmtNumber(data.lowStock.length), tone: data.lowStock.length ? 'warn' : 'good' },
        { label: 'Valeur stock', value: fmtCurrency(data.stockValue) },
      ]}
      rows={movements.map((row) => ({
        id: row.id || `${row.date}-${row.produit || row.libelle}`,
        title: row.produit || row.name || row.libelle || row.title || 'Mouvement',
        detail: `${row.date || row.created_at || '—'} · ${row.type || row.categorie || row.event_type || 'Stock'}`,
        value: row.quantite != null ? `${row.quantite} u.` : undefined,
        module: 'achats_stock',
      }))}
      emptyLabel="Aucun mouvement enregistré."
      onNavigate={onNavigate}
    />
  );
}

function Summary({ data, setTab, onApply, onRelance, busyId, onNavigate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé stock" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Produits stock" value={fmtNumber(data.stocks.length)} />
        <Stat label="Valeur stock" value={fmtCurrency(data.stockValue)} />
        <Stat label="Sous seuil" value={fmtNumber(data.lowStock.length)} tone={data.lowStock.length ? 'warn' : 'good'} />
        <Stat label="Achats" value={fmtNumber(data.purchases.length)} />
        <Stat label="Achats sans stock" value={fmtNumber(data.purchasesWithoutStock.length)} tone={data.purchasesWithoutStock.length ? 'warn' : 'good'} />
        <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
        <Stat label="Dettes fournisseurs" value={fmtCurrency(data.debt)} tone={data.debt ? 'warn' : 'good'} />
      </div>
      <StockIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} />
      <LowStockPanel items={data.lowStock} setTab={setTab} />
      <SupplierDebtPanel suppliers={data.supplierDebts} onRelance={onRelance} busyId={busyId} setTab={setTab} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} setTab={setTab} />
      <Section icon={Warehouse} title="Parcours achats & stock">
        <p className="text-sm leading-relaxed text-[#8a7456]">Un achat déclenche impacts : stock, finance, fournisseurs, élevage, documents et activité.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <button type="button" onClick={() => { emitHorizonForm('stock', 'stock_purchase', 'Réception stock', { date: new Date().toISOString().slice(0, 10) }); setTab('Stock'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Achat stock</b><p className="mt-1 text-sm text-[#8a7456]">Réception, fournisseur, finance.</p></button>
          <button type="button" onClick={() => setTab('Stock')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Stock</b><p className="mt-1 text-sm text-[#8a7456]">Entrée, sortie, perte, alimentation.</p></button>
          <button type="button" onClick={() => setTab('Fournisseurs')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Fournisseurs</b><p className="mt-1 text-sm text-[#8a7456]">Dettes, documents, risques.</p></button>
          <button type="button" onClick={() => setTab('Mouvements')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Mouvements</b><p className="mt-1 text-sm text-[#8a7456]">Historique aliment & stock.</p></button>
          <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">Commercial</b><p className="mt-1 text-sm text-[#8a7456]">Vendre stock / opportunités détectées.</p></button>
        </div>
      </Section>
    </div>
  );
}

export default function AchatsStockRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveAchatsStockTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (props.initialTab) setTab(resolveAchatsStockTab(props.initialTab));
  }, [props.initialTab]);
  const stockCrud = useCrudModule('stock');
  const suppliersCrud = useCrudModule('fournisseurs');
  const financesCrud = useCrudModule('finances');
  const feedCrud = useCrudModule('alimentation_logs');
  const eventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const documentsCrud = useCrudModule('documents');
  const periodFiltered = Boolean(props.periodFiltered);
  const stocks = rowsOf(props.stocks || props.rows, stockCrud, false);
  const suppliers = rowsOf(props.fournisseurs || props.suppliers, suppliersCrud, false);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const feedLogs = rowsOf(props.alimentationLogs, feedCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const data = useMemo(() => {
    const purchases = transactions.filter(isPurchaseTx);
    const stockEvents = businessEvents.filter((r) => /stock|aliment|mouvement|reception|réception/.test(low(`${r.event_type || ''} ${r.title || ''} ${r.module_source || ''}`)));
    const lowStock = stocks.filter((r) => threshold(r) > 0 && qty(r) <= threshold(r));
    const purchasesWithoutStock = purchases.filter((trx) => !stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) && trx.stock_impact !== true && n(trx.montant ?? trx.amount) > 0);
    const healthSnap = buildAchatsStockHealthSnapshot({ stocks, suppliers, transactions, feedLogs });
    const coherenceRows = buildAchatsStockCoherenceRows(stocks, transactions, suppliers);
    const supplierDebts = aggregateSupplierDebts(suppliers);
    return {
      stocks,
      suppliers,
      feedLogs,
      stockEvents,
      stockValue: stocks.reduce((s, r) => s + valueOf(r), 0),
      lowStock,
      feedStocks: stocks.filter(isFeed),
      purchases,
      purchaseAmount: purchases.reduce((s, r) => s + n(r.montant ?? r.amount), 0),
      purchasesWithoutStock,
      debt: suppliers.reduce((s, r) => s + supplierDebt(r), 0),
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      supplierDebts,
    };
  }, [stocks, suppliers, transactions, feedLogs, businessEvents]);
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
      else { toast.success('Module ouvert'); setTab('Stock'); }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const relanceSupplier = async (supplier) => {
    setBusyId(supplier.id || supplier.name);
    try {
      await createSupplierFollowUpTask({
        supplierName: supplier.name,
        amount: fmtCurrency(supplier.total),
        supplierId: supplier.id,
        handlers: actionHandlers,
      });
      toast.success(`Tâche paiement créée pour ${supplier.name}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const stockProps = { rows: stocks, alimentationLogs: feedLogs, animaux: arr(props.animaux), lots: arr(props.lots), cultures: arr(props.cultures), transactions, documents: rowsOf(props.documents, documentsCrud, periodFiltered), alertes: rowsOf(props.alertes, alertsCrud, false), fournisseurs: suppliers, opportunities: rowsOf(props.opportunities, opportunitiesCrud, periodFiltered), taches: rowsOf(props.taches, tasksCrud, false), onCreate: props.onCreateStock || stockCrud.create, onUpdate: props.onUpdateStock || stockCrud.update, onDelete: props.onDeleteStock || stockCrud.remove, onRefresh: props.onRefreshStock || stockCrud.refresh, onCreateAlimentation: props.onCreateAlimentation || feedCrud.create, onUpdateAlimentation: props.onUpdateAlimentation || feedCrud.update, onDeleteAlimentation: props.onDeleteAlimentation || feedCrud.remove, onRefreshAlimentation: props.onRefreshAlimentation || feedCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onUpdateSupplier: props.onUpdateSupplier || suppliersCrud.update, onRefreshSuppliers: props.onRefreshSuppliers || suppliersCrud.refresh, onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update, onCreateDocument: props.onCreateDocument || documentsCrud.create, onNavigate: props.onNavigate };
  const supplierProps = { rows: suppliers, stocks, tasks: rowsOf(props.tasks, tasksCrud, false), transactions, finances: transactions, documents: rowsOf(props.documents, documentsCrud, periodFiltered), onCreate: props.onCreateSupplier || suppliersCrud.create, onUpdate: props.onUpdateSupplier || suppliersCrud.update, onDelete: props.onDeleteSupplier || suppliersCrud.remove, onRefresh: props.onRefreshSuppliers || suppliersCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStock: props.onRefreshStock || stockCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Achats & Stock</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Approvisionnement, stock, alimentation — cohérence IA achat/stock/fournisseur.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} onRelance={relanceSupplier} busyId={busyId} onNavigate={props.onNavigate} /> : tab === 'Stock' ? <StocksV5 {...stockProps} /> : tab === 'Achats' ? <AchatsHub data={data} onNavigate={props.onNavigate} setTab={setTab} onRepairPurchase={(tx) => { emitHorizonForm('stock', 'stock_purchase', 'Créer entrée stock depuis cette dépense', buildStockReceptionFromFinanceTransaction(tx, stocks)); setTab('Stock'); }} /> : tab === 'Fournisseurs' ? <FournisseursReadable {...supplierProps} /> : tab === 'Mouvements' ? <MouvementsHub data={data} onNavigate={props.onNavigate} /> : <ModuleGraphiquesTab moduleId="achats_stock" periodFiltered={periodFiltered} stocks={stocks} alimentationLogs={feedLogs} fournisseurs={suppliers} transactions={transactions} onNavigate={props.onNavigate} />}
    </div>
  );
}
