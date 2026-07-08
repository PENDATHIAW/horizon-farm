import { useState } from 'react';
import { Truck, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import QuickInputModal from '../../components/QuickInputModal.jsx';
import { fmtCurrency } from '../../utils/format';
import {
  buildCommercialDeliveryQueue,
  buildDeliveryProofPatch,
  deliveryProofMessage,
  DELIVERY_STATUS_LABELS,
} from '../../utils/commercialDeliveries.js';
import { confirmSaleDelivery } from '../../utils/confirmSaleDelivery.js';
import CommercialDeliverySyncPanel from '../CommercialDeliverySyncPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function CommercialDeliveriesPanel({
  deliveries = [],
  orders = [],
  clients = [],
  documents = [],
  payments = [],
  invoices = [],
  tasks = [],
  onUpdateDelivery,
  onCreateDocument,
  onUpdateOrder,
  onCreateDelivery,
  onCreateTask,
  onUpdateTask,
  onRefreshWorkflow,
  setTab,
}) {
  const queue = buildCommercialDeliveryQueue({ deliveries, orders, clients, documents });
  const [proofTarget, setProofTarget] = useState(null);
  const [proofNote, setProofNote] = useState('');
  const [proofSaving, setProofSaving] = useState(false);

  const markDelivered = async (row) => {
    const order = orders.find((item) => String(item.id) === String(row.orderId));
    if (!order) {
      toast.error('Commande introuvable');
      return;
    }
    try {
      const result = await confirmSaleDelivery({
        sale: order,
        deliveryStatus: 'livre',
        deliveries,
        payments,
        tasks,
        clientLabel: row.clientName,
        handlers: {
          onCreateDelivery,
          onUpdateDelivery,
          onUpdateOrder,
          onCreateTask,
          onUpdateTask,
        },
      });
      toast.success(result.complete ? 'Livraison confirmée' : 'Livraison planifiée');
      await onRefreshWorkflow?.();
    } catch (error) {
      toast.error(error.message || 'Confirmation livraison impossible');
    }
  };

  const openProofModal = (row) => {
    setProofTarget(row);
    setProofNote('');
  };

  const closeProofModal = () => {
    if (proofSaving) return;
    setProofTarget(null);
    setProofNote('');
  };

  const submitProof = async () => {
    if (!proofTarget || !proofNote.trim()) {
      toast.error('Note / preuve obligatoire');
      return;
    }
    try {
      setProofSaving(true);
      const note = proofNote.trim();
      const patch = buildDeliveryProofPatch({ note, clientConfirmed: true });
      await onUpdateDelivery?.(proofTarget.id, patch);
      if (onCreateDocument) {
        await onCreateDocument({
          title: `Preuve livraison ${proofTarget.orderId}`,
          document_category: 'preuve_livraison',
          module_source: 'commercial',
          entity_id: proofTarget.orderId,
          order_id: proofTarget.orderId,
          related_id: proofTarget.orderId,
          notes: note,
        });
      }
      toast.success('Preuve enregistrée');
      await onRefreshWorkflow?.();
      closeProofModal();
    } catch (error) {
      toast.error(error?.message || 'Preuve impossible');
    } finally {
      setProofSaving(false);
    }
  };

  const Section = ({ title, rows, tone = 'neutral' }) => {
    if (!rows.length) return null;
    const border = tone === 'warn' ? 'border-amber-200 bg-amber-50/40' : tone === 'good' ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#eadcc2] bg-white';
    return (
      <section className={`rounded-2xl border p-4 ${border}`}>
        <p className="text-sm font-black text-[#2f2415] mb-3">{title} ({rows.length})</p>
        <div className="space-y-2">
          {rows.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="font-black text-[#2f2415]">{row.orderId} · {row.clientName}</p>
                <p className="text-xs text-[#8a7456]">
                  {DELIVERY_STATUS_LABELS[row.status] || row.statusLabel}
                  {row.plannedDate ? ` · prévu ${row.plannedDate}` : ''}
                  {row.address ? ` · ${row.address}` : ''}
                  {row.fee > 0 ? ` · ${fmtCurrency(row.fee)}` : ' · livraison offerte'}
                </p>
                <p className="text-[11px] text-[#8a7456] mt-1">{deliveryProofMessage(row.delivery)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {row.status !== 'livree' ? (
                  <button type="button" onClick={() => markDelivered(row)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800">
                    Marquer livrée
                  </button>
                ) : null}
                <button type="button" onClick={() => openProofModal(row)} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-800">
                  Ajouter preuve
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <CommercialDeliverySyncPanel
        orders={orders}
        payments={payments}
        deliveries={deliveries}
        invoices={invoices}
        tasks={tasks}
        onUpdateOrder={onUpdateOrder}
        onCreateDelivery={onCreateDelivery}
        onUpdateDelivery={onUpdateDelivery}
        onCreateTask={onCreateTask}
        onUpdateTask={onUpdateTask}
        onRefreshWorkflow={onRefreshWorkflow}
        setTab={setTab}
      />
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Truck size={14} /> Livraisons terrain</p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Clock size={14} className="text-[#9a6b12]" /><p className="font-black">{queue.toPrepare.length}</p><p className="text-xs text-[#8a7456]">À préparer</p></div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3"><Truck size={14} className="text-sky-700" /><p className="font-black">{queue.inProgress.length}</p><p className="text-xs text-sky-800">En cours</p></div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><CheckCircle2 size={14} className="text-emerald-700" /><p className="font-black">{queue.delivered.length}</p><p className="text-xs text-emerald-800">Livrées</p></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><AlertTriangle size={14} className="text-amber-700" /><p className="font-black">{queue.late.length}</p><p className="text-xs text-amber-800">En retard</p></div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3"><FileText size={14} className="text-red-700" /><p className="font-black">{queue.withoutProof.length}</p><p className="text-xs text-red-800">Sans preuve</p></div>
        </div>
      </section>
      <Section title="À préparer" rows={queue.toPrepare} />
      <Section title="En cours" rows={queue.inProgress} tone="neutral" />
      <Section title="En retard" rows={queue.late} tone="warn" />
      <Section title="Livrées sans preuve" rows={queue.withoutProof} tone="warn" />
      <Section title="Livrées" rows={queue.delivered} tone="good" />
      {!queue.all.length ? (
        <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-6 text-center text-sm text-[#8a7456]">Aucune livraison enregistrée — créez une vente avec livraison.</p>
      ) : null}

      <QuickInputModal
        open={Boolean(proofTarget)}
        title="Preuve livraison"
        description={proofTarget ? `${proofTarget.orderId} · ${proofTarget.clientName}` : ''}
        label="Note / preuve (signature texte, confirmation…)"
        type="textarea"
        value={proofNote}
        onChange={setProofNote}
        submitLabel="Enregistrer la preuve"
        onClose={closeProofModal}
        onSubmit={submitProof}
        busy={proofSaving}
      />
    </div>
  );
}
