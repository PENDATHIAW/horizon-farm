import { Handshake, PackageCheck, ShoppingBag, Warehouse } from 'lucide-react';
import { useMemo, useState } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber } from '../utils/format';
import StocksV5 from './StocksV5';
import FournisseursReadable from './FournisseursReadable';

const arr = (v) => Array.isArray(v) ? v : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const valueOf = (r = {}) => qty(r) * n(r.prix_unitaire ?? r.unit_price ?? r.price ?? r.cout_unitaire);
const isFeed = (r = {}) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(low(`${r.produit || r.name || r.nom || ''} ${r.categorie || r.category || ''}`));
const isPurchaseTx = (r = {}) => /achat|stock|fournisseur|approvisionnement|reception|réception/.test(low(`${r.type || ''} ${r.categorie || ''} ${r.category || ''} ${r.libelle || ''} ${r.title || ''} ${r.module_lie || ''} ${r.source_module || ''}`));
const supplierDebt = (r = {}) => n(r.dettes ?? r.dette ?? r.solde ?? r.balance ?? r.reste_a_payer);

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange }) {
  const tabs = [['Résumé', ShoppingBag], ['Stock', Warehouse], ['Fournisseurs', Handshake]];
  return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map(([tab, Icon]) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}><Icon size={16} />{tab}</button>)}</div></div>;
}
function Summary({ data, setTab }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Produits stock" value={fmtNumber(data.stocks.length)} /><Stat label="Valeur stock" value={fmtCurrency(data.stockValue)} /><Stat label="Sous seuil" value={fmtNumber(data.lowStock.length)} tone={data.lowStock.length ? 'warn' : 'good'} /><Stat label="Fournisseurs" value={fmtNumber(data.suppliers.length)} /><Stat label="Dettes fournisseurs" value={fmtCurrency(data.debt)} tone={data.debt ? 'warn' : 'good'} /></div><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><PackageCheck size={20} /> Workflows récupérés</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Ce module remet les anciens moteurs stock et fournisseurs : création produit, entrée stock, sortie stock, perte, sortie alimentation, historique automatique, dépense finance, documents commerciaux, risques fournisseurs et suivi des dettes.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><button type="button" onClick={() => setTab('Stock')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Stock</b><p className="mt-1 text-sm text-[#8a7456]">Ajouter, modifier, réceptionner, sortir, déclarer perte, alimenter élevage.</p></button><button type="button" onClick={() => setTab('Fournisseurs')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Fournisseurs</b><p className="mt-1 text-sm text-[#8a7456]">Fiches, dettes, documents, risques, commandes et historique.</p></button></div></section></div>;
}

export default function AchatsStockRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const stockCrud = useCrudModule('stock');
  const suppliersCrud = useCrudModule('fournisseurs');
  const financesCrud = useCrudModule('finances');
  const feedCrud = useCrudModule('alimentation_logs');
  const eventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const documentsCrud = useCrudModule('documents');
  const stocks = rowsOf(props.stocks || props.rows, stockCrud);
  const suppliers = rowsOf(props.fournisseurs || props.suppliers, suppliersCrud);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud);
  const data = useMemo(() => ({ stocks, suppliers, stockValue: stocks.reduce((s, r) => s + valueOf(r), 0), lowStock: stocks.filter((r) => threshold(r) > 0 && qty(r) <= threshold(r)), feedStocks: stocks.filter(isFeed), purchases: transactions.filter(isPurchaseTx), debt: suppliers.reduce((s, r) => s + supplierDebt(r), 0) }), [stocks, suppliers, transactions]);
  const stockProps = { rows: stocks, alimentationLogs: rowsOf(props.alimentationLogs, feedCrud), animaux: arr(props.animaux), lots: arr(props.lots), fournisseurs: suppliers, opportunities: rowsOf(props.opportunities, opportunitiesCrud), taches: rowsOf(props.taches, tasksCrud), onCreate: props.onCreateStock || stockCrud.create, onUpdate: props.onUpdateStock || stockCrud.update, onDelete: props.onDeleteStock || stockCrud.remove, onRefresh: props.onRefreshStock || stockCrud.refresh, onCreateAlimentation: props.onCreateAlimentation || feedCrud.create, onUpdateAlimentation: props.onUpdateAlimentation || feedCrud.update, onDeleteAlimentation: props.onDeleteAlimentation || feedCrud.remove, onRefreshAlimentation: props.onRefreshAlimentation || feedCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const supplierProps = { rows: suppliers, stocks, tasks: rowsOf(props.tasks, tasksCrud), transactions, finances: transactions, documents: rowsOf(props.documents, documentsCrud), onCreate: props.onCreateSupplier || suppliersCrud.create, onUpdate: props.onUpdateSupplier || suppliersCrud.update, onDelete: props.onDeleteSupplier || suppliersCrud.remove, onRefresh: props.onRefreshSuppliers || suppliersCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStock: props.onRefreshStock || stockCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Achats & Stock</h1><p className="mt-1 text-sm text-[#8a7456]">Approvisionnement, stock, alimentation, fournisseurs, dépenses et historique métier.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Stock' ? <StocksV5 {...stockProps} /> : <FournisseursReadable {...supplierProps} />}</div>;
}
