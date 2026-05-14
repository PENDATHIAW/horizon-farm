const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s.,/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const original = (value = '') => String(value || '').trim();

const includesAny = (text, words) => words.some((word) => text.includes(normalize(word)));

const toISODate = (input = '') => {
  const text = normalize(input);
  const months = {
    janvier: '01', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06',
    juillet: '07', aout: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12',
  };

  const numeric = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (numeric) {
    const [, d, m, y] = numeric;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const literal = text.match(/(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/);
  if (literal) {
    const [, d, m, y] = literal;
    return `${y}-${months[m]}-${String(d).padStart(2, '0')}`;
  }

  if (text.includes('aujourd hui') || text.includes('aujourdhui')) return new Date().toISOString().slice(0, 10);
  if (text.includes('hier')) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  return null;
};

const extractSupplierName = (raw = '') => {
  const text = original(raw);
  const patterns = [
    /chez\s+(?:le\s+fournisseur\s+)?([^.,;]+)/i,
    /fournisseur\s+([^.,;]+)/i,
    /aupres\s+de\s+([^.,;]+)/i,
    /auprès\s+de\s+([^.,;]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\b(le paiement|paiement|date|a la date|à la date|c est|c’est)\b.*$/i, '').trim();
  }
  return '';
};

const extractProductName = (raw = '') => {
  const text = normalize(raw);
  if (text.includes('aliment')) return text.includes('pondeuse') ? 'aliment pondeuse' : text.includes('chair') ? 'aliment chair' : 'aliment';
  if (text.includes('mais')) return 'maïs';
  if (text.includes('son')) return 'son';
  if (text.includes('oeuf') || text.includes('œuf')) return 'oeufs';
  return '';
};

const extractQuantity = (raw = '') => {
  const text = normalize(raw);
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(sacs?|sachets?|kg|kilogrammes?|tonnes?|unites?|unités?|tablettes?|plateaux?)/);
  if (!match) return { quantity: null, unit: '' };
  return {
    quantity: Number(match[1].replace(',', '.')),
    unit: match[2].replace(/s$/, ''),
  };
};

const extractUnitWeightKg = (raw = '') => {
  const text = normalize(raw);
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilogrammes?)\s*(?:chacun|par\s+sac|le\s+sac)?/);
  if (!match) return null;
  return Number(match[1].replace(',', '.'));
};

const extractPaymentStatus = (raw = '') => {
  const text = normalize(raw);
  if (includesAny(text, ['paiement effectif', 'paiement est effectif', 'deja paye', 'déjà payé', 'paye cash', 'payé cash', 'paye', 'payé', 'regle', 'réglé'])) return 'paid';
  if (includesAny(text, ['credit', 'crédit', 'a credit', 'à crédit', 'non paye', 'non payé', 'reste a payer', 'reste à payer'])) return 'credit';
  if (includesAny(text, ['moitie cash', 'moitié cash', 'partiel', 'avance'])) return 'partial';
  return 'unknown';
};

const extractPaymentAmount = (raw = '') => {
  const text = normalize(raw);
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:fcfa|francs?|f\s*cfa|xof)/);
  if (!match) return null;
  return Number(match[1].replace(',', '.'));
};

const detectIntent = (raw = '') => {
  const text = normalize(raw);
  if (includesAny(text, ['enregistre un achat', 'enregistrer un achat', 'achat de', 'j ai achete', 'j ai acheté', 'ajoute un achat', 'saisie achat'])) return 'purchase_stock';
  if (includesAny(text, ['enregistre une vente', 'vente de', 'j ai vendu', 'ajoute une vente'])) return 'sale';
  if (includesAny(text, ['ponte', 'oeufs produits', 'œufs produits', 'oeufs aujourd hui'])) return 'egg_production';
  if (includesAny(text, ['mortalite', 'mortalité', 'mort', 'morts'])) return 'mortality_event';
  return 'unknown';
};

const findExistingSupplier = (supplierName = '', dataMap = {}) => {
  const suppliers = Array.isArray(dataMap.fournisseurs) ? dataMap.fournisseurs : [];
  const needle = normalize(supplierName);
  if (!needle) return null;
  return suppliers.find((supplier) => normalize(`${supplier.name || ''} ${supplier.nom || ''} ${supplier.raison_sociale || ''}`).includes(needle) || needle.includes(normalize(supplier.name || supplier.nom || supplier.raison_sociale || ''))) || null;
};

