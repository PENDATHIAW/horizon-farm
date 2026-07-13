import {  Package, Plus, Receipt, Truck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';

import { makeId } from '../../utils/ids';
import { buildCommercialSaleGapRows } from '../../utils/commercialSaleIntegrity';
import { applySourceImpactFromSale } from '../../utils/saleSideEffects';

const today = () => new Date().toISOString().slice(0, 10);

export default function CommercialSaleRepairPanel({
  rows: orders = [],
  orderItems = [],
  payments = [],
  transactions = [],
  deliveries = [],
  invoices = [],
  documents = [],
  stocks = [],
  animaux = [],
  lots = [],
  onCreateFinanceTransaction,
  onCreateDocument,
  onUpdateOrder,
  onUpdateAnimal,
  onUpdateLot,
  onRefreshWorkflow,
}) {
  const [busyId, setBusyId] = useState(null);

  const gaps = useMemo(() => buildCommercialSaleGapRows({
    orders,
    items: orderItems,
    payments,
    transactions,
    deliveries,
    invoices,
    documents,
    stocks,
    animaux,
    lots,
  }), [orders, orderItems, payments, transactions, deliveries, invoices, documents, stocks, animaux, lots]);

  const runRepair = async (row) => {
    setBusyId(row.id);
    try {
      if (row.kind === 'payment_without_finance' && row.repairFinance) {
        await onCreateFinanceTransaction?.(row.repairFinance);
        toast.success('Ligne finance créée');
      } else if (row.kind === 'invoice_without_document') {
        const inv = row.invoice || {};
        await onCreateDocument?.({
          id: makeId('DOC'),
          title: `Facture ${inv.numero_facture || inv.id || row.orderId}`,
          document_category: 'facture',
          module_source: 'ventes',
          entity_type: 'invoice',
          entity_id: inv.id,
          invoice_id: inv.id,
          order_id: row.orderId,
          sale_id: row.orderId,
          source_module: 'ventes',
          source_record_id: row.orderId,
          amount: inv.montant_total,
          created_from: 'commercial_sale_repair',
        });
        toast.success('Document créé');
      } else if (row.kind === 'delivery_done_order_pending') {
        await onUpdateOrder?.(row.orderId, { statut_livraison: 'livre', delivery_status: 'livre', statut_commande: 'livre' });
        toast.success('Statut livraison aligné');
      } else if (row.kind === 'animal_not_sold_status') {
        await onUpdateAnimal?.(row.animalId, { statut: 'vendu', status: 'vendu', sale_order_id: row.orderId, date_vente: today() });
        toast.success('Animal marqué vendu');
      } else if (row.kind === 'lot_not_sold_status') {
        await onUpdateLot?.(row.lotId, { statut: 'vendu', status: 'vendu', sale_order_id: row.orderId });
        toast.success('Lot mis à jour');
      } else if (row.kind === 'stockable_without_stock_exit' && row.order) {

        await applySourceImpactFromSale({
          handlers: {
            onUpdateStock: async (id, patch) => {
              const target = stocks.find((s) => String(s.id) === String(id));
              if (target?.onUpdate) return target.onUpdate(id, patch);
            },
          },
          sourceType: 'stock',
          sourceId: row.stockId,
          quantity: row.order.quantity,
          total: row.order.montant_ht || row.order.montant_total,
          date: row.order.date,
          orderId: row.orderId,
          stocks,
        });
        toast.success('Sortie stock appliquée - vérifiez le stock');
      } else {
        toast('Réparation manuelle requise pour ce cas.', { icon: 'ℹ️' });
      }
      await onRefreshWorkflow?.();
    } catch (e) {
      toast.error(e.message || 'Réparation impossible');
    } finally {
      setBusyId(null);
    }
  };

  if (!gaps.length) {
    return (
      <section className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        Aucun écart détecté sur les ventes récentes (paiement, finance, stock, livraison, documents).
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-slate">
        Panneau admin/qualité - ne fait pas partie du flux « Nouvelle vente ». {gaps.length} écart(s).
      </p>
      {gaps.slice(0, 12).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-sm text-earth">{row.title}</p>
            <p className="text-xs text-slate">{row.detail}</p>
          </div>
          <Btn
            icon={row.kind.includes('finance') ? Plus : row.kind.includes('delivery') ? Truck : row.kind.includes('stock') ? Package : row.kind.includes('invoice') ? Receipt : Wrench}
            small
            variant="outline"
            disabled={busyId === row.id}
            onClick={() => runRepair(row)}
          >
            {busyId === row.id ? '…' : 'Réparer'}
          </Btn>
        </div>
      ))}
    </section>
  );
}
