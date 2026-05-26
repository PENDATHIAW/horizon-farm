import { useMemo } from 'react';
import toast from 'react-hot-toast';
import VentesV4 from './VentesV4.jsx';

const n = (value = 0) => Number(value || 0) || 0;
const keyOfPayment = (payment = {}) => String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
const totalOf = (sale = {}) => n(sale.montant_total || sale.total || sale.total_amount || sale.amount || (n(sale.quantity || sale.quantite) * n(sale.unit_price || sale.prix_unitaire)));
const paidOf = (sale = {}, payments = []) => n(sale.montant_paye || sale.paid_amount) || payments.filter((p) => keyOfPayment(p) === String(sale.id)).reduce((sum, p) => sum + n(p.montant || p.amount || p.montant_paye), 0);
const remainingOf = (sale = {}, payments = []) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const isFullyPaid = (sale = {}, payments = []) => remainingOf(sale, payments) <= 0 || ['paye', 'payé'].includes(String(sale.statut_paiement || sale.payment_status || '').toLowerCase());

export default function VentesV6(props) {
  const payments = props.paymentsList || props.payments || [];

  const normalizedRows = useMemo(() => (props.rows || []).map((sale) => {
    const total = totalOf(sale);
    const paid = paidOf(sale, payments);
    const remaining = Math.max(0, total - paid);
    if (remaining > 0) return { ...sale, montant_total: total || sale.montant_total, montant_paye: paid, reste_a_payer: remaining, statut_paiement: paid > 0 ? 'partiel' : (sale.statut_paiement || 'non_paye') };
    return {
      ...sale,
      montant_total: total || sale.montant_total,
      montant_paye: Math.max(paid, total),
      reste_a_payer: 0,
      statut_paiement: 'paye',
      payment_status: 'paye',
    };
  }), [props.rows, payments]);

  const guardedCreatePayment = async (payload = {}) => {
    const saleId = String(payload.order_id || payload.sale_id || payload.source_record_id || payload.related_id || '');
    const sale = normalizedRows.find((row) => String(row.id) === saleId);
    if (sale && isFullyPaid(sale, payments)) {
      toast.success('Vente déjà soldée : aucun encaissement supplémentaire nécessaire.');
      await props.onUpdate?.(sale.id, { reste_a_payer: 0, statut_paiement: 'paye', payment_status: 'paye' });
      await props.onRefresh?.();
      return null;
    }
    const remaining = sale ? remainingOf(sale, payments) : n(payload.montant || payload.amount || payload.montant_paye);
    const requested = n(payload.montant || payload.amount || payload.montant_paye);
    const capped = Math.min(requested, remaining);
    return props.onCreatePayment?.({ ...payload, montant: capped, amount: capped, montant_paye: capped });
  };

  const guardedUpdate = async (id, payload = {}) => {
    const sale = normalizedRows.find((row) => String(row.id) === String(id));
    if (sale && isFullyPaid(sale, payments)) {
      return props.onUpdate?.(id, { ...payload, reste_a_payer: 0, statut_paiement: 'paye', payment_status: 'paye' });
    }
    return props.onUpdate?.(id, payload);
  };

  return <VentesV4 {...props} rows={normalizedRows} onUpdate={guardedUpdate} onCreatePayment={guardedCreatePayment} />;
}
