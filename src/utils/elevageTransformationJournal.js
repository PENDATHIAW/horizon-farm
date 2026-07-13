import { toNumber } from './format';

const lower = (value) => String(value || '').trim().toLowerCase();
const arr = (value) => (Array.isArray(value) ? value : []);

const isElevageSaleOrder = (order = {}) => {
  const mod = lower(order.source_module || order.module_lie || '');
  const type = lower(order.source_type || order.type_vente || '');
  const kind = lower(order.sale_kind || '');
  return (
    mod.includes('animaux')
    || mod.includes('animal')
    || mod.includes('avicole')
    || type.includes('animal')
    || type.includes('lot')
    || kind.includes('animal')
    || kind.includes('chair')
    || kind.includes('oeuf')
    || kind.includes('œuf')
  );
};

const orderAmount = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.total_amount ?? order.chiffre_affaires);
const orderQty = (order = {}) => toNumber(order.quantity ?? order.quantite ?? 1);
const orderDate = (order = {}) => String(order.date || order.date_commande || order.created_at || '').slice(0, 10);

const animalLabel = (animal = {}) => animal.name || animal.nom || animal.tag || animal.id;
const lotLabel = (lot = {}) => lot.name || lot.nom || lot.id;

const KIND_LABELS = {
  vente: 'Vente',
  abattage: 'Abattage / transformation',
  mortalite: 'Mortalité',
  reforme: 'Réforme / clôture',
  perte: 'Perte / sortie',
  autre: 'Sortie métier',
};

/**
 * Journal unifié Élevage → Transformation : ventes, abattages, mortalités, réformes.
 */
