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

function DeliverySection({ title, rows, tone = 'neutral', onMarkDelivered, onOpenProof }) {
  if (!rows.length) return null;
  const border = tone === 'warn' ? 'border-vigilance bg-vigilance-bg' : tone === 'good' ? 'border-positive bg-positive-bg' : 'border-line bg-white';
  return (
    <section className={`rounded-card border p-4 ${border}`}>
      <p className="mb-3 text-sm font-semibold text-earth">{title} ({rows.length})</p>
      <div className="space-y-2">
        {rows.slice(0, 8).map((row) => (
          <div key={row.id} className="flex flex-col justify-between gap-2 rounded-card border border-line bg-card p-3 md:flex-row md:items-center">
            <div>
              <p className="font-semibold text-earth">{row.orderId} · {row.clientName}</p>
              <p className="text-xs text-slate">
                {DELIVERY_STATUS_LABELS[row.status] || row.statusLabel}
                {row.plannedDate ? ` · prévu ${row.plannedDate}` : ''}
                {row.address ? ` · ${row.address}` : ''}
                {row.fee > 0 ? ` · ${fmtCurrency(row.fee)}` : ' · livraison offerte'}
              </p>
              <p className="mt-1 text-meta text-slate">{deliveryProofMessage(row.delivery)}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {row.status !== 'livree' ? (
                <button type="button" onClick={() => onMarkDelivered(row)} className="rounded-control border border-positive bg-positive-bg px-2 py-1 text-meta font-semibold text-positive">Marquer livrée</button>
              ) : null}
              <button type="button" onClick={() => onOpenProof(row)} className="rounded-control border border-line bg-neutral-bg px-2 py-1 text-meta font-semibold text-neutral">Ajouter preuve</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}



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
      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><Truck size={14} /> Livraisons terrain</p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="rounded-xl border border-line bg-card p-3"><Clock size={14} className="text-horizon-dark" /><p className="font-semibold">{queue.toPrepare.length}</p><p className="text-xs text-slate">À préparer</p></div>
          <div className="rounded-xl border border-line bg-neutral-bg p-3"><Truck size={14} className="text-neutral" /><p className="font-semibold">{queue.inProgress.length}</p><p className="text-xs text-neutral">En cours</p></div>
          <div className="rounded-xl border border-positive bg-positive-bg p-3"><CheckCircle2 size={14} className="text-positive" /><p className="font-semibold">{queue.delivered.length}</p><p className="text-xs text-positive">Livrées</p></div>
          <div className="rounded-xl border border-vigilance bg-vigilance-bg p-3"><AlertTriangle size={14} className="text-horizon-dark" /><p className="font-semibold">{queue.late.length}</p><p className="text-xs text-horizon-dark">En retard</p></div>
          <div className="rounded-xl border border-urgent bg-urgent-bg p-3"><FileText size={14} className="text-urgent" /><p className="font-semibold">{queue.withoutProof.length}</p><p className="text-xs text-urgent">Sans preuve</p></div>
        </div>
      </section>
      <DeliverySection title="À préparer" rows={queue.toPrepare} onMarkDelivered={markDelivered} onOpenProof={openProofModal} />
      <DeliverySection title="En cours" rows={queue.inProgress} tone="neutral" onMarkDelivered={markDelivered} onOpenProof={openProofModal} />
      <DeliverySection title="En retard" rows={queue.late} tone="warn" onMarkDelivered={markDelivered} onOpenProof={openProofModal} />
      <DeliverySection title="Livrées sans preuve" rows={queue.withoutProof} tone="warn" onMarkDelivered={markDelivered} onOpenProof={openProofModal} />
      <DeliverySection title="Livrées" rows={queue.delivered} tone="good" onMarkDelivered={markDelivered} onOpenProof={openProofModal} />
      {!queue.all.length ? (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-slate">Aucune livraison enregistrée — créez une vente avec livraison.</p>
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
