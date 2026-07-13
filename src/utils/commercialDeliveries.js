/**
 * Commercial V3 - livraisons terrain, preuves et statuts.
 */

import { rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => Number(value || 0);

export const DELIVERY_STATUSES = {
  TO_PREPARE: 'a_preparer',
  IN_PROGRESS: 'en_cours',
  DELIVERED: 'livree',
  PARTIAL: 'partielle',
  LATE: 'en_retard',
  CANCELLED: 'annulee',
};

export const DELIVERY_STATUS_LABELS = {
  a_preparer: 'À préparer',
  en_cours: 'En cours',
  livree: 'Livrée',
  partielle: 'Partielle',
  en_retard: 'En retard',
  annulee: 'Annulée',
  prevue: 'Prévue',
  livre: 'Livrée',
  a_livrer: 'À livrer',
};

function statusOf(delivery = {}, order = {}) {
  return lower(
    delivery.delivery_status
    || delivery.statut_livraison
    || delivery.statut
    || delivery.status
    || order.statut_livraison
    || order.delivery_status
    || '',
  );
}

function plannedDate(delivery = {}) {
  return clean(delivery.date_prevue || delivery.date_livraison_prevue || delivery.date_livraison || delivery.date);
}

function actualDate(delivery = {}) {
  return clean(delivery.date_reelle || delivery.date_livraison_reelle || delivery.delivered_at);
}

export function resolveDeliveryStatus(delivery = {}, order = {}) {
  const raw = statusOf(delivery, order);
  if (['livree', 'livre', 'delivered', 'recupere'].includes(raw)) return DELIVERY_STATUSES.DELIVERED;
  if (['partielle', 'partial'].includes(raw)) return DELIVERY_STATUSES.PARTIAL;
  if (['annulee', 'cancelled'].includes(raw)) return DELIVERY_STATUSES.CANCELLED;
  if (['en_cours', 'en_route', 'in_progress'].includes(raw)) return DELIVERY_STATUSES.IN_PROGRESS;
  const planned = plannedDate(delivery);
  if (planned) {
    const d = new Date(planned);
    if (!Number.isNaN(d.getTime()) && d < new Date() && !actualDate(delivery)) {
      return DELIVERY_STATUSES.LATE;
    }
  }
  if (['a_livrer', 'prevue', 'en_preparation', 'a_preparer'].includes(raw)) return DELIVERY_STATUSES.TO_PREPARE;
  return DELIVERY_STATUSES.TO_PREPARE;
}

export function hasDeliveryProof(delivery = {}, documents = []) {
  if (delivery.proof_confirmed || delivery.client_confirmed || delivery.preuve_confirmee) return true;
  if (clean(delivery.proof_note || delivery.note_preuve || delivery.signature_text)) return true;
  if (clean(delivery.proof_document_id || delivery.document_preuve_id)) return true;
  const orderId = clean(delivery.order_id || delivery.sale_id);
  return arr(documents).some((doc) => {
    const cat = lower(doc.document_category || doc.type || doc.category);
    const entity = clean(doc.entity_id || doc.related_id || doc.order_id);
    return entity === orderId && (cat.includes('preuve') || cat.includes('livraison') || cat.includes('bl'));
  });
}

export function buildDeliveryTerrainRow(delivery = {}, { order = {}, client = null, documents = [] } = {}) {
  const status = resolveDeliveryStatus(delivery, order);
  const proof = hasDeliveryProof(delivery, documents);
  return {
    id: delivery.id,
    orderId: delivery.order_id || delivery.sale_id || order.id || '',
    clientId: delivery.client_id || order.client_id || client?.id || '',
    clientName: delivery.destinataire || order.client_label || client?.nom || client?.name || '',
    address: delivery.adresse_livraison || delivery.adresse || client?.adresse || '',
    contact: delivery.contact_livraison || delivery.contact || client?.tel || client?.whatsapp || '',
    driver: delivery.livreur || delivery.responsable_livraison || delivery.driver || '',
    fee: num(delivery.frais_livraison ?? delivery.delivery_fee),
    feeFree: Boolean(delivery.livraison_gratuite || num(delivery.frais_livraison) === 0),
    plannedDate: plannedDate(delivery),
    actualDate: actualDate(delivery),
    status,
    statusLabel: DELIVERY_STATUS_LABELS[status] || status,
    partial: status === DELIVERY_STATUSES.PARTIAL,
    late: status === DELIVERY_STATUSES.LATE,
    hasProof: proof,
    proofMissing: !proof && [DELIVERY_STATUSES.DELIVERED, DELIVERY_STATUSES.PARTIAL].includes(status),
    comment: delivery.commentaire_livraison || delivery.notes || delivery.comment || '',
    farmId: rowFarmId(delivery) || rowFarmId(order),
    delivery,
    order,
  };
}

export function buildCommercialDeliveryQueue({
  deliveries = [],
  orders = [],
  clients = [],
  documents = [],
} = {}) {
  const orderMap = new Map(arr(orders).map((o) => [String(o.id), o]));
  const clientMap = new Map(arr(clients).map((c) => [String(c.id), c]));
  const rows = arr(deliveries).map((delivery) => {
    const order = orderMap.get(String(delivery.order_id || delivery.sale_id)) || {};
    const client = clientMap.get(String(delivery.client_id || order.client_id));
    return buildDeliveryTerrainRow(delivery, { order, client, documents });
  });

  return {
    all: rows,
    toPrepare: rows.filter((r) => r.status === DELIVERY_STATUSES.TO_PREPARE),
    inProgress: rows.filter((r) => r.status === DELIVERY_STATUSES.IN_PROGRESS),
    delivered: rows.filter((r) => r.status === DELIVERY_STATUSES.DELIVERED),
    late: rows.filter((r) => r.status === DELIVERY_STATUSES.LATE),
    withoutProof: rows.filter((r) => r.proofMissing),
    partial: rows.filter((r) => r.partial),
  };
}

export function buildDeliveryProofPatch({
  note = '',
  signatureText = '',
  clientConfirmed = false,
  documentId = '',
} = {}) {
  return {
    proof_note: note,
    note_preuve: note,
    signature_text: signatureText,
    client_confirmed: clientConfirmed,
    preuve_confirmee: clientConfirmed,
    proof_confirmed: clientConfirmed,
    proof_document_id: documentId,
    document_preuve_id: documentId,
    proof_added_at: new Date().toISOString(),
  };
}

export function deliveryProofMessage(delivery = {}) {
  if (hasDeliveryProof(delivery)) return delivery.proof_note || delivery.note_preuve || 'Preuve enregistrée.';
  return 'Preuve de livraison non ajoutée.';
}
