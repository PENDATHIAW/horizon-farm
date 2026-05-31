const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const WALK_IN = 'client_passage';

function resolveSourceType(sourceId, productName, props) {
  if (sourceId) {
    if (arr(props.lots).some((row) => String(row.id) === String(sourceId))) return 'lot_avicole';
    if (arr(props.animaux).some((row) => String(row.id) === String(sourceId))) return 'animal';
    if (arr(props.stocks).some((row) => String(row.id) === String(sourceId))) return 'stock';
    if (arr(props.cultures).some((row) => String(row.id) === String(sourceId))) return 'culture';
  }
  const product = String(productName || '').toLowerCase();
  if (product.includes('oeuf') || product.includes('poulet') || product.includes('tablette') || product.includes('chair')) return 'lot_avicole';
  if (product.includes('bovin') || product.includes('ovin') || product.includes('mouton') || product.includes('animal')) return 'animal';
  return 'autre';
}

function resolveClientId(fields, clients) {
  if (fields.client_id) return fields.client_id;
  const name = String(fields.client_name || fields.client_nom || '').trim().toLowerCase();
  if (!name || name.includes('passage')) return WALK_IN;
  const match = arr(clients).find((client) => {
    const label = String(client.nom || client.name || '').trim().toLowerCase();
    return label && (label === name || label.includes(name) || name.includes(label));
  });
  return match?.id || WALK_IN;
}

/** Préremplit le wizard vente depuis Hey Horizon, opportunité ou Résumé commercial. */
export function buildSaleFormFromDraft(draft = {}, props = {}) {
  const fields = draft.draft_fields || draft || {};
  const sourceId = String(fields.source_id || '').trim();
  const productName = fields.product_name || fields.title || fields.libelle || '';
  const sourceType = fields.source_type || resolveSourceType(sourceId, productName, props);
  const quantity = Math.max(1, num(fields.quantity || fields.qty || 1));
  const estimated = num(fields.estimated_value || fields.montant_estime || fields.payment_amount || 0);
  const unitPrice = num(fields.unit_price || fields.prix_unitaire || (estimated > 0 && quantity > 0 ? estimated / quantity : 0));

  return {
    date: fields.date || today(),
    client_id: resolveClientId(fields, props.clients),
    source_type: sourceType,
    source_id: sourceId,
    product_name: productName,
    quantity,
    unit: fields.unit || fields.unite || (sourceType === 'culture' ? 'kg' : sourceType === 'animal' ? 'tête' : 'unité'),
    unit_price: unitPrice,
    payment_status: fields.payment_status === 'credit' ? 'non_paye' : fields.payment_status === 'partial' ? 'partiel' : 'paye',
    paid_amount: fields.paid_amount || '',
    payment_method: fields.payment_method || 'especes',
    fulfillment_mode: fields.fulfillment_mode || 'recupere',
    delivery_fee: num(fields.delivery_fee || fields.frais_livraison || 0),
    invoice_issued: fields.invoice_issued !== false,
    notes: draft.raw_input || fields.notes || fields.reason || '',
    opportunity_id: fields.opportunity_id || draft.opportunity_id || '',
  };
}

export function buildSaleFormFromOpportunity(opportunity = {}, props = {}, client = null) {
  const qty = Math.max(1, num(opportunity.quantity || 1));
  const total = num(opportunity.estimated_value || opportunity.montant_estime || 0);
  return buildSaleFormFromDraft({
    opportunity_id: opportunity.id,
    draft_fields: {
      opportunity_id: opportunity.id,
      source_id: opportunity.source_id || '',
      source_type: opportunity.source_type || '',
      product_name: opportunity.title || opportunity.libelle || opportunity.product_name || 'Opportunité',
      quantity: qty,
      unit: opportunity.unit || 'unité',
      unit_price: total > 0 ? Math.round(total / qty) : 0,
      client_id: client?.id || opportunity.client_id || '',
      client_name: client?.nom || client?.name || opportunity.client_nom || opportunity.customer_name || '',
      date: today(),
      notes: opportunity.reason || opportunity.notes || '',
    },
    raw_input: opportunity.reason || opportunity.notes || '',
  }, props);
}