const findExistingStockProduct = (productName = '', dataMap = {}) => {
  const stocks = Array.isArray(dataMap.stock) ? dataMap.stock : [];
  const needle = normalize(productName);
  if (!needle) return null;
  return stocks.find((stock) => normalize(`${stock.produit || ''} ${stock.nom || ''} ${stock.name || ''} ${stock.categorie || ''}`).includes(needle)) || null;
};

const buildSupplierDraft = (supplierName = '', dataMap = {}) => {
  const supplier = findExistingSupplier(supplierName, dataMap);
  if (supplier || !supplierName) return null;

  return {
    form_type: 'supplier_creation',
    primary_module: 'fournisseurs',
    status: 'awaiting_validation',
    title: 'Nouveau fournisseur à compléter',
    subtitle: `Le fournisseur ${supplierName} n’existe pas encore dans la base. Complète ou corrige avant validation.`,
    draft_fields: {
      name: supplierName,
      type: 'aliment',
      phone: '',
      address: '',
      contact_person: '',
      notes: 'Créé depuis Horizon Assistant',
    },
    missing_fields: ['phone', 'address'],
    proposed_actions: [
      { module: 'fournisseurs', action: 'create_supplier', label: 'Créer le fournisseur' },
    ],
  };
};

const computeMissingFields = (fields = {}) => {
  const missingFields = [];
  if (!fields.product_name) missingFields.push('product_name');
  if (!fields.quantity) missingFields.push('quantity');
  if (!fields.unit) missingFields.push('unit');
  if (!fields.supplier_name) missingFields.push('supplier_name');
  if (!fields.date) missingFields.push('date');
  if (!fields.payment_status || fields.payment_status === 'unknown') missingFields.push('payment_status');
  return missingFields;
};

const buildPurchaseResponse = ({ rawInput = '', fields = {}, dataMap = {}, history = [] }) => {
  const supplier = findExistingSupplier(fields.supplier_name, dataMap);
  const stockProduct = findExistingStockProduct(fields.product_name, dataMap);
  const totalWeightKg = fields.quantity && fields.unit_weight_kg ? fields.quantity * fields.unit_weight_kg : null;
  const mergedFields = {
    ...fields,
    product_id: stockProduct?.id || fields.product_id || null,
    supplier_id: supplier?.id || fields.supplier_id || null,
    total_weight_kg: totalWeightKg,
    notes: rawInput,
  };

  const missingFields = computeMissingFields(mergedFields);
  const warnings = [];
  if (!supplier && mergedFields.supplier_name) warnings.push(`Fournisseur non trouvé: ${mergedFields.supplier_name}. Horizon proposera le formulaire fournisseur avant validation finale.`);
  if (!stockProduct && mergedFields.product_name) warnings.push(`Produit stock non trouvé exactement: ${mergedFields.product_name}. Il pourra être créé ou rattaché avant validation.`);

  const next_required_form = !supplier && mergedFields.supplier_name ? buildSupplierDraft(mergedFields.supplier_name, dataMap) : null;
  const status = missingFields.length ? 'draft_incomplete' : next_required_form ? 'requires_related_form' : 'awaiting_validation';

  return {
    status,
    intent: 'purchase_stock',
    confidence: missingFields.length ? 0.7 : 0.9,
    raw_input: rawInput,
    history,
    primary_module: 'stock',
    form_type: 'stock_purchase',
    requires_validation: true,
    missing_fields: missingFields,
    warnings,
    draft_fields: mergedFields,
    next_required_form,
    impacted_modules: ['stock', 'finances', 'fournisseurs', 'tracabilite', 'centre_ia'],
    proposed_actions: [
      { module: 'stock', action: 'create_or_update_stock_entry', label: 'Entrée stock aliment' },
      { module: 'finances', action: mergedFields.payment_status === 'paid' ? 'create_paid_expense' : 'prepare_supplier_debt', label: mergedFields.payment_status === 'paid' ? 'Dépense payée' : 'Dette fournisseur / paiement à suivre' },
      { module: 'fournisseurs', action: supplier ? 'link_supplier_history' : 'prepare_supplier_creation', label: supplier ? 'Historique fournisseur' : 'Création/rattachement fournisseur' },
      { module: 'tracabilite', action: 'create_business_event', label: 'Journalisation traçabilité' },
      { module: 'centre_ia', action: 'refresh_ai_context', label: 'Mise à jour contexte IA' },
    ],
    ui: {
      title: missingFields.length ? 'Brouillon achat à compléter' : 'Achat stock à valider',
      subtitle: missingFields.length
        ? 'Horizon a préparé un brouillon. Complète les champs manquants par la voix ou à l’écrit.'
        : 'Horizon a préparé les champs. Vérifie, modifie si besoin, puis valide pour exécuter.',
      validation_label: 'Valider l’enregistrement',
      cancel_label: 'Annuler',
      edit_label: 'Modifier',
      missing_label: missingFields.length ? `Champs à renseigner: ${missingFields.join(', ')}` : '',
    },
  };
};

