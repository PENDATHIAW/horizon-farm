/**
 * Chantier 5 — Cultures : récolte → stock vendable → vente Commercial.
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { financeIds, documentIds } from './sideEffectIds.js';
import {
  applyStockMovement,
  stockQuantity,
  stockUnitPrice,
} from './stockWorkflows.js';
import {
  buildCultureHarvestWorkflow,
  cultureHarvestQty,
  cultureHarvestUnit,
  cultureLabel,
  cultureStockKey,
  cultureUnitPrice,
  findCultureStock,
} from './cultureWorkflows.js';
import { buildCultureHarvestFinanceRow } from './cultureSideEffects.js';
import {
  buildPaidFinanceRow,
  buildReceivableFinanceRow,
  runNewSaleSideEffects,
} from './saleSideEffects.js';
import { calculateCultureMetrics } from './businessCalculations.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const CULTURE_DOMAINS = {
  HARVEST: 'recolte',
  EXPENSE: 'depense',
  SALE: 'vente',
};

export const SALE_PAYMENT = {
  PAYE: 'paye',
  PARTIEL: 'partiel',
  CREDIT: 'non_paye',
};

export function buildCultureIssueKey(domain = '', recordId = '', suffix = '') {
  const d = clean(domain) || 'cultures';
  const id = clean(recordId) || 'record';
  const tail = clean(suffix);
  return tail ? `cultures:${d}:${id}:${tail}` : `cultures:${d}:${id}`;
}

export function normalizeCulturePaymentStatus(value = '') {
  const v = lower(value);
  if (['paye', 'paid', 'payé'].includes(v)) return SALE_PAYMENT.PAYE;
  if (['partiel', 'partial'].includes(v)) return SALE_PAYMENT.PARTIEL;
  return SALE_PAYMENT.CREDIT;
}

export function validateCultureHarvestForm(form = {}) {
  if (!clean(form.culture_id)) return 'Culture obligatoire.';
  const qty = num(form.quantite_recoltee ?? form.quantite);
  if (qty <= 0) return 'Quantité récoltée obligatoire.';
  if (form.destination === 'perte') return '';
  return '';
}

export function validateCultureExpenseForm(form = {}) {
  if (!clean(form.culture_id)) return 'Culture obligatoire.';
  const amount = num(form.montant ?? form.cout);
  if (amount <= 0) return 'Montant dépense obligatoire.';
  return '';
}

export function validateCultureSaleForm(form = {}) {
  if (!clean(form.client_id)) return 'Client obligatoire.';
  if (!clean(form.source_id)) return 'Produit stock (récolte) obligatoire.';
  const qty = num(form.quantity ?? form.quantite);
  if (qty <= 0) return 'Quantité obligatoire.';
  if (num(form.unit_price) <= 0 && lower(form.source_type) !== 'service') return 'Prix unitaire obligatoire.';
  return '';
}

function harvestFees(form = {}) {
  return num(form.frais_recolte) + num(form.frais_transport) + num(form.frais_conditionnement)
    + num(form.frais_main_oeuvre) + num(form.autres_frais);
}

function buildCulturePatchAfterHarvest(culture = {}, form = {}, qty = 0, unitCost = 0) {
  const price = num(form.prix_vente_unitaire ?? form.prix_vente_kg ?? culture.prix_vente_unitaire ?? cultureUnitPrice(culture));
  const revenue = qty * price;
  const extra = harvestFees(form);
  if (form.destination === 'perte') {
    return {
      pertes_recolte: num(culture.pertes_recolte) + qty,
      pertes: num(culture.pertes) + qty,
      date_derniere_recolte: form.date || today(),
      cout_recolte: num(culture.cout_recolte) + extra,
      statut: culture.statut || 'a_surveiller',
    };
  }
  return {
    quantite_recoltee: num(culture.quantite_recoltee) + qty,
    quantite_disponible: num(culture.quantite_disponible) + qty,
    production_reelle: num(culture.production_reelle) + qty,
    unite_recolte: form.unite || cultureHarvestUnit(culture),
    prix_vente_unitaire: price,
    prix_vente_kg: price,
    revenu_estime: num(culture.revenu_estime) || revenue,
    date_recolte_reelle: form.date || today(),
    date_derniere_recolte: form.date || today(),
    cout_recolte: num(culture.cout_recolte) + extra,
    cout_revient_unitaire_recolte: unitCost,
    statut: 'recolte',
    disponible_commercial: true,
        is_sellable: true,
        vendable: true,
    pret_a_la_vente: true,
    ready_for_sale: true,
    last_harvest_at: now(),
  };
}

function cultureProfitabilityPatch(culture = {}, { revenueDelta = 0, costDelta = 0 } = {}) {
  const merged = {
    ...culture,
    revenu_reel: num(culture.revenu_reel) + revenueDelta,
    cout_total_reel: num(culture.cout_total_reel) + costDelta,
  };
  const metrics = calculateCultureMetrics(merged);
  return {
    revenu_reel: merged.revenu_reel,
    cout_total_reel: merged.cout_total_reel,
    marge_reelle: metrics.marginReal ?? (merged.revenu_reel - merged.cout_total_reel),
    marge_estimee: metrics.marginEstimated,
  };
}

/**
 * Cultures → Récolte : journal, stock, mouvement, opportunité, finance potentiel, traçabilité.
 */
