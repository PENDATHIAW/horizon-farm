import { makeId } from './ids';
import { toNumber } from './format';
import { deliveryFeeOf } from './saleQuantityLabel';
import { paidForOrder } from './salesStatuses';
import { resolveSaleTasksOnDelivery, runDeliverySideEffects } from './saleSideEffects';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export function mapDeliveryStatut(commercialStatus = 'livre') {
  const status = lower(commercialStatus);
  if (status === 'livre' || status === 'livré' || status === 'delivered') {
    return { commercial: 'livre', record: 'livree' };
  }
  if (status === 'recupere' || status === 'récupéré' || status === 'recupéré') {
    return { commercial: 'recupere', record: 'livree' };
  }
  if (status === 'a_livrer' || status === 'a livrer') {
    return { commercial: 'a_livrer', record: 'en_cours' };
  }
  return { commercial: status || 'a_livrer', record: 'prevue' };
}

export function isDeliveryComplete(status = '') {
  const value = lower(status);
  return value === 'livre' || value === 'livré' || value === 'delivered' || value === 'recupere' || value === 'récupéré';
}

function orderTotal(sale = {}, fee = 0) {
  const base = toNumber(sale.montant_total ?? sale.total ?? sale.amount ?? sale.montant);
  if (base > 0) return fee > 0 ? Math.max(base, toNumber(sale.montant_ht) + fee) : base;
  const ht = toNumber(sale.montant_ht ?? (toNumber(sale.quantity ?? sale.quantite) * toNumber(sale.unit_price ?? sale.prix_unitaire)));
  return ht + fee;
}

/**
 * Confirme ou planifie une livraison vente — création livraison + MAJ commande + tâches.
 */
export async function confirmSaleDelivery({
  sale = {},
  deliveryStatus = 'livre',
  deliveries = [],
  payments = [],
  handlers = {},
  tasks = [],
  clientLabel = '',
  deliveryFee = null,
} = {}) {
  if (!sale?.id) throw new Error('Commande introuvable');

  const {
    onCreateDelivery,
    onUpdateDelivery,
    onUpdateOrder,
    onCreateTask,
    onUpdateTask,
  } = handlers;

  const mapped = mapDeliveryStatut(deliveryStatus);
  const date = today();
  const client = clientLabel || sale.client_label || sale.client_name || sale.client_nom || 'Client';
  const fee = deliveryFee != null ? Math.max(0, toNumber(deliveryFee)) : deliveryFeeOf(sale, deliveries);
  const existingDelivery = arr(deliveries).find(
    (row) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id) === clean(sale.id),
  );

  const deliveryPayload = {
    order_id: sale.id,
    sale_id: sale.id,
    client_id: sale.client_id || '',
    date_livraison: date,
    statut: mapped.record,
    status: mapped.record,
    mode_livraison: mapped.commercial,
    fulfillment_mode: mapped.commercial,
    frais_livraison: fee,
    delivery_fee: fee,
    destinataire: client,
  };

  if (existingDelivery?.id && onUpdateDelivery) {
    await onUpdateDelivery(existingDelivery.id, deliveryPayload);
  } else if (onCreateDelivery) {
    await onCreateDelivery({ id: makeId('LIV'), ...deliveryPayload });
  }

  const total = orderTotal(sale, fee);
  const paid = paidForOrder(sale, payments);
  const remaining = Math.max(0, total - paid);
  const complete = isDeliveryComplete(mapped.commercial);

  await onUpdateOrder?.(sale.id, {
    statut_livraison: mapped.commercial,
    delivery_status: mapped.commercial,
    status_livraison: mapped.commercial,
    fulfillment_mode: mapped.commercial,
    mode_livraison: mapped.commercial,
    date_livraison: date,
    frais_livraison: fee,
    delivery_fee: fee,
    montant_total: total,
    reste_a_payer: remaining,
    statut_commande: complete ? 'livre' : remaining > 0 ? 'ouvert' : 'livre',
  });

  if (complete) {
    try {
      await resolveSaleTasksOnDelivery({ sale, tasks, handlers: { onUpdateTask } });
    } catch (error) {
      console.warn('resolveSaleTasksOnDelivery', error?.message || error);
    }
  } else {
    try {
      await runDeliverySideEffects({
        sale: { ...sale, fulfillment_mode: mapped.commercial },
        deliveryStatus: mapped.commercial,
        productName: sale.product_name || sale.produit,
        clientLabel: client,
        tasks,
        handlers: { onCreateTask },
      });
    } catch (error) {
      console.warn('runDeliverySideEffects', error?.message || error);
    }
  }

  return {
    deliveryStatus: mapped.commercial,
    complete,
    remaining,
    fee,
  };
}

export function buildDeliveryHandlers(props = {}) {
  return {
    onCreateDelivery: props.onCreateDelivery,
    onUpdateDelivery: props.onUpdateDelivery,
    onUpdateOrder: props.onUpdate,
    onCreateTask: props.onCreateTask,
    onUpdateTask: props.onUpdateTask,
  };
}
