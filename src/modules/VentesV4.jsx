import { CheckCircle2, ChevronDown, CreditCard, Edit3, FileText, ReceiptText, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import SaleActionModal from './SaleActionModal.jsx';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { calculateSalesMargin } from '../utils/salesMarginEngine';
import { buildDeliveryHandlers, confirmSaleDelivery } from '../utils/confirmSaleDelivery';
import { remainingForOrder } from '../utils/salesStatuses';
import { isDelivered, isSaleClosed, linkedPaymentsForOrders, saleAmount } from './commercial/commercialMetrics.js';
import SalesFollowUpPanel from './SalesFollowUpPanel.jsx';
import SalesWorkflowHealth from './SalesWorkflowHealth.jsx';
import CommercialSaleRepairPanel from './commercial/CommercialSaleRepairPanel.jsx';
import { SaleModal } from './VentesTerrainV3.jsx';

const deliveryStatus = (sale = {}) => sale.statut_livraison || sale.delivery_status || sale.status_livraison || 'a_livrer';
const statusBadge = (text = '', tone = 'amber') => <span className={`rounded-full px-2 py-1 text-meta font-semibold border ${tone === 'green' ? 'bg-positive-bg text-positive border-positive' : tone === 'red' ? 'bg-urgent-bg text-urgent border-urgent' : 'bg-vigilance-bg text-horizon-dark border-vigilance'}`}>{text}</span>;

const VENTES_VIEWS = [
  { key: 'register', label: 'Enregistrer' },
  { key: 'todo', label: 'À traiter' },
  { key: 'followup', label: 'Suivi & marges' },
];

function AdminFold({ children }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-2xl border border-line bg-card shadow-card overflow-hidden"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white"><span><span className="flex items-center gap-2 text-sm font-semibold text-earth"><ShieldCheck size={16} /> Contrôle qualité ventes</span><span className="mt-1 block text-xs text-slate">Outils de régularisation, données importées et vérifications avancées.</span></span><ChevronDown size={18} className={`text-slate ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-line p-4">{children}</div> : null}</section>;
}

function SalesDesk({ props, payments, onShowFollowup, embedded = false }) {
  const [selected, setSelected] = useState(null);
  const [initialMode, setInitialMode] = useState('edit');
  const [deliveringId, setDeliveringId] = useState(null);
  const openSale = (sale, mode = 'edit') => { setSelected(sale); setInitialMode(mode); };
  const quickDeliver = async (sale) => {
    try {
      setDeliveringId(sale.id);
      const mode = String(sale.fulfillment_mode || sale.mode_livraison || deliveryStatus(sale)).toLowerCase();
      const status = mode === 'recupere' || mode === 'récupéré' ? 'recupere' : 'livre';
      await confirmSaleDelivery({
        sale,
        deliveryStatus: status,
        deliveries: props.deliveriesList || props.deliveries || [],
        payments,
        handlers: buildDeliveryHandlers(props),
        tasks: props.tasks || props.existingTasks || [],
        clientLabel: sale.client_label || sale.client_name || 'Client',
      });
      toast.success('Livraison confirmée');
      void props.onRefreshWorkflow?.();
    } catch (error) {
      console.error('Livraison vente', error);
      toast.error(error?.message || 'Livraison impossible');
    } finally {
      setDeliveringId(null);
    }
  };
  const sales = useMemo(() => props.rows || [], [props.rows]);
  const linked = useMemo(() => linkedPaymentsForOrders(sales, payments), [sales, payments]);
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
  const openSales = sales.filter((sale) => !isSaleClosed(sale, payments)).slice(0, embedded ? 12 : 6);
  const receivable = openSales.reduce((sum, sale) => sum + remainingForOrder(sale, linked), 0);
  const toDeliver = openSales.filter((sale) => !isDelivered(sale)).length;
  return <div className="space-y-4">
    {selected ? <SaleActionModal sale={selected} payments={payments} props={props} initialMode={initialMode} onClose={() => setSelected(null)} /> : null}
    {!embedded ? (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">Ventes ouvertes</p><b className="text-2xl text-earth">{openSales.length}</b></div>
        <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">À encaisser</p><b className="text-2xl text-earth">{fmtCurrency(receivable)}</b></div>
        <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">À livrer</p><b className="text-2xl text-earth">{toDeliver}</b></div>
        <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">Historique complet</p><button type="button" onClick={onShowFollowup} className="text-sm font-semibold text-horizon-dark underline">Voir suivi →</button></div>
      </div>
    ) : receivable > 0 || toDeliver > 0 ? (
      <p className="text-sm font-semibold text-horizon-dark">
        {receivable > 0 ? `${fmtCurrency(receivable)} à encaisser` : ''}{receivable > 0 && toDeliver > 0 ? ' · ' : ''}{toDeliver > 0 ? `${toDeliver} livraison(s) en attente` : ''}
      </p>
    ) : null}
    <div className="space-y-2">
      {!embedded ? <p className="text-sm font-semibold text-earth">Actions rapides - ventes ouvertes</p> : null}
      {!embedded ? <p className="text-xs text-slate">Encaisser, livrer ou facturer. L&apos;historique complet et les marges sont dans l&apos;onglet Suivi & marges.</p> : null}
      {openSales.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{openSales.map((sale) => { const remaining = remainingForOrder(sale, linked);  const total = saleAmount(sale); const margin = calculateSalesMargin(sale, marginContext); const needsPay = remaining > 0; const needsDelivery = !isDelivered(sale); return <article key={sale.id} className={`rounded-2xl border bg-white p-4 space-y-3 ${needsPay ? 'border-vigilance' : 'border-line'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-earth">{sale.product_name || sale.produit || sale.id}</p><p className="text-xs text-slate">{sale.client_label || sale.client_name || 'Client'} · {sale.date || 'date non renseignée'}</p></div><div className="flex flex-wrap gap-1 justify-end">{statusBadge(remaining <= 0 ? 'Payé' : remaining < total ? 'Partiel' : 'À encaisser', remaining <= 0 ? 'green' : 'amber')}{statusBadge(needsDelivery ? 'À livrer' : 'Livré', needsDelivery ? 'red' : 'green')}</div></div><div className={`grid gap-2 text-sm ${embedded ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}><div><span className="text-slate">Total</span><b className="block text-earth">{fmtCurrency(total)}</b></div><div><span className="text-slate">Reste</span><b className={`block ${needsPay ? 'text-horizon-dark' : 'text-earth'}`}>{fmtCurrency(remaining)}</b></div>{!embedded ? <><div className="hidden md:block"><span className="text-slate">Coût</span><b className="block text-earth">{margin.cout_a_completer ? 'À compléter' : fmtCurrency(margin.cout_revient)}</b></div><div className="hidden md:block"><span className="text-slate">Marge</span><b className={`block ${margin.cout_a_completer ? 'text-horizon-dark' : margin.marge_directe < 0 ? 'text-urgent' : 'text-positive'}`}>{margin.cout_a_completer ? 'Non fiable' : fmtCurrency(margin.marge_directe)}</b></div></> : null}</div><div className="grid grid-cols-2 md:grid-cols-4 gap-2"><button type="button" onClick={() => openSale(sale, 'edit')} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-slate"><Edit3 size={13} className="inline" /> Modifier</button>{needsPay ? <button type="button" onClick={() => openSale(sale, 'pay')} className="rounded-xl border border-positive bg-positive-bg px-3 py-2 text-xs font-semibold text-positive"><ReceiptText size={13} className="inline" /> Encaisser</button> : null}{needsDelivery ? <button type="button" onClick={() => quickDeliver(sale)} disabled={deliveringId === sale.id} className="rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-xs font-semibold text-horizon-dark"><Truck size={13} className="inline" /> Livrer</button> : null}<button type="button" onClick={() => openSale(sale, 'invoice')} className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-slate"><FileText size={13} className="inline" /> Facture</button></div></article>; })}</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">Aucune vente à traiter - tout est à jour.</div>}
    </div>
  </div>;
}

export default function VentesV4(props) {
  const { initialSaleDraft, onConsumeSaleDraft } = props;
  const embedded = Boolean(props.embedded);
  const [view, setView] = useState(() => (embedded ? 'todo' : 'register'));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState(null);
  const payments = props.paymentsList || props.payments || [];
  const sales = props.rows || [];
  const openCount = sales.filter((sale) => !isSaleClosed(sale, payments)).length;

  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if ((event.detail?.module === 'ventes' || event.detail?.module === 'commercial') && draft?.form_type === 'sale_record') {
        setModalDraft(draft);
        setModalOpen(true);
        setView('register');
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);

  useEffect(() => {
    if (!initialSaleDraft) return;
    queueMicrotask(() => {
      setModalDraft(initialSaleDraft);
      setModalOpen(true);
      setView('register');
    });
    onConsumeSaleDraft?.();
  }, [initialSaleDraft, onConsumeSaleDraft]);

  const openNewSale = () => { setModalDraft(null); setModalOpen(true); };
  const closeSale = () => { setModalOpen(false); setModalDraft(null); };
  const onSaleDone = () => {
    closeSale();
    setView('todo');
  };

  return <div className={`space-y-4 ventes-mobile-structured ${embedded ? '' : 'space-y-6'}`}>
    <div className={`rounded-2xl border border-line bg-card shadow-card ${embedded ? 'p-3' : 'rounded-3xl p-6 space-y-4'}`}>
      {!embedded ? (
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate font-semibold">Ventes</p>
            <h2 className="text-2xl font-semibold text-earth">Enregistrer & suivre</h2>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {VENTES_VIEWS.map((item) => (
          <button key={item.key} type="button" onClick={() => setView(item.key)} className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold ${view === item.key ? 'bg-earth text-white' : 'border border-line bg-white text-slate'}`}>
            {item.label}{item.key === 'todo' && openCount > 0 ? ` (${openCount})` : ''}
          </button>
        ))}
        <button type="button" onClick={openNewSale} className={`${embedded ? 'ml-auto' : ''} min-h-[40px] rounded-xl bg-earth px-4 py-2 text-xs font-semibold text-white`}><CreditCard size={14} className="inline mr-1" /> Nouvelle vente</button>
      </div>
    </div>

    {view === 'register' ? (
      <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-card">
        <ShoppingCart size={28} className="mx-auto text-horizon-dark" />
        <p className="mt-3 font-semibold text-earth">Enregistrer une vente</p>
        <button type="button" onClick={openNewSale} className="mt-4 min-h-[44px] rounded-xl bg-earth px-6 py-2 text-sm font-semibold text-white"><CheckCircle2 size={16} className="inline mr-1" /> Ouvrir</button>
      </div>
    ) : null}

    {view === 'todo' ? <SalesDesk props={props} payments={payments} embedded={embedded} onShowFollowup={() => setView('followup')} /> : null}

    {view === 'followup' ? <SalesFollowUpPanel {...props} paymentsList={payments} /> : null}

    {modalOpen ? <SaleModal props={props} prefill={modalDraft} onClose={closeSale} onDone={onSaleDone} /> : null}

    {!embedded ? (
      <AdminFold>
        <div className="space-y-4">
          <SalesWorkflowHealth orders={props.rows || []} payments={payments} transactions={props.transactions || []} invoices={props.invoicesList || props.invoices || []} deliveries={props.deliveriesList || props.deliveries || []} stocks={props.stocks || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} onNavigate={props.onNavigate} />
          <CommercialSaleRepairPanel
            rows={props.rows || []}
            orderItems={props.orderItems || []}
            payments={payments}
            transactions={props.transactions || []}
            deliveries={props.deliveriesList || props.deliveries || []}
            invoices={props.invoicesList || props.invoices || []}
            documents={props.documents || []}
            stocks={props.stocks || []}
            animaux={props.animaux || []}
            lots={props.lots || []}
            onCreateFinanceTransaction={props.onCreateFinanceTransaction}
            onCreateDocument={props.onCreateDocument}
            onUpdateOrder={props.onUpdate}
            onUpdateAnimal={props.onUpdateAnimal}
            onUpdateLot={props.onUpdateLot}
            onUpdateStock={props.onUpdateStock}
            onRefreshWorkflow={props.onRefreshWorkflow}
          />
        </div>
      </AdminFold>
    ) : null}
  </div>;
}
