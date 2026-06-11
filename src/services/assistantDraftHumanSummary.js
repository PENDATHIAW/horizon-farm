/**
 * Confirmations humaines — langage agriculteur, jamais jargon ERP.
 */

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const fmtMoney = (v) => `${n(v).toLocaleString('fr-FR')} FCFA`;

function productLine(fields = {}) {
  const name = fields.product_name || fields.culture_name;
  const qty = fields.quantity;
  const unit = fields.unit || '';
  if (name && qty) return `${qty} ${unit} ${name}`.trim();
  if (name) return name;
  if (qty) return `${qty} ${unit}`.trim();
  return null;
}

function stockConsequences() {
  return ['Stock diminué'];
}

function saleConsequences(fields = {}) {
  const lines = [...stockConsequences(), 'Facture créée'];
  const status = String(fields.payment_status || '').toLowerCase();
  if (status === 'paid') lines.push('Paiement enregistré');
  else lines.push('Créance créée');
  return lines;
}

export function buildHumanDraftConfirmation(draft = {}) {
  const fields = draft.draft_fields || {};
  const intent = draft.intent || '';
  const formType = draft.form_type || '';
  const recordLines = [];
  const consequenceLines = [];

  if (intent === 'sale_record' || formType === 'sale_record') {
    const product = productLine(fields);
    if (product) recordLines.push(`Vente : ${product}`);
    if (fields.client_name) recordLines.push(`Client : ${fields.client_name}`);
    if (fields.payment_amount) recordLines.push(`Montant : ${fmtMoney(fields.payment_amount)}`);
    consequenceLines.push(...saleConsequences(fields));
  } else if (intent === 'purchase_stock' || formType === 'stock_purchase') {
    const product = productLine(fields);
    if (product) recordLines.push(`Achat : ${product}`);
    if (fields.supplier_name) recordLines.push(`Fournisseur : ${fields.supplier_name}`);
    if (fields.payment_amount) recordLines.push(`Montant : ${fmtMoney(fields.payment_amount)}`);
    consequenceLines.push('Stock augmenté', 'Dépense enregistrée');
  } else if (intent === 'culture_harvest' || formType === 'culture_harvest') {
    const product = productLine(fields);
    if (product) recordLines.push(`Récolte : ${product}`);
    consequenceLines.push('Stock augmenté', 'Production enregistrée');
  } else if (intent === 'finance_entry' || formType === 'finance_entry') {
    const isIncome = fields.transaction_type === 'entree';
    if (fields.amount) recordLines.push(`${isIncome ? 'Encaissement' : 'Dépense'} : ${fmtMoney(fields.amount)}`);
    if (fields.label) recordLines.push(`Motif : ${fields.label}`);
    consequenceLines.push(isIncome ? 'Trésorerie augmentée' : 'Trésorerie diminuée');
  } else if (intent === 'health_action' || formType === 'health_action') {
    const target = fields.target_id || fields.animal_id || fields.target_id;
    recordLines.push(`Soin : ${fields.action_type || fields.soin_type || 'intervention'}`);
    if (target) recordLines.push(`Lot / animal : ${target}`);
    consequenceLines.push('Fiche santé mise à jour', 'Stock consommé si produit utilisé');
  } else if (intent === 'egg_production' || formType === 'egg_production') {
    const eggs = fields.eggs_count || fields.quantity;
    if (eggs) recordLines.push(`Ramassage : ${eggs} œufs`);
    consequenceLines.push('Production enregistrée', 'Stock œufs mis à jour');
  } else if (intent === 'mortality_event' || formType === 'poultry_mortality') {
    if (fields.quantity) recordLines.push(`Mortalité : ${fields.quantity} sujets`);
    if (fields.lot_id) recordLines.push(`Lot : ${fields.lot_id}`);
    consequenceLines.push('Effectif diminué', 'Événement tracé');
  } else if (intent === 'task_creation' || formType === 'task_creation') {
    if (fields.title) recordLines.push(`Tâche : ${fields.title}`);
    consequenceLines.push('Rappel ajouté au carnet');
  } else {
    const action = draft.ui?.title || draft.intent_label || intent || 'Action terrain';
    recordLines.push(action.replace(/à valider|à ouvrir/gi, '').trim());
    const details = productLine(fields);
    if (details) recordLines.push(details);
    if (fields.client_name || fields.supplier_name) {
      recordLines.push(`Tiers : ${fields.client_name || fields.supplier_name}`);
    }
    if (fields.payment_amount) recordLines.push(`Montant : ${fmtMoney(fields.payment_amount)}`);
    const modules = arr(draft.impacted_modules);
    if (modules.some((m) => /stock|avicole|cultures/.test(m))) consequenceLines.push('Stock mis à jour');
    if (modules.some((m) => /ventes|commercial|clients/.test(m))) consequenceLines.push('Vente ou client mis à jour');
    if (modules.some((m) => /finances|finance/.test(m))) consequenceLines.push('Trésorerie impactée');
    if (!consequenceLines.length) consequenceLines.push('Enregistrement dans le carnet de la ferme');
  }

  if (!recordLines.length) recordLines.push('Action terrain détectée');
  if (!consequenceLines.length) consequenceLines.push('Mise à jour de la ferme');

  return {
    recordLines: [...new Set(recordLines.filter(Boolean))],
    consequenceLines: [...new Set(consequenceLines.filter(Boolean))],
  };
}