const extractPurchaseFields = (rawInput = '', dataMap = {}) => {
  const { quantity, unit } = extractQuantity(rawInput);
  const productName = extractProductName(rawInput);
  const supplierName = extractSupplierName(rawInput);
  const paymentStatus = extractPaymentStatus(rawInput);
  const date = toISODate(rawInput);
  const unitWeightKg = extractUnitWeightKg(rawInput);
  const paymentAmount = extractPaymentAmount(rawInput);

  return {
    product_name: productName,
    quantity,
    unit,
    unit_weight_kg: unitWeightKg,
    supplier_name: supplierName,
    payment_status: paymentStatus,
    date,
    payment_amount: paymentAmount,
  };
};

const mergeDefinedFields = (base = {}, patch = {}) => {
  const next = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value !== 'unknown') next[key] = value;
  });
  return next;
};

const buildPurchaseStockDraft = (rawInput = '', dataMap = {}) => {
  const fields = extractPurchaseFields(rawInput, dataMap);
  return buildPurchaseResponse({ rawInput, fields, dataMap, history: [{ role: 'user', content: rawInput }] });
};

export const updateHorizonDraft = (currentDraft = null, rawInput = '', dataMap = {}) => {
  if (!currentDraft || currentDraft.intent !== 'purchase_stock') return interpretHorizonCommand(rawInput, dataMap);

  const extractedFields = extractPurchaseFields(rawInput, dataMap);
  const mergedFields = mergeDefinedFields(currentDraft.draft_fields || {}, extractedFields);
  const history = [...(currentDraft.history || []), { role: 'user', content: rawInput }];

  return buildPurchaseResponse({ rawInput, fields: mergedFields, dataMap, history });
};

export const completeRelatedFormDraft = (currentDraft = null, relatedFormPatch = {}, dataMap = {}) => {
  if (!currentDraft?.next_required_form) return currentDraft;

  const nextForm = {
    ...currentDraft.next_required_form,
    draft_fields: mergeDefinedFields(currentDraft.next_required_form.draft_fields || {}, relatedFormPatch),
  };

  const missing = [];
  if (!nextForm.draft_fields.phone) missing.push('phone');
  if (!nextForm.draft_fields.address) missing.push('address');

  return {
    ...currentDraft,
    status: missing.length ? 'requires_related_form' : 'awaiting_validation',
    next_required_form: {
      ...nextForm,
      missing_fields: missing,
    },
  };
};

export const interpretHorizonCommand = (rawInput = '', dataMap = {}) => {
  const intent = detectIntent(rawInput);

  if (intent === 'purchase_stock') return buildPurchaseStockDraft(rawInput, dataMap);

  return {
    status: 'unsupported',
    intent,
    confidence: intent === 'unknown' ? 0.2 : 0.45,
    raw_input: rawInput,
    primary_module: null,
    form_type: null,
    requires_validation: true,
    missing_fields: [],
    warnings: intent === 'unknown'
      ? ['Commande non reconnue. Essaie par exemple: enregistre un achat de 20 sacs d aliment de 50 kg chez NMA Sanders, paiement effectif, date 19 mai 2026.']
      : ['Cette intention est reconnue mais le workflow de validation n’est pas encore activé.'],
    draft_fields: {},
    impacted_modules: [],
    proposed_actions: [],
  };
};

export default interpretHorizonCommand;
