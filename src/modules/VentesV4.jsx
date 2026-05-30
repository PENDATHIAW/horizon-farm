import { CheckCircle2, ChevronDown, CreditCard, Edit3, FileText, ReceiptText, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import SaleActionModal from './SaleActionModal.jsx';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { calculateSalesMargin } from '../utils/salesMarginEngine';
import SalesFollowUpPanel from './SalesFollowUpPanel.jsx';
import SalesWorkflowHealth from './SalesWorkflowHealth.jsx';
import { SaleModal } from './VentesTerrainV3.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const payStatus = (sale = {}) => sale.statut_paiement || sale.payment_status || sale.status_paiement || (num(sale.reste_a_payer) > 0 ? 'non_paye' : 'paye');
const deliveryStatus = (sale = {}) => sale.statut_livraison || sale.delivery_status || sale.status_livraison || 'a_livrer';
const totalOf = (sale = {}) => num(sale.montant_total || sale.total || sale.amount || sale.total_amount || (num(sale.quantity || sale.quantite) * num(sale.unit_price || sale.prix_unitaire)));
const paidOf = (sale = {}, payments = []) => num(sale.montant_paye || sale.paid_amount) || payments.filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(sale.id)).reduce((sum, p) => sum + num(p.montant || p.amount || p.montant_paye), 0);
const remainingOf = (sale = {}, payments = []) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const isClosed = (sale = {}, payments = []) => ['cloture', 'clôture', 'annule', 'annulé'].includes(String(sale.statut_commande || sale.status || '').toLowerCase()) || (remainingOf(sale, payments) <= 0 && ['livre', 'livré', 'recupere', 'récupéré'].includes(String(deliveryStatus(sale)).toLowerCase()));
const statusBadge = (text = '', tone = 'amber') => <span className={`rounded-full px-2 py-1 text-[11px] font-black border ${tone === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tone === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{text}</span>;

const VENTES_VIEWS = [
  { key: 'register', label: 'Enregistrer' },
  { key: 'todo', label: 'À traiter' },
  { key: 'followup', label: 'Suivi & marges' },
];

function AdminFold({ children }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white"><span><span className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><ShieldCheck size={16} /> Contrôle qualité ventes</span><span className="mt-1 block text-xs text-[#8a7456]">Outils de régularisation, données importées et vérifications avancées.</span></span><ChevronDown size={18} className={`text-[#8a7456] ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-4">{children}</div> : null}</section>;
}

function SalesDesk({ props, payments, onShowFollowup }) {
  const [selected, setSelected] = useState(null);
  const [initialMode, setInitialMode] = useState('edit');
  const openSale = (sale, mode = 'edit') => { setSelected(sale); setInitialMode(mode); };
  const sales = props.rows || [];
  const marginContext = useMemo(() => ({
    lots: props.lots || props.avicole || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stocks: props.stocks || props.stock || [],
    alimentationLogs: props.alimentationLogs || props.alimentation_logs || [],
    productionLogs: props.productionLogs || props.production_oeufs_logs || [],
    vaccins: props.vaccins || props.sante || [],
    businessEvents: props.businessEvents || props.business_events || [],
    payments,
  }), [props.lots, props.avicole, props.animaux, props.cultures, props.stocks, props.stock, props.alimentationLogs, props.alimentation_logs, props.productionLogs, props.production_oeufs_logs, props.vaccins, props.sante, props.businessEvents, props.business_events, payments]);
  const openSales = sales.filter((sale) => !isClosed(sale, payments)).slice(0, 6);
  const receivable = openSales.reduce((sum, sale) => sum + remainingOf(sale, payments), 0);
  const toDeliver = openSales.filter((sale) => deliveryStatus(sale) === 'a_livrer').length;
  return <div className="space-y-4">
    {selected ? <SaleActionModal sale={selected} payments={payments} props={props} initialMode={initialMode} onClose={() => setSelected(null)} /> : null}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Ventes ouvertes</p><b className="text-2xl text-[#2f2415]">{openSales.length}</b></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">À encaisser</p><b className="text-2xl text-[#2f2415]">{fmtCurrency(receivable)}</b></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">À livrer</p><b className="text-2xl text-[#2f2415]">{toDeliver}</b></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Historique complet</p><button type="button" onClick={onShowFollowup} className="text-sm font-black text-[#9a6b12] underline">Voir suivi →</button></div></div>
    <div className="space-y-2"><p className="text-sm font-black text-[#2f2415]">Actions rapides — ventes ouvertes</p><p className="text-xs text-[#8a7456]">Encaisser, livrer ou facturer. L&apos;historique complet et les marges sont dans l&apos;onglet Suivi & marges.</p>{openSales.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{openSales.map((sale) => { const remaining = remainingOf(sale, payments); const delivery = deliveryStatus(sale); const margin = calculateSalesMargin(sale, marginContext); return <article key={sale.id} className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{sale.product_name || sale.produit || sale.id}</p><p className="text-xs text-[#8a7456]">{sale.client_label || sale.client_name || 'Client'} · {sale.date || 'date non renseignée'}</p></div><div className="flex flex-wrap gap-1 justify-end">{statusBadge(remaining <= 0 ? 'Payé' : remaining < totalOf(sale) ? 'Partiel' : 'À encaisser', remaining <= 0 ? 'green' : 'amber')}{statusBadge(delivery === 'a_livrer' ? 'À livrer' : delivery === 'livre' ? 'Livré' : 'Récupéré', delivery === 'a_livrer' ? 'red' : 'green')}</div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><div><span className="text-[#8a7456]">Total</span><b className="block text-[#2f2415]">{fmtCurrency(totalOf(sale))}</b></div><div><span className="text-[#8a7456]">Reste</span><b className="block text-[#2f2415]">{fmtCurrency(remaining)}</b></div><div className="hidden md:block"><span className="text-[#8a7456]">Coût</span><b className="block text-[#2f2415]">{margin.cout_a_completer ? 'À compléter' : fmtCurrency(margin.cout_revient)}</b></div><div className="hidden md:block"><span className="text-[#8a7456]">Marge</span><b className={`block ${margin.cout_a_completer ? 'text-amber-700' : margin.marge_directe < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{margin.cout_a_completer ? 'Non fiable' : fmtCurrency(margin.marge_directe)}</b></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2"><button type="button" onClick={() => openSale(sale, 'edit')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#7d6a4a]"><Edit3 size={13} className="inline" /> Modifier</button><button type="button" onClick={() => openSale(sale, 'pay')} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><ReceiptText size={13} className="inline" /> Encaisser</button><button type="button" onClick={() => openSale(sale, 'deliver')} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"><Truck size={13} className="inline" /> Livrer</button><button type="button" onClick={() => openSale(sale, 'invoice')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#7d6a4a]"><FileText size={13} className="inline" /> Facture</button></div></article>; })}</div> : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune vente ouverte — enregistrez une nouvelle vente pour commencer.</div>}</div>
  </div>;
}

export default function VentesV4(props) {
  const embedded = Boolean(props.embedded);
  const [view, setView] = useState(() => (embedded ? 'todo' : 'register'));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState(null);
  const payments = props.paymentsList || props.payments || [];
  const sales = props.rows || [];
  const openCount = sales.filter((sale) => !isClosed(sale, payments)).length;

  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'ventes' && draft?.form_type === 'sale_record') {
        setModalDraft(draft);
        setModalOpen(true);
        setView('register');
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);

  const openNewSale = () => { setModalDraft(null); setModalOpen(true); };
  const closeSale = () => { setModalOpen(false); setModalDraft(null); };
  const onSaleDone = (orderId) => {
    closeSale();
    toast.success(`Vente ${orderId} enregistrée`);
    setView('todo');
  };

  return <div className={`space-y-4 ventes-mobile-structured ${embedded ? '' : 'space-y-5'}`}>
    <div className={`rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] shadow-sm ${embedded ? 'p-3' : 'rounded-3xl p-5 space-y-4'}`}>
      {!embedded ? (
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Ventes</p>
            <h2 className="text-2xl font-black text-[#2f2415]">Enregistrer & suivre</h2>
          </div>
          <button type="button" onClick={openNewSale} className="min-h-[44px] rounded-2xl bg-[#2f2415] px-5 py-3 text-sm font-black text-white"><CreditCard size={16} className="inline mr-1" /> Nouvelle vente</button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {VENTES_VIEWS.map((item) => (
          <button key={item.key} type="button" onClick={() => setView(item.key)} className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-black ${view === item.key ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-white text-[#8a7456]'}`}>
            {item.label}{item.key === 'todo' && openCount > 0 ? ` (${openCount})` : ''}
          </button>
        ))}
        <button type="button" onClick={openNewSale} className="ml-auto min-h-[40px] rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"><CreditCard size={14} className="inline mr-1" /> Nouvelle vente</button>
      </div>
    </div>

    {view === 'register' ? (
      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-6 text-center shadow-sm">
        <ShoppingCart size={28} className="mx-auto text-[#9a6b12]" />
        <p className="mt-3 font-black text-[#2f2415]">Formulaire guidé en 5 étapes</p>
        <p className="mt-1 text-sm text-[#8a7456]">Produit → client → livraison → paiement → validation</p>
        <button type="button" onClick={openNewSale} className="mt-4 min-h-[44px] rounded-xl bg-[#2f2415] px-6 py-2 text-sm font-black text-white"><CheckCircle2 size={16} className="inline mr-1" /> Ouvrir</button>
      </div>
    ) : null}

    {view === 'todo' ? <SalesDesk props={props} payments={payments} onShowFollowup={() => setView('followup')} /> : null}

    {view === 'followup' ? <SalesFollowUpPanel {...props} paymentsList={payments} /> : null}

    {modalOpen ? <SaleModal props={props} prefill={modalDraft} onClose={closeSale} onDone={onSaleDone} /> : null}

    <AdminFold><SalesWorkflowHealth orders={props.rows || []} payments={payments} transactions={props.transactions || []} invoices={props.invoicesList || props.invoices || []} deliveries={props.deliveriesList || props.deliveries || []} stocks={props.stocks || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} onNavigate={props.onNavigate} /></AdminFold>
  </div>;
}
