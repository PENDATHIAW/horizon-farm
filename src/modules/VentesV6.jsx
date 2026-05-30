import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { paidForOrder, remainingForOrder } from '../utils/salesStatuses';
import { recordSalePayment } from '../utils/recordSalePayment';
import VentesV4 from './VentesV4.jsx';
import { linkedPaymentsForOrders, saleAmount } from './commercial/commercialMetrics.js';

export default function VentesV6(props) {
  const payments = props.paymentsList || props.payments || [];
  const orders = props.rows || [];

  const normalizedRows = useMemo(() => {
    const linked = linkedPaymentsForOrders(orders, payments);
    return orders.map((sale) => {
      const total = saleAmount(sale) || sale.montant_total;
      const paid = paidForOrder(sale, linked);
      const remaining = remainingForOrder(sale, linked);
      if (remaining > 0) {
        return { ...sale, montant_total: total, montant_paye: paid, reste_a_payer: remaining, statut_paiement: paid > 0 ? 'partiel' : (sale.statut_paiement || 'non_paye') };
      }
      return {
        ...sale,
        montant_total: total,
        montant_paye: Math.max(paid, total),
        reste_a_payer: 0,
        statut_paiement: 'paye',
        payment_status: 'paye',
      };
    });
  }, [orders, payments]);

  const guardedCreatePayment = async (payload = {}) => {
    const saleId = String(payload.order_id || payload.sale_id || payload.source_record_id || payload.related_id || '');
    const sale = orders.find((row) => String(row.id) === saleId) || normalizedRows.find((row) => String(row.id) === saleId);
    const linked = linkedPaymentsForOrders(orders, payments);
    const result = await recordSalePayment({
      sale: sale || { id: saleId, client_id: payload.client_id },
      requestedAmount: Number(payload.montant || payload.amount || payload.montant_paye || 0),
      payments: linked,
      transactions: props.transactions || [],
      clients: props.clients || [],
      salesOrders: orders,
      paymentMethod: payload.moyen_paiement || payload.mode_paiement || payload.payment_method || 'especes',
      paymentDate: payload.date_paiement || payload.date || '',
      paymentId: payload.id,
      handlers: {
        onCreatePayment: props.onCreatePayment,
        onCreateFinanceTransaction: props.onCreateFinanceTransaction,
        onUpdateOrder: props.onUpdate,
        onUpdateClient: props.onUpdateClient,
        onRefresh: props.onRefresh,
        onRefreshPayments: props.onRefreshPayments,
        onRefreshFinances: props.onRefreshFinances,
        onRefreshClients: props.onRefreshClients,
      },
    });

    if (result?.skipped && result.reason === 'already_settled') {
      toast.success('Vente déjà soldée : aucun encaissement supplémentaire.');
      return null;
    }
    if (result?.skipped && result.reason === 'over_payment') {
      toast.error(`Maximum encaissable : ${fmtCurrency(result.remaining)}`);
      return null;
    }
    if (result?.skipped && result.reason === 'duplicate_payment') {
      toast.success('Encaissement déjà enregistré — aucun doublon créé.');
      return result.payment;
    }
    void props.onRefreshWorkflow?.();
    return result;
  };

  const guardedUpdate = async (id, payload = {}) => {
    const sale = normalizedRows.find((row) => String(row.id) === String(id));
    const linked = linkedPaymentsForOrders(orders, payments);
    if (sale && remainingForOrder(sale, linked) <= 0) {
      return props.onUpdate?.(id, { ...payload, reste_a_payer: 0, statut_paiement: 'paye', payment_status: 'paye' });
    }
    return props.onUpdate?.(id, payload);
  };

  return <VentesV4 {...props} rows={normalizedRows} onUpdate={guardedUpdate} onCreatePayment={guardedCreatePayment} />;
}