export function buildElevageTransformationRows({
  animals = [],
  lots = [],
  salesOrders = [],
  businessEvents = [],
} = {}) {
  const rows = [];
  const saleEntityIds = new Set();

  arr(salesOrders).filter(isElevageSaleOrder).forEach((order) => {
    const entityId = order.source_id || order.related_id || order.product_id || '';
    if (entityId) saleEntityIds.add(String(entityId));
    const paid = toNumber(order.montant_paye ?? order.paid_amount);
    const total = orderAmount(order);
    rows.push({
      id: `tr-journal-sale-${order.id}`,
      kind: 'vente',
      kindLabel: KIND_LABELS.vente,
      date: orderDate(order),
      entityType: lower(order.source_type || '').includes('animal') ? 'animal' : lower(order.source_type || '').includes('lot') ? 'lot_avicole' : lower(order.source_module || 'vente'),
      entityId,
      label: order.product_name || order.produit || order.source_label || entityId,
      quantity: orderQty(order),
      unit: order.unit || order.unite || 'unité',
      amount: total,
      paymentStatus: order.statut_paiement || order.payment_status || (paid >= total && total > 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye'),
      detail: `Commande ${order.id}${order.client_id ? ` · client ${order.client_id}` : ''}`,
      orderId: order.id,
      tone: paid >= total && total > 0 ? 'good' : paid > 0 ? 'warn' : 'bad',
    });
  });

  arr(animals).forEach((animal) => {
    const status = lower(animal.status || animal.statut);
    const id = String(animal.id || '');
    if (status === 'vendu' && !saleEntityIds.has(id)) {
      rows.push({
        id: `tr-journal-animal-vendu-${id}`,
        kind: 'vente',
        kindLabel: KIND_LABELS.vente,
        date: String(animal.date_vente || animal.sold_at || '').slice(0, 10) || '',
        entityType: 'animal',
        entityId: id,
        label: animalLabel(animal),
        quantity: 1,
        unit: 'tête',
        amount: toNumber(animal.prix_vente_reel ?? animal.sale_price ?? animal.prix_vente),
        paymentStatus: animal.sale_order_id || animal.commande_id ? 'lie_commande' : 'fiche_seule',
        detail: 'Vente enregistrée sur fiche animal (sans commande liée visible)',
        tone: 'warn',
      });
    }
    if (status === 'abattu' || status === 'abattue') {
      rows.push({
        id: `tr-journal-animal-abattu-${id}`,
        kind: 'abattage',
        kindLabel: KIND_LABELS.abattage,
        date: String(animal.date_abattage || '').slice(0, 10) || '',
        entityType: 'animal',
        entityId: id,
        label: animalLabel(animal),
        quantity: toNumber(animal.poids_carcasse ?? animal.poids),
        unit: 'kg',
        amount: toNumber(animal.cout_abattage),
        paymentStatus: animal.produit_stock ? 'stock_viande' : '—',
        detail: animal.produit_stock ? `Stock : ${animal.produit_stock}` : 'Abattage animal',
        tone: 'good',
      });
    }
    if (status === 'reforme') {
      rows.push({
        id: `tr-journal-animal-reforme-${id}`,
        kind: 'reforme',
        kindLabel: KIND_LABELS.reforme,
        date: String(animal.date_reforme || '').slice(0, 10) || '',
        entityType: 'animal',
        entityId: id,
        label: animalLabel(animal),
        quantity: 1,
        unit: 'tête',
        amount: toNumber(animal.valeur_residuelle),
        paymentStatus: '—',
        detail: animal.motif_reforme || 'Réforme',
        tone: 'warn',
      });
    }
    if (['mort', 'vole', 'volé', 'perdu'].includes(status)) {
      rows.push({
        id: `tr-journal-animal-perte-${id}`,
        kind: 'perte',
        kindLabel: KIND_LABELS.perte,
        date: String(animal.date_deces || animal.date_vol_detecte || '').slice(0, 10) || '',
        entityType: 'animal',
        entityId: id,
        label: animalLabel(animal),
        quantity: 1,
        unit: 'tête',
        amount: toNumber(animal.valeur_perte_estimee),
        paymentStatus: '—',
        detail: status === 'mort' ? animal.cause_deces || 'Décès' : 'Vol / perte',
        tone: 'bad',
      });
    }
  });

  arr(lots).forEach((lot) => {
    const status = lower(lot.status || lot.statut);
    const id = String(lot.id || '');
    if ((status.includes('vendu') || status === 'termine' || status === 'terminé') && !saleEntityIds.has(id)) {
      const active = toNumber(lot.vendus) || toNumber(lot.initial_count);
      rows.push({
        id: `tr-journal-lot-vendu-${id}`,
        kind: 'vente',
        kindLabel: KIND_LABELS.vente,
        date: String(lot.date_fin_reelle || lot.date_fin_prevue || '').slice(0, 10) || '',
        entityType: 'lot_avicole',
        entityId: id,
        label: lotLabel(lot),
        quantity: active,
        unit: lower(lot.type).includes('pondeuse') ? 'sujet réforme' : 'sujet',
        amount: toNumber(lot.prix_vente_reel) * active || toNumber(lot.montant_vente_total_reel),
        paymentStatus: 'fiche_lot',
        detail: `Lot clôturé · ${status}`,
        tone: 'warn',
      });
    }
  });

  arr(businessEvents).forEach((evt) => {
    const mod = lower(evt.module_source || evt.module_lie || '');
    const type = lower(evt.event_type || evt.type_evenement || '');
    const text = lower(`${evt.title || ''} ${evt.description || ''}`);
    const isElevage = mod.includes('animaux') || mod.includes('avicole') || mod.includes('elevage') || mod.includes('élevage') || mod.includes('abattage');
    if (!isElevage && !text.includes('abattage') && !text.includes('mortalité') && !text.includes('mort ') && !text.includes('réforme')) return;

    let kind = 'autre';
    if (type.includes('abattage') || text.includes('abattage')) kind = 'abattage';
    else if (type.includes('mort') || text.includes('mortalité') || text.includes('décès')) kind = 'mortalite';
    else if (type.includes('reforme') || type.includes('réforme') || text.includes('réforme')) kind = 'reforme';
    else if (type.includes('vente') || text.includes('vendu') || text.includes('vente ')) kind = 'vente';

    if (kind === 'vente' && rows.some((r) => r.orderId && r.orderId === evt.linked_sale_id)) return;

    rows.push({
      id: `tr-journal-evt-${evt.id}`,
      kind,
      kindLabel: KIND_LABELS[kind] || KIND_LABELS.autre,
      date: String(evt.event_date || evt.date || '').slice(0, 10) || '',
      entityType: evt.entity_type || evt.target_type || mod,
      entityId: evt.entity_id || evt.source_id || evt.related_id || '',
      label: evt.title || 'Événement élevage',
      quantity: toNumber(evt.quantity) || null,
      unit: evt.unit || '',
      amount: toNumber(evt.amount ?? evt.montant),
      paymentStatus: evt.status || '—',
      detail: evt.description || evt.message || type,
      tone: kind === 'vente' ? 'good' : kind === 'mortalite' || kind === 'perte' ? 'bad' : 'warn',
    });
  });

  return rows
    .filter((row) => row.date || row.label)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/** Événement métier à créer après vente animal / lot avicole (module Transformation). */
export function buildElevageSaleTransformationEvent(sale = {}) {
  const type = lower(sale.source_type || sale.source_module || '');
  if (!type.includes('animal') && !type.includes('animaux') && !type.includes('avicole') && !type.includes('lot')) return null;
  const entityType = type.includes('animal') || type.includes('animaux') ? 'animal' : 'lot_avicole';
  const qty = toNumber(sale.quantity ?? sale.quantite ?? 1);
  const amount = toNumber(sale.montant_total ?? sale.total ?? sale.amount);
  const label = sale.product_name || sale.produit || sale.source_id;
  return {
    event_type: 'sortie_vente_elevage',
    type_evenement: 'sortie_vente_elevage',
    module_source: 'elevage',
    module_lie: 'elevage',
    entity_type: entityType,
    entity_id: sale.source_id || sale.related_id || '',
    source_id: sale.source_id || sale.related_id || '',
    related_id: sale.source_id || sale.related_id || '',
    linked_sale_id: sale.id || sale.order_id || '',
    title: `Vente ${entityType === 'animal' ? 'animal' : 'lot avicole'} : ${label}`,
    description: `${qty} ${sale.unit || sale.unite || 'unité'} · ${amount} FCFA · visible dans Élevage → Transformation`,
    amount,
    montant: amount,
    quantity: qty,
    unit: sale.unit || sale.unite,
    severity: 'info',
    status: 'confirme',
    event_date: String(sale.date || sale.date_commande || new Date().toISOString()).slice(0, 10),
    date: String(sale.date || sale.date_commande || new Date().toISOString()).slice(0, 10),
  };
}