export async function commitCultureHarvest({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureHarvestForm(form);
  if (err) throw new Error(err);

  const cultureId = clean(form.culture_id);
  const culture = arr(context.cultures).find((row) => clean(row.id) === cultureId);
  if (!culture) throw new Error('Culture introuvable');

  const qty = num(form.quantite_recoltee ?? form.quantite);
  const unit = form.unite || cultureHarvestUnit(culture);
  const harvestId = clean(form.harvest_id) || makeId('RECOLTE');
  const issueKey = buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId);
  const date = form.date || today();
  const destination = lower(form.destination || 'stock');
  const extra = harvestFees(form);
  const metrics = calculateCultureMetrics(culture);
  const unitCost = qty > 0
    ? ((num(culture.cout_total_reel) || metrics.costTotal) + extra) / qty
    : 0;

  const harvestRecord = {
    id: harvestId,
    culture_id: cultureId,
    related_id: cultureId,
    target_id: cultureId,
    target_type: 'cultures',
    type_evenement: 'culture_harvest_record',
    event_type: 'culture_harvest_record',
    source_module: 'cultures',
    module_lie: 'cultures',
    title: `Récolte · ${cultureLabel(culture)}`,
    description: `${qty} ${unit}${extra > 0 ? ` · frais ${extra}` : ''}`,
    event_date: date,
    date,
    quantite: qty,
    unite: unit,
    montant: extra,
    issue_key: issueKey,
    side_effects_managed: true,
  };

  await handlers.onCreateHarvestRecord?.(harvestRecord);
  if (!handlers.onCreateHarvestRecord && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent(harvestRecord);
  }

  const before = { ...culture };
  const after = {
    ...culture,
    ...buildCulturePatchAfterHarvest(culture, form, qty, unitCost),
    derniere_recolte_id: harvestId,
  };

  await handlers.onUpdateCulture?.(cultureId, after);

  if (destination !== 'perte') {
    const workflow = buildCultureHarvestWorkflow({
      before,
      after,
      stocks: context.stocks,
      opportunities: context.opportunities,
      source: 'cultures_recolte',
      date,
    });

    if (workflow) {
      const stockRow = workflow.stockExistingId
        ? { ...workflow.stock, id: workflow.stockExistingId }
        : workflow.stock;

      const unitPrice = num(form.prix_vente_unitaire) || unitCost || cultureUnitPrice(after);
      const stockPayload = {
        ...stockRow,
        quantite: workflow.stockExistingId
          ? num(stockRow.quantite) + qty
          : qty,
        prix_unitaire: unitPrice,
        prixUnit: unitPrice,
        prixunit: unitPrice,
        cout_revient_unitaire: unitCost,
        disponible_commercial: true,
        is_sellable: true,
        vendable: true,
        commercial_ready: true,
        harvest_record_id: harvestId,
        issue_key: issueKey,
        linked_harvest_id: harvestId,
        culture_id: cultureId,
        source_module: 'cultures',
        source_record_id: cultureId,
        stock_key: cultureStockKey(after),
        side_effects_managed: true,
      };

      if (workflow.stockExistingId && handlers.onUpdateStock) {
        const existing = arr(context.stocks).find((s) => clean(s.id) === clean(workflow.stockExistingId));
        const movement = applyStockMovement(existing || stockPayload, {
          type: 'entree',
          qty,
          motif: `Récolte ${cultureLabel(culture)}`,
          date,
        });
        await handlers.onUpdateStock(workflow.stockExistingId, {
          ...movement.stock,
          ...stockPayload,
          quantite: stockQuantity(movement.stock),
        });
        if (handlers.onCreateBusinessEvent && movement.event) {
          await handlers.onCreateBusinessEvent({
            ...movement.event,
            event_type: 'entree_stock_recolte',
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'stock'),
            linked_harvest_id: harvestId,
            culture_id: cultureId,
          });
        }
      } else if (handlers.onCreateStock) {
        await handlers.onCreateStock(stockPayload);
        if (handlers.onCreateBusinessEvent) {
          await handlers.onCreateBusinessEvent({
            id: makeId('EVT'),
            event_type: 'entree_stock_recolte',
            module_source: 'cultures',
            entity_type: 'stock',
            entity_id: stockPayload.id,
            title: `Entrée stock récolte · ${cultureLabel(culture)}`,
            description: `${qty} ${unit}`,
            event_date: date,
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'stock'),
            linked_harvest_id: harvestId,
            quantity: qty,
            side_effects_managed: true,
          });
        }
      }

      if (workflow.opportunity) {
        if (workflow.opportunityExistingId && handlers.onUpdateOpportunity) {
          await handlers.onUpdateOpportunity(workflow.opportunityExistingId, {
            ...workflow.opportunity,
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'opp'),
          });
        } else if (handlers.onCreateOpportunity) {
          await handlers.onCreateOpportunity({
            ...workflow.opportunity,
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'opp'),
            side_effects_managed: true,
          });
        }
      }

      if (workflow.event && handlers.onCreateBusinessEvent) {
        await handlers.onCreateBusinessEvent({
          ...workflow.event,
          issue_key: issueKey,
          linked_harvest_id: harvestId,
        });
      }
    }

    const harvestRevenue = num(form.prix_vente_unitaire) * qty || cultureUnitPrice(after) * qty;
    if (harvestRevenue > 0 && handlers.onCreateFinanceTransaction) {
      const financeRow = buildCultureHarvestFinanceRow({ culture: after, amount: harvestRevenue, date });
      if (financeRow) {
        const exists = arr(context.transactions).some((t) => clean(t.id) === clean(financeRow.id));
        if (!exists) {
          await handlers.onCreateFinanceTransaction({ ...financeRow, issue_key: issueKey });
        }
      }
    }
  }

  return { ok: true, harvestId, issueKey, qty, unitCost };
}

