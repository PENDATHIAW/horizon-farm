import { PackageCheck, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { confirmSaleDelivery } from '../utils/confirmSaleDelivery';
import { summarizeDeliveryGaps } from '../services/commercialDeliverySyncService';

export default function CommercialDeliverySyncPanel({
  orders = [],
  payments = [],
  deliveries = [],
  invoices = [],
  onUpdateOrder,
  onCreateDelivery,
  onUpdateDelivery,
  onCreateTask,
  onUpdateTask,
  tasks = [],
  onRefreshWorkflow,
  setTab,
}) {
  const summary = summarizeDeliveryGaps(orders, payments, { deliveries, invoices });
  if (!summary.count) return null;

  const confirmDelivery = async (row) => {
    try {
      await confirmSaleDelivery({
        sale: row.order,
        deliveryStatus: 'livre',
        deliveries,
        payments,
        tasks,
        handlers: { onCreateDelivery, onUpdateDelivery, onUpdateOrder, onCreateTask, onUpdateTask },
      });
      await onRefreshWorkflow?.();
      toast.success(`Livraison confirmée : ${row.title}`);
    } catch (error) {
      toast.error(error.message || 'Confirmation livraison impossible');
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark flex items-center gap-1"><Truck size={14} /> Livraisons en attente</p>
          <p className="text-sm text-slate mt-1">{summary.count} vente(s) payée(s) ou ouverte(s) sans livraison confirmée · {fmtCurrency(summary.total)}</p>
        </div>
        <button type="button" onClick={() => setTab?.('Ventes')} className="text-xs font-semibold text-horizon-dark underline">Voir ventes →</button>
      </div>
      <div className="space-y-2">
        {summary.rows.slice(0, 5).map((row) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setTab?.('Ventes')} className="text-left">
              <p className="font-semibold text-sm text-earth">{row.title}</p>
              <p className="text-xs text-slate">{row.detail}</p>
            </button>
            <button type="button" onClick={() => confirmDelivery(row)} className="rounded-lg bg-earth px-3 py-2 text-xs font-semibold text-white flex items-center gap-1"><PackageCheck size={13} /> Confirmer livraison</button>
          </div>
        ))}
      </div>
    </section>
  );
}