/** Dépense culture liée + preuve document optionnelle. */
export async function commitCultureExpense({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureExpenseForm(form);
  if (err) throw new Error(err);

  const cultureId = clean(form.culture_id);
  const culture = arr(context.cultures).find((row) => clean(row.id) === cultureId);
  if (!culture) throw new Error('Culture introuvable');

  const amount = num(form.montant ?? form.cout);
  const expenseId = clean(form.id) || makeId('DEP-CULT');
  const issueKey = buildCultureIssueKey(CULTURE_DOMAINS.EXPENSE, expenseId);
  const date = form.date || today();
  const category = form.categorie || form.type_depense || 'Charge culture';

  await handlers.onCreateBusinessEvent?.({
    id: expenseId,
    event_type: 'depense_culture',
    module_source: 'cultures',
    entity_type: 'culture',
    entity_id: cultureId,
    title: `Dépense · ${cultureLabel(culture)}`,
    description: `${category} · ${amount} FCFA`,
    event_date: date,
    montant: amount,
    amount,
    issue_key: issueKey,
    side_effects_managed: true,
  });

  const financeRow = {
    id: financeIds.cultureExpense(cultureId, expenseId),
    type: 'sortie',
    libelle: `${category} · ${cultureLabel(culture)}`,
    montant: amount,
    amount,
    date,
    categorie: 'Cultures',
    activite: 'cultures',
    module_lie: 'cultures',
    source_module: 'cultures',
    source_record_id: cultureId,
    related_id: cultureId,
    issue_key: issueKey,
    side_effects_managed: true,
  };
  const exists = arr(context.transactions).some((t) => clean(t.id) === financeRow.id);
  if (!exists && handlers.onCreateFinanceTransaction) {
    await handlers.onCreateFinanceTransaction(financeRow);
  }

  if ((form.document_url || form.preuve_url) && handlers.onCreateDocument) {
    await handlers.onCreateDocument({
      id: documentIds.cultureExpense(cultureId, expenseId),
      title: `Preuve ${category}`,
      document_category: 'facture',
      module_source: 'cultures',
      entity_id: cultureId,
      file_url: form.document_url || form.preuve_url,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  const costField = {
    cout_semences: 'cout_semences',
    cout_engrais: 'cout_engrais',
    cout_eau: 'cout_eau',
    cout_main_oeuvre: 'cout_main_oeuvre',
    cout_traitement: 'cout_traitement',
    semences: 'cout_semences',
    engrais: 'cout_engrais',
    eau: 'cout_eau',
    main_oeuvre: 'cout_main_oeuvre',
    traitement: 'cout_traitement',
  }[lower(category)] || null;
  const culturePatch = costField
    ? { [costField]: num(culture[costField]) + amount }
  : { autres_frais: num(culture.autres_frais) + amount };

  await handlers.onUpdateCulture?.(cultureId, {
    ...culturePatch,
    ...cultureProfitabilityPatch({ ...culture, ...culturePatch }, { costDelta: amount }),
    issue_key: issueKey,
  });

  return { ok: true, expenseId, issueKey, amount };
}

export function computeCultureSaleAmounts(form = {}) {
  const qty = num(form.quantity ?? form.quantite);
  const unitPrice = num(form.unit_price ?? form.prix_unitaire);
  const productTotal = qty * unitPrice;
  const deliveryFee = ['livraison', 'a_livrer'].includes(lower(form.fulfillment_mode))
    ? num(form.delivery_fee)
    : 0;
  const grandTotal = productTotal + deliveryFee;
  const status = normalizeCulturePaymentStatus(form.payment_status);
  let paid = 0;
  if (status === SALE_PAYMENT.PAYE) paid = grandTotal;
  else if (status === SALE_PAYMENT.PARTIEL) paid = Math.min(grandTotal, num(form.paid_amount));
  return { qty, unitPrice, productTotal, deliveryFee, grandTotal, paid, remaining: Math.max(0, grandTotal - paid), paymentStatus: status };
}

/** Commercial → Ventes : vente stock récolte culture. */
export function buildCultureStockSaleRecords({ form = {}, orderId = '', clientLabel = '' } = {}) {
  const { qty, unitPrice, productTotal, deliveryFee, grandTotal, paid, remaining, paymentStatus } = computeCultureSaleAmounts(form);
  const issueKey = buildCultureIssueKey(CULTURE_DOMAINS.SALE, orderId || 'new');
  const paymentId = paid > 0 ? makeId('PAI') : null;
  const invoiceId = form.invoice_issued !== false ? makeId('FAC') : null;

  const order = {
    id: orderId || makeId('CMD'),
    client_id: form.client_id,
    client_nom: clientLabel,
    date: form.date || today(),
    source_type: 'stock',
    source_id: form.source_id,
    source_module: 'stock',
    product_name: form.product_name,
    quantity: qty,
    quantite: qty,
    unit: form.unit || 'kg',
    unit_price: unitPrice,
    prix_unitaire: unitPrice,
    montant_total: grandTotal,
    montant_ht: productTotal,
    frais_livraison: deliveryFee,
    montant_paye: paid,
    reste_a_payer: remaining,
    statut_paiement: paymentStatus,
    statut_commande: remaining > 0 ? 'confirme' : 'livre',
    fulfillment_mode: form.fulfillment_mode || 'recupere',
    culture_id: form.culture_id || '',
    harvest_record_id: form.harvest_record_id || '',
    issue_key: issueKey,
    side_effects_managed: true,
  };

  return {
    order,
    payment: paid > 0 ? {
      id: paymentId,
      order_id: order.id,
      client_id: form.client_id,
      montant: paid,
      amount: paid,
      date_paiement: form.date || today(),
      moyen_paiement: form.payment_method || 'especes',
      issue_key: buildCultureIssueKey(CULTURE_DOMAINS.SALE, order.id, 'paiement'),
    } : null,
    invoice: invoiceId ? {
      id: invoiceId,
      order_id: order.id,
      client_id: form.client_id,
      montant_total: grandTotal,
      statut: paymentStatus === SALE_PAYMENT.PAYE ? 'payee' : 'emise',
      issue_key: buildCultureIssueKey(CULTURE_DOMAINS.SALE, order.id, 'facture'),
    } : null,
    issueKey,
    paid,
    remaining,
    grandTotal,
  };
}

export async function commitCultureStockSale({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureSaleForm(form);
  if (err) throw new Error(err);

  const stock = arr(context.stocks).find((s) => clean(s.id) === clean(form.source_id));
  if (!stock) throw new Error('Stock récolte introuvable');
  const { qty, grandTotal, paid, remaining } = computeCultureSaleAmounts(form);
  if (qty > stockQuantity(stock)) {
    throw new Error(`Stock insuffisant : ${stockQuantity(stock)} ${stock.unite || ''}`);
  }

  const client = arr(context.clients).find((c) => clean(c.id) === clean(form.client_id));
  const clientLabel = client?.nom || client?.name || form.client_id;
  const records = buildCultureStockSaleRecords({ form, clientLabel });
  const orderId = records.order.id;

  await handlers.onCreateOrder?.(records.order);
  if (records.payment && handlers.onCreatePayment) await handlers.onCreatePayment(records.payment);
  if (records.invoice && handlers.onCreateInvoice) await handlers.onCreateInvoice(records.invoice);

  await runNewSaleSideEffects({
    order: records.order,
    orderId,
    form: { ...form, source_type: 'stock', quantity: qty },
    paid,
    remaining,
    paymentId: records.payment?.id || '',
    invoiceId: records.invoice?.id || '',
    productName: form.product_name || stock.produit,
    clientLabel,
    realClientId: form.client_id,
    stocks: context.stocks,
    cultures: context.cultures,
    clients: context.clients,
    salesOrders: context.salesOrders,
    payments: context.payments,
    transactions: context.transactions,
    tasks: context.tasks,
    alertes: context.alertes,
    handlers,
  });

  const cultureId = clean(form.culture_id || stock.culture_id || stock.source_record_id);
  if (cultureId && handlers.onUpdateCulture) {
    const culture = arr(context.cultures).find((c) => clean(c.id) === cultureId);
    if (culture) {
      await handlers.onUpdateCulture(cultureId, {
        quantite_vendue: num(culture.quantite_vendue) + qty,
        ...cultureProfitabilityPatch(culture, { revenueDelta: grandTotal }),
        derniere_vente_id: orderId,
      });
    }
  }

  await handlers.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: 'vente_culture',
    module_source: 'commercial',
    entity_type: 'culture',
    entity_id: cultureId || stock.id,
    title: `Vente récolte · ${form.product_name || stock.produit}`,
    description: `${qty} ${form.unit || stock.unite || 'kg'} · ${grandTotal} FCFA`,
    event_date: form.date || today(),
    linked_order_id: orderId,
    issue_key: records.issueKey,
    side_effects_managed: true,
  });

  return { ok: true, orderId, issueKey: records.issueKey, paid, remaining };
}

/** Scénario intégré récolte → vente payée / crédit → marge. */
export async function runCultureScenario(handlersFactory) {
  const state = {
    cultures: [],
    stocks: [],
    opportunities: [],
    transactions: [],
    events: [],
    orders: [],
    payments: [],
    invoices: [],
    documents: [],
    clients: [{ id: 'CLI-1', nom: 'Marché Thiès' }],
  };

  const handlers = {
    onCreateCulture: async (row) => { state.cultures.push(row); },
    onUpdateCulture: async (id, patch) => {
      const i = state.cultures.findIndex((c) => c.id === id);
      if (i >= 0) state.cultures[i] = { ...state.cultures[i], ...patch };
    },
    onCreateHarvestRecord: async (row) => { state.events.push(row); },
    onCreateStock: async (row) => { state.stocks.push(row); },
    onUpdateStock: async (id, patch) => {
      const i = state.stocks.findIndex((s) => s.id === id);
      if (i >= 0) state.stocks[i] = { ...state.stocks[i], ...patch };
    },
    onCreateOpportunity: async (row) => { state.opportunities.push(row); },
    onCreateFinanceTransaction: async (row) => { state.transactions.push(row); },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
    onCreateDocument: async (row) => { state.documents.push(row); },
    onCreateOrder: async (row) => { state.orders.push(row); },
    onCreatePayment: async (row) => { state.payments.push(row); },
    onCreateInvoice: async (row) => { state.invoices.push(row); },
    onUpdateOpportunity: async (id, patch) => {
      const i = state.opportunities.findIndex((o) => o.id === id);
      if (i >= 0) state.opportunities[i] = { ...state.opportunities[i], ...patch };
    },
    ...handlersFactory?.(state),
  };

  const cultureId = 'CULT-1';
  await handlers.onCreateCulture({
    id: cultureId,
    nom: 'Tomates parcelle A',
    record_type: 'culture',
    surface: 1000,
    cout_semences: 50000,
    cout_engrais: 80000,
    budget_prevu: 200000,
    statut: 'floraison',
  });

  const ctx = () => ({
    cultures: state.cultures,
    stocks: state.stocks,
    opportunities: state.opportunities,
    transactions: state.transactions,
    clients: state.clients,
    salesOrders: state.orders,
    payments: state.payments,
    alertes: [],
    tasks: [],
  });

  await commitCultureHarvest({
    form: {
      culture_id: cultureId,
      quantite_recoltee: 500,
      unite: 'kg',
      prix_vente_unitaire: 400,
      date: '2026-06-01',
      destination: 'stock',
    },
    context: ctx(),
    handlers,
  });

  const stockId = state.stocks[0]?.id;
  await commitCultureExpense({
    form: {
      culture_id: cultureId,
      montant: 15000,
      categorie: 'cout_traitement',
      date: '2026-06-02',
      preuve_url: 'https://example.com/facture-traitement.pdf',
    },
    context: ctx(),
    handlers,
  });

  await commitCultureStockSale({
    form: {
      client_id: 'CLI-1',
      source_id: stockId,
      culture_id: cultureId,
      product_name: state.stocks[0]?.produit,
      quantity: 200,
      unit: 'kg',
      unit_price: 450,
      payment_status: 'paye',
      date: '2026-06-05',
    },
    context: ctx(),
    handlers: {
      ...handlers,
      onUpdateStock: handlers.onUpdateStock,
      onCreateFinanceTransaction: handlers.onCreateFinanceTransaction,
      onCreateAlert: async () => {},
      onCreateTask: async () => {},
      onCreateTrace: async () => {},
      onUpdateClient: async () => {},
    },
  });

  await commitCultureStockSale({
    form: {
      client_id: 'CLI-1',
      source_id: stockId,
      culture_id: cultureId,
      product_name: state.stocks[0]?.produit,
      quantity: 100,
      unit: 'kg',
      unit_price: 400,
      payment_status: 'non_paye',
      date: '2026-06-08',
    },
    context: ctx(),
    handlers: {
      ...handlers,
      onCreateOrder: async (row) => { state.orders.push({ ...row, id: makeId('CMD') }); },
      onCreateFinanceTransaction: handlers.onCreateFinanceTransaction,
      onCreateAlert: async (row) => { state.events.push(row); },
      onCreateTask: async () => {},
      onCreateTrace: async () => {},
      onUpdateClient: async () => {},
    },
  });

  const culture = state.cultures.find((c) => c.id === cultureId);
  const stock = state.stocks.find((s) => s.id === stockId);
  return { state, culture, stock };
}
